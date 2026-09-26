import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema } from '../src/lib/auth/schema.ts';

test('normalizes email but preserves password whitespace', () => {
  const value = loginSchema.parse({ email: ' user@example.test ', password: ' pass ' });
  assert.equal(value.email, 'user@example.test');
  assert.equal(value.password, ' pass ');
});
test('rejects missing, malformed and oversized credentials', () => {
  for (const value of [ {}, {email:'invalid',password:'secret'}, {email:'a@example.test',password:''}, {email:'a@example.test',password:'x'.repeat(1025)}, {email:['a@example.test'],password:'secret'} ]) {
    assert.equal(loginSchema.safeParse(value).success, false);
  }
});
