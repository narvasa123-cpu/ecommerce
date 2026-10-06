import { DatabaseSync } from 'node:sqlite';
import { Prisma } from '@prisma/client';
import { db } from '../src/lib/db';

// Read-only source, preserved IDs, and a single rollback-capable destination
// transaction. Never merge this import into an existing populated database.
const source = new DatabaseSync(process.argv[2] || 'prisma/dev.db', { readOnly: true });
try {
  await db.$transaction(
    async (tx) => {
      for (const model of Prisma.dmmf.datamodel.models) {
        const table = model.dbName || model.name;
        const counts = await tx.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) AS count FROM "${table}"`,
        );
        if (Number(counts[0].count))
          throw new Error(`Destination ${table} is not empty. Import stopped.`);
      }
      for (const model of Prisma.dmmf.datamodel.models) {
        const table = model.dbName || model.name;
        const fields = model.fields.filter((f) => f.kind === 'scalar');
        const columns = fields.map((f) => `"${f.dbName || f.name}"`).join(', ');
        const rows = source.prepare(`SELECT ${columns} FROM "${table}"`).all();
        for (const row of rows) {
          const values = fields.map((field) => {
            const value = row[field.dbName || field.name];
            if (value == null) return null;
            if (field.type === 'DateTime') return new Date(Number(value));
            if (field.type === 'Boolean') return Boolean(value);
            return value;
          });
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          await tx.$executeRawUnsafe(
            `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
            ...values,
          );
        }
        console.info(`Imported ${rows.length} ${table} records.`);
      }
    },
    { timeout: 120000 },
  );
} finally {
  source.close();
  await db.$disconnect();
}
