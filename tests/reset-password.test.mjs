import test from 'node:test';
import assert from 'node:assert/strict';
import { resetPassword } from '../scripts/reset-password.mjs';

function client(user, error = null) {
  const updates = [];
  return { updates, auth: { admin: {
    getUserById: async () => ({ data: {user}, error }),
    updateUserById: async (...args) => { updates.push(args); return {error:null}; },
  } } };
}
test('lookup failure and email mismatch never mutate users', async () => {
  for (const c of [client(null, {message:'private'}), client({email:'other@example.test'})]) {
    await resetPassword(c,{userId:'test-id',email:'owner@example.test',password:'test-password'});
    assert.equal(c.updates.length,0);
  }
});
test('updates only the password of the verified user and returns no secrets', async () => {
  const c=client({email:'owner@example.test'});
  const result=await resetPassword(c,{userId:'test-id',email:'owner@example.test',password:'test-password'});
  assert.deepEqual(c.updates,[['test-id',{password:'test-password'}]]);
  assert.deepEqual(result,{result:'PASSWORD_UPDATED'});
});
test('admin error output never includes raw errors', async () => {
  const c=client({email:'owner@example.test'});
  c.auth.admin.updateUserById = async()=>({error:{code:'private',message:'secret'}});
  const result=await resetPassword(c,{userId:'test-id',email:'owner@example.test',password:'test-password'});
  assert.deepEqual(result,{result:'RESET_FAILED',code:'admin_request_failed'});
});
