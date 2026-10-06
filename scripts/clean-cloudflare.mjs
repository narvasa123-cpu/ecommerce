import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve, sep, basename } from 'node:path';
import { parseEnv } from 'node:util';

const buildRoot = resolve(process.argv[2] || '.open-next');
if (!buildRoot.startsWith(resolve('.') + sep) || basename(buildRoot) !== '.open-next')
  throw new Error('Cleanup requires a Worker build inside this workspace.');
const envModule = join(buildRoot, 'cloudflare/next-env.mjs');
if (existsSync(envModule)) {
  const text = readFileSync(envModule, 'utf8').replace(
    /export const (\w+) = (\{[^\n]*\});/g,
    (_match, name, json) => {
      const publicValues = Object.fromEntries(
        Object.entries(JSON.parse(json)).filter(([key]) => key.startsWith('NEXT_PUBLIC_')),
      );
      return `export const ${name} = ${JSON.stringify(publicValues)};`;
    },
  );
  writeFileSync(envModule, text);
}

const secrets = ['.env', '.env.supabase'].filter(existsSync).flatMap((file) =>
  Object.entries(parseEnv(readFileSync(file, 'utf8')))
    .filter(
      ([key, value]) =>
        /PASSWORD|TOKEN|SECRET|DATABASE_URL|DIRECT_URL/.test(key) && value.length >= 8,
    )
    .map(([, value]) => Buffer.from(value)),
);
const exposed = [];
function inspect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(join(dir, entry.name));
    if (!file.startsWith(buildRoot + sep)) throw new Error('Invalid build output path.');
    if (entry.isDirectory()) inspect(file);
    else if (entry.isFile()) {
      if (entry.name === '.env' || entry.name.startsWith('.env.')) unlinkSync(file);
      else {
        const bytes = readFileSync(file);
        if (secrets.some((secret) => bytes.includes(secret))) exposed.push(file);
      }
    }
  }
}
inspect(buildRoot);
if (exposed.length)
  throw new Error(`Private credentials detected in generated files: ${exposed.join(', ')}`);
console.info(
  'Cloudflare bundle contains no copied private environment files or known credential values.',
);
