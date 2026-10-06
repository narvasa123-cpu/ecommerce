import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, CLOUDFLARE_BUILD: '1' },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
