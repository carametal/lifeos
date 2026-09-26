// Called by check-login.py. Credentials arrive on stdin, not argv or disk.
import { createClient } from '@supabase/supabase-js';
import { describeLoginError } from '../src/lib/auth/login-error.ts';

let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const credentials = JSON.parse(input);
  input = '';
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, {...init, signal: AbortSignal.timeout(10000)}) },
  });
  const { error } = await client.auth.signInWithPassword(credentials);
  credentials.password = '';
  if (error) {
    const { code, status } = describeLoginError(error);
    console.log(JSON.stringify({ result: 'LOGIN_FAILED', code, status }));
  } else {
    const { error: logoutError } = await client.auth.signOut({ scope: 'local' });
    console.log(JSON.stringify({ result: logoutError ? 'LOGIN_OK_LOGOUT_FAILED' : 'LOGIN_OK_LOGGED_OUT' }));
  }
} catch {
  console.log(JSON.stringify({ result: 'CHECK_FAILED' }));
}
