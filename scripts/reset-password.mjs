import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export async function resetPassword(client, { userId, email, password }) {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) return { result: 'USER_LOOKUP_FAILED' };
  if (data.user.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return { result: 'EMAIL_MISMATCH_NO_CHANGE' };
  }
  // Never change confirmation state, identity, role, or any profile data.
  const { error: updateError } = await client.auth.admin.updateUserById(userId, { password });
  if (updateError) {
    const codes = new Set(['weak_password', 'same_password', 'user_not_found', 'not_admin']);
    return { result: 'RESET_FAILED', code: codes.has(updateError.code) ? updateError.code : 'admin_request_failed' };
  }
  return { result: 'PASSWORD_UPDATED' };
}

async function main() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.port) {
      throw new Error('Invalid destination');
    }
    if (process.argv[2] === '--project') {
      console.log(JSON.stringify({ project: url.origin }));
      return;
    }
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const payload = JSON.parse(input);
    input = '';
    if (payload.project !== url.origin || payload.confirmation !== 'RESET' ||
        !/^sb_secret_[A-Za-z0-9_-]+$/.test(payload.key) ||
        !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payload.userId) ||
        typeof payload.email !== 'string' || !payload.email.includes('@') ||
        typeof payload.password !== 'string' || payload.password.length < 12 || Buffer.byteLength(payload.password) > 72) {
      throw new Error('Invalid input');
    }
    const client = createClient(url.origin, payload.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) }) },
    });
    const report = await resetPassword(client, payload);
    payload.password = ''; payload.key = '';
    console.log(JSON.stringify(report));
  } catch {
    // A timeout after submission may mean the update succeeded. Do not auto-retry.
    console.log(JSON.stringify({ result: 'CHECK_OR_REQUEST_FAILED_VERIFY_LOGIN_BEFORE_RETRY' }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
