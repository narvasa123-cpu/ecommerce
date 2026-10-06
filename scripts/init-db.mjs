import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const url = process.env.DATABASE_URL || 'file:./dev.db';
if (!url.startsWith('file:'))
  throw new Error('This schema uses SQLite; configure a file: database URL.');
const location = resolve('prisma', url.slice(5));
mkdirSync(resolve(location, '..'), { recursive: true });
if (!existsSync(location)) writeFileSync(location, '');
console.log('Local SQLite file is ready.');
