# Supabase PostgreSQL migration

Verified locally on 6 October 2026 against PostgreSQL 18. Supabase account access and the hosted migration remain pending; no hosted database was modified during these checks.

- Prisma schema now targets PostgreSQL, with a JavaScript PostgreSQL driver and separate runtime/migration connection variables.
- The old SQLite migration is archived. The new PostgreSQL migration creates all 21 application tables and enables row-level security without browser access policies.
- The read-only SQLite import completed into an empty local PostgreSQL database. Every application's table count matched its SQLite source immediately after transfer: 21 products, 42 variants, 11 orders, and their related records were preserved. The source SQLite file was not modified.
- A second import was correctly refused because the destination already contained users.
- All 28 unit/integration tests passed, including simultaneous checkout retries, competing carts, cancellation requests and payment confirmations.
- All 18 desktop/mobile browser tests passed against the PostgreSQL production build, covering storefront access, sandbox checkout, account permissions, and admin product/inventory/order workflows.
- Production build, TypeScript, lint and formatting checks passed. The production dependency audit reported zero vulnerabilities.

Use a separate database ending in `_test` for integration tests. Browser checks place sandbox orders in the configured catalogue; those orders decrease its stock. Server database credentials must remain in ignored environment files or hosting secrets.

Cloudflare deployment still requires the chosen Supabase connection, a Hyperdrive binding, the framework adapter and a verified deployed runtime. Supabase Auth is not substituted for the existing database sessions.
