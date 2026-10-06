# Supabase PostgreSQL migration

Verified locally on 6 October 2026 against PostgreSQL 18, then migrated to the user's Supabase project. All 21 application table counts matched the read-only SQLite source after the hosted transfer. Demo account passwords were replaced and imported sessions/reset tokens revoked; new passwords are stored only in the ignored `.env.supabase` file.

- Prisma schema now targets PostgreSQL, with a JavaScript PostgreSQL driver and separate runtime/migration connection variables.
- The old SQLite migration is archived. The new PostgreSQL migration creates all 21 application tables and enables row-level security without browser access policies.
- The read-only SQLite import completed into an empty local PostgreSQL database. Every application's table count matched its SQLite source immediately after transfer: 21 products, 42 variants, 11 orders, and their related records were preserved. The source SQLite file was not modified.
- A second import was correctly refused because the destination already contained users.
- All 28 unit/integration tests passed, including simultaneous checkout retries, competing carts, cancellation requests and payment confirmations.
- All 18 desktop/mobile browser tests passed against the PostgreSQL production build, covering storefront access, sandbox checkout, account permissions, and admin product/inventory/order workflows.
- Production build, TypeScript, lint and formatting checks passed. The production dependency audit reported zero vulnerabilities.

Use a separate database ending in `_test` for integration tests. Browser checks place sandbox orders in the configured catalogue; those orders decrease its stock. Server database credentials must remain in ignored environment files or hosting secrets.

Cloudflare Hyperdrive is configured with query caching disabled, a five-connection origin limit, and verified TLS using Supabase's public CA certificate. The OpenNext adapter, request-scoped database clients, bundled admin media manifest, and live home/sitemap reads are implemented. Worker build and live deployment validation are in progress. Supabase Auth is not substituted for the existing database sessions.
