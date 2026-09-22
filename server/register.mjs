import { isIP } from 'node:net';
import { createHmac, randomBytes } from 'node:crypto';
import { validateField, registrationFields } from '../src/utils/validation.js';
// Production handoff: replace this fixed organizer address; see HANDOFF.md.
// EMAIL_TEST_MODE must be disabled in production. Never accept recipients from the client.
const recipient = 'mmetrindesign@gmail.com';
const subject = 'Новая регистрация на конференцию';
const limits = { name: 160, email: 254, phone: 40, company: 200, role: 200 };
export function createRegistrationHandler({ env = process.env, fetchEmail = fetch, now = Date.now } = {}) {
  const buckets = new Map(), salt = randomBytes(32);
  return async (req, res) => {
    const reply = (code) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(code === 405 ? { Allow: 'POST' } : {}), ...(code === 429 ? { 'Retry-After': '600' } : {}) }); res.end(JSON.stringify({ ok: code === 200 })); };
    if (req.method !== 'POST') return reply(405);
    if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type'] || '')) return reply(400);
    if (!env.APP_ORIGIN || req.headers.origin !== env.APP_ORIGIN) return reply(400);
    const remote = req.socket.remoteAddress;
    const proxyIP = req.headers['x-real-ip'];
    const address = env.TRUST_LOCAL_PROXY === 'true' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) && typeof proxyIP === 'string' && isIP(proxyIP) ? proxyIP : remote || 'unknown';
    const ip = createHmac('sha256', salt).update(address).digest('hex');
    const time = now();
    for (const [key, entry] of buckets) if (entry.until <= time) buckets.delete(key);
    const bucket = buckets.get(ip) || { count: 0, until: time + 600000 };
    if (bucket.count >= 5 || buckets.size >= 10000 && !buckets.has(ip)) return reply(429);
    bucket.count++; buckets.set(ip, bucket);
    try {
      if (Number(req.headers['content-length']) > 8192) return reply(400);
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 8192) return reply(400); chunks.push(chunk); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400); }
      if (!body || Array.isArray(body) || typeof body !== 'object') return reply(400);
      const allowed = [...Object.keys(limits), 'website'];
      if (Object.keys(body).some(key => !allowed.includes(key))) return reply(400);
      if (typeof body.website !== 'string' || body.website !== '') return reply(400);
      const fields = {};
      for (const [key, max] of Object.entries(limits)) {
        if (typeof body[key] !== 'string' || body[key].length > max || /[\x00-\x1f\x7f]/.test(body[key])) return reply(400);
        fields[key] = body[key].normalize('NFC').trim().replace(/\s+/g, ' ');
        if (validateField(key, fields[key])) return reply(400);
      }
      const testMode = env.EMAIL_TEST_MODE === 'true';
      const deliveryRecipient = testMode ? env.EMAIL_TEST_RECIPIENT : recipient;
      if (!env.EMAIL_API_KEY || !env.EMAIL_FROM || !deliveryRecipient || /[\r\n]/.test(env.EMAIL_FROM) || /[\r\n]/.test(deliveryRecipient)) return reply(500);
      // Text-only email: user input is never HTML or an email header.
      const text = subject + '\n\n' + registrationFields.map(field => `${field.label.replace(/\*$/, '')}: ${fields[field.name]}`).join('\n');
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) return reply(400);
      const result = await fetchEmail('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `register-${key}` },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [deliveryRecipient], subject, text }),
      });
      if (!result.ok) return reply(500);
      return reply(200);
    } catch { return reply(500); }
  };
}
