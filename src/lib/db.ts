import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { supabaseCa } from './supabase-ca';
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
const requestClients = new WeakMap<object, PrismaClient>();

function createClient(connectionString: string, worker = false) {
  const url = new URL(connectionString);
  const supabase = url.hostname.endsWith('.supabase.com') || url.hostname.endsWith('.supabase.co');
  if (supabase) {
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslaccept');
  }
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.toString(),
      max: 5,
      connectionTimeoutMillis: 60000,
      ...(worker ? { maxUses: 1, idleTimeoutMillis: 1000 } : {}),
      ...(supabase ? { ssl: { ca: supabaseCa, rejectUnauthorized: true } } : {}),
    }),
  });
}

function currentClient() {
  if (process.env.ORVEN_RUNTIME === 'cloudflare') {
    const { env, ctx } = getCloudflareContext();
    if (!('HYPERDRIVE' in env) || !env.HYPERDRIVE)
      throw new Error('Cloudflare Hyperdrive binding is missing.');
    let client = requestClients.get(ctx);
    if (!client) {
      client = createClient(env.HYPERDRIVE.connectionString, true);
      requestClients.set(ctx, client);
    }
    return client;
  }
  return (globalDb.prisma ??= createClient(process.env.DATABASE_URL || ''));
}

// Resolve the request's database lazily so Worker sockets never cross requests.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = currentClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
export const periodStart = () => new Date(Date.now() - 30 * 86400000);
