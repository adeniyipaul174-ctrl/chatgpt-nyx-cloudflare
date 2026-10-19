import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = new URL('../wrangler.jsonc', import.meta.url);
let config;
try {
  config = JSON.parse(readFileSync(file, 'utf8'));
} catch {
  console.error('[NyX release gate] Could not parse wrangler.jsonc. Deployment blocked.');
  process.exit(1);
}

// The GitHub root candidate predates the current live application.
// The current live Worker is maintained separately and must not be overwritten.
const protectedWorkers = new Set(['chatgpt-nyx-v3-test', 'chatgptnyx']);
const protectedDatabaseIds = new Set(['45d9f7c9-91f2-4767-990e-4bb49395a8f4']);
const dbs = Array.isArray(config.d1_databases) ? config.d1_databases : [];
const unsafeTarget = protectedWorkers.has(String(config.name || '').toLowerCase())
  || dbs.some(db => protectedDatabaseIds.has(String(db.database_id || '').toLowerCase()));
if (unsafeTarget) {
  console.error('[NyX release gate] BLOCKED: This repository snapshot is not equivalent to the live NyX Worker.');
  console.error('The Wrangler config targets a live Worker and/or the live D1 database.');
  console.error('Deploying this old snapshot could remove authentication, search, image and history features.');
  console.error('Create an isolated Worker and D1 database, reconcile from the live source, and pass staging QA first.');
  process.exit(1);
}
if (process.env.NYX_ALLOW_ISOLATED_CANDIDATE_DEPLOY !== 'YES') {
  console.error('[NyX release gate] Deployment requires NYX_ALLOW_ISOLATED_CANDIDATE_DEPLOY=YES.');
  console.error('This approval only enables an isolated candidate; protected targets remain blocked.');
  process.exit(1);
}
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['wrangler', 'deploy', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) {
  console.error('[NyX release gate] Deployment tool could not start:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
