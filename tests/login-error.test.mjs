import test from 'node:test';
import assert from 'node:assert/strict';
import { describeLoginError } from '../src/lib/auth/login-error.ts';

test('development diagnosis includes only allowlisted code and status', () => {
  const result = describeLoginError({code:'email_not_confirmed',status:400,message:'private data'}, true);
  assert.match(result.message, /email_not_confirmed \/ 400/);
  assert.ok(!JSON.stringify(result).includes('private data'));
});
test('production does not distinguish credentials from unconfirmed accounts', () => {
  assert.equal(describeLoginError({code:'invalid_credentials',status:400}).message,
    describeLoginError({code:'email_not_confirmed',status:400}).message);
});
test('unknown error strings cannot leak through diagnostics', () => {
  const result = describeLoginError({code:'secret',name:'secret',status:'secret',message:'secret'},true);
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('network errors and rate limits have actionable messages', () => {
  assert.match(describeLoginError({name:'AuthRetryableFetchError',status:0}).message, /認証サービス/);
  assert.match(describeLoginError({status:429}).message, /試行回数/);
});
