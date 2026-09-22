import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRegistrationHandler } from '../server/register.mjs';
const data = {name:'Тест Тестов',email:'test@example.ru',phone:'+7 913 123-45-67',company:'Example',role:'Test',website:''};
async function fixture(t, options = {}) {
 const messages=[];
 const handler=createRegistrationHandler({env:{APP_ORIGIN:'https://example.test',EMAIL_API_KEY:'test-only',EMAIL_FROM:'events@example.test'},fetchEmail:async (url, request)=>{messages.push(JSON.parse(request.body));return {ok:true};},...options});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 return {messages, request:async (body=data, extra={})=>fetch(`http://127.0.0.1:${server.address().port}/api/register`,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','Idempotency-Key':'test-request-12345678',...extra.headers},body:JSON.stringify(body),...extra})};
}
test('valid registration sends only fixed recipient and subject, all fields',async t=>{const f=await fixture(t);assert.equal((await f.request()).status,200);assert.deepEqual(f.messages[0].to,['mmetrindesign@gmail.com']);assert.equal(f.messages[0].subject,'Новая регистрация на конференцию');for(const field of ['name','email','phone','company','role'])assert(f.messages[0].text.includes(data[field]));});
test('test mode uses recipient from environment',async t=>{const f=await fixture(t,{env:{APP_ORIGIN:'https://example.test',EMAIL_API_KEY:'test-only',EMAIL_FROM:'events@example.test',EMAIL_TEST_MODE:'true',EMAIL_TEST_RECIPIENT:'qa-recipient@example.test'}});assert.equal((await f.request()).status,200);assert.deepEqual(f.messages[0].to,['qa-recipient@example.test']);});
test('rejects unknown keys, honeypot, injection, invalid email and empty fields',async t=>{for(const patch of [{to:'other@example.ru'},{website:'bot'},{name:'x\r\nBcc: x@y.ru'},{email:'akk@vm'},{company:''}]){const f=await fixture(t);assert.equal((await f.request({...data,...patch})).status,400);assert.equal(f.messages.length,0);}});
test('rate limit cannot be bypassed with spoofed forwarding header',async t=>{const f=await fixture(t);for(let i=0;i<5;i++)await f.request();assert.equal((await f.request()).status,429);});
test('provider failures are generic',async t=>{const f=await fixture(t,{fetchEmail:async()=>{throw Error('secret provider error')}});const r=await f.request();assert.equal(r.status,500);assert.equal(await r.text(),'{"ok":false}');});
test('rejects method, content type, malformed JSON, origin and oversized body',async t=>{for(const extra of [{method:'GET',body:undefined},{headers:{'Content-Type':'text/plain'}},{body:'{'},{headers:{Origin:'https://evil.test','Content-Type':'application/json'}},{body:'x'.repeat(9000)}]){const f=await fixture(t);const r=await f.request(data,extra);assert.equal(r.status,extra.method==='GET'?405:400);assert.equal(f.messages.length,0);}});
