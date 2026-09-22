import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone } from '../src/utils/phone.js';
test('phone mask formats typed, pasted and incomplete numbers', () => {
  for (const value of ['9994502636', '+79994502636', '89994502636', '+7 (999) 450-26-36'])
    assert.equal(formatPhone(value), '+7 999 450-26-36');
  assert.equal(formatPhone('+7 9994'), '+7 999 4');
  assert.equal(formatPhone('+7 9994502'), '+7 999 450-2');
  assert.equal(formatPhone('+7 '), '+7 ');
  assert.equal(formatPhone('+7 999 450-26-36999'), '+7 999 450-26-36');
});
