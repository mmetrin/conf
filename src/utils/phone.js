export function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (value.trimStart().startsWith('+7') || (digits.length > 10 && /^[78]/.test(digits))) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return '+7 ';
  return '+7 ' + digits.slice(0, 3) +
    (digits.length > 3 ? ' ' + digits.slice(3, 6) : '') +
    (digits.length > 6 ? '-' + digits.slice(6, 8) : '') +
    (digits.length > 8 ? '-' + digits.slice(8, 10) : '');
}
