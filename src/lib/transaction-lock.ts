import type { Prisma } from '@prisma/client';

// PostgreSQL allows concurrent writers. Serialize operations on the same
// checkout, order or rate-limit key until the surrounding transaction ends.
export async function transactionLock(tx: Prisma.TransactionClient, key: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
