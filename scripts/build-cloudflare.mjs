import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/,\s*([}\]])/g, '$1'));

const result = spawnSync(
  process.execPath,
  ['node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, CLOUDFLARE_BUILD: '1', APP_URL: config.vars.APP_URL },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./clean-cloudflare.mjs');
