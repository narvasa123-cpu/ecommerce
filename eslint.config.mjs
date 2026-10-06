import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    '.next/**',
    '.open-next/**',
    '.wrangler/**',
    'cloudflare-env.d.ts',
    'node_modules/**',
    'next-env.d.ts',
  ]),
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
]);
