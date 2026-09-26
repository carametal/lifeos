import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

// Ephemeral PostgreSQL only. No host port, no remote project, no persistent volume.
const name = `lifeos-rls-${randomUUID().slice(0, 8)}`;
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Docker failed');
  return result.stdout;
}
let started = false;
try {
  docker(['run', '--rm', '-d', '--network', 'none', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16.1-bookworm']);
  started = true;
  for (let attempt=0; attempt<30; attempt++) {
    const ready = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { stdio:'ignore' });
    if (ready.status === 0) break;
    if (attempt === 29) throw new Error('PostgreSQL did not become ready');
    await setTimeout(500);
  }
  const migrations = readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
  const sql = [readFileSync('tests/db/bootstrap.sql','utf8'), ...migrations.map(f=>readFileSync(`supabase/migrations/${f}`,'utf8')), readFileSync('tests/db/rls.sql','utf8')].join('\n');
  const result = spawnSync('docker',['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'], {input:sql,encoding:'utf8'});
  process.stdout.write(result.stderr);
  if (result.status !== 0) throw new Error('Migration/RLS tests failed');
  const insertRevision = () => new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'], {stdio:['pipe','ignore','pipe']});
    let errors = '';
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(errors)));
    child.stdin.end(`begin; set local role authenticated;
      set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
      insert into public.nutrition_goals(effective_from,calories_kcal) values('2026-09-26',2200);
      select pg_sleep(0.2); commit;`);
  });
  await Promise.all([insertRevision(), insertRevision()]);
  docker(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],
    "select test.ok((select array_agg(revision order by revision)=array[1,2,3,4] from public.nutrition_goals), 'concurrent goal revisions serialize');");
  console.log('Concurrent goal revisions: passed');
  console.log('Migration/RLS tests passed. This does not test hosted Supabase Auth or PostgREST.');
} finally {
  if (started) docker(['stop',name]);
}
