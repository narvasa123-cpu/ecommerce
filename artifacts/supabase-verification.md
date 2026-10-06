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

Cloudflare Hyperdrive is configured with query caching disabled, a five-connection origin limit, and verified TLS using Supabase's public CA certificate. The OpenNext adapter, request-scoped database clients, bundled admin media manifest, and live home/sitemap reads are implemented. Supabase Auth is not substituted for the existing database sessions.

## Cloudflare deployment validation

- Published on 6 October 2026 at https://orven-store.narvasadarryljohn.workers.dev, Worker version `7b61e2d7-aced-49d3-8d0f-bac0c3d82087`.
- The Linux build passed in [GitHub Actions run 37403880704](https://github.com/narvasa123-cpu/ecommerce/actions/runs/37403880704). The downloaded artifact was cleaned of private environment files and scanned for known local credentials before deployment. Its Prisma WASM import was made relative to support deployment from Windows.
- Deployment passed: 2,095.67 KiB compressed Worker bundle, 17 ms startup. Initial HTTP checks returned 200 for the storefront, product detail, account, sitemap, robots and CSRF endpoints. The hero WebP asset loaded successfully, and product responses included the configured security headers.
- Live desktop tests passed for the admin dashboard/accessibility/reporting, product pagination/search/CSV export, product price editing and inventory adjustments with restoration. The admin authorization/CSRF protection test also passed.
- Subsequent tests encountered HTTP 503 and Cloudflare Error 1102. Live Worker logs confirmed `exceededCpu` with `cpuTime: 10` on storefront requests. The suite was stopped; this is not a successful full live browser run. Live checkout, order detail editing and mobile verification remain pending.
- The free Workers plan limits CPU to 10 ms per request. Reliable operation of this server-rendered application requires a higher allowance through Workers Paid; changing billing requires the account owner's approval. See [Cloudflare CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

After the plan change, rerun the 18 browser tests against the live origin with the deployment passwords loaded from the ignored local file:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://orven-store.narvasadarryljohn.workers.dev'
node --env-file=.env.supabase node_modules/@playwright/test/cli.js test
```
