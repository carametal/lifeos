const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase environment variables are missing');
const response = await fetch(new URL('/auth/v1/settings', url), {
  headers: { apikey: key }, signal: AbortSignal.timeout(10000),
});
console.log(`Auth settings HTTP status: ${response.status}`);
if (!response.ok) process.exit(1);
const settings = await response.json();
console.log(`Public signup disabled: ${settings.disable_signup === true}`);
console.log(`Email login enabled: ${settings.external?.email === true}`);
console.log(`Anonymous login enabled: ${settings.external?.anonymous_users === true}`);
