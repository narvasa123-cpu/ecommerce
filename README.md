# ORVEN

A complete e-commerce concept for considered leather goods, hosted on Render with Supabase PostgreSQL. Built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Zod, bcrypt sessions, and Stripe **test mode only**. The identity, catalogue, copy and imagery are original fictional concepts.

## Run locally

### Philippine peso conversion

Storefront prices, admin analytics, monetary editors, product filters and CSV exports use PHP. The fixed reference rate is **US$1 = ₱62.647**, dated 5 October 2026, from [the published exchange-rate table](https://taxcalculator.com.ph/exchange-rates). It is not a live exchange-rate feed. For example, US$200 becomes ₱12,529.40. Existing database/API monetary values remain in USD cents to preserve historical records; `src/lib/pricing.ts` is the conversion boundary. PHP editor inputs round to the nearest base-currency cent (about ₱0.63), so arbitrary centavo prices cannot be stored exactly. Checkout displays any conversion-rounding adjustment separately.

New Stripe **test** sessions settle in PHP centavos. Signed callbacks and expired-session reconciliation verify both the session currency and converted total; legacy USD sessions still reconcile. The default delivery country is the Philippines. PH delivery uses the converted domestic demonstration fees and an illustrative 12% tax estimate, not a compliant tax calculation. No data migration or live charge is performed.

Requires Node.js 22.13+ (Node 24 for the optional SQLite import), npm, and a PostgreSQL database. Copy `.env.example` to `.env`, then set `DATABASE_URL` and `DIRECT_URL` from Supabase **Connect > Session pooler**, using port 5432 and a URL-encoded database password. Keep both variables server-only. In PowerShell:

```powershell
npm install
# Configure .env as described above before setup.
npm run setup
npm run dev
```

Open http://localhost:3000. `setup` generates the PostgreSQL Prisma client, applies the committed migration, and seeds data. The app uses the JavaScript PostgreSQL adapter, with a small server connection pool. Supabase hosts storage; the existing bcrypt sessions and server-side role checks remain in use. Seeding is repeatable and preserves existing records. Production build: `npm run build`, then `npm start`. Set `APP_URL` to the exact origin you use; same-origin request validation deliberately rejects other origins.

## Supabase migration

The PostgreSQL conversion passed 28 unit/integration tests, all 18 desktop/mobile browser tests, and the production build on 6 October 2026. The hosted Supabase migration is complete and the imported table counts are verified. Demo passwords were replaced; hosted login passwords are saved only in the ignored `.env.supabase` file. See [migration verification](artifacts/supabase-verification.md).

The PostgreSQL initial migration is in `prisma/migrations/20261006000000_supabase`. The former SQLite SQL is archived in `prisma/legacy-sqlite` and is never applied to PostgreSQL. Application tables have row-level security enabled without browser policies: only the trusted server database role may access store records. Use the project database owner or an appropriate dedicated server role; never expose a database password through `NEXT_PUBLIC_` variables or client code. Supabase Auth and browser Data API access are not used.

For an existing SQLite catalogue, point `DATABASE_URL` and `DIRECT_URL` at a new empty PostgreSQL destination, run `npm run db:generate` and `npm run db:migrate`, then run `npm run db:import-sqlite` **instead of seeding**. The script reads `prisma/dev.db` without modifying it, preserves IDs, converts timestamps and booleans, and imports every application table in one transaction. It refuses a populated destination. A different SQLite source path can be passed after `--`. Verify the transfer before changing the running site's connection. Schema migration and this data transfer are separate operations.

PostgreSQL checkout, cancellation and payment confirmation use transaction-scoped advisory locks to retain idempotency under concurrent requests. Rate limits use atomic PostgreSQL counter upserts. Inventory and promotion decrements also use conditional atomic updates. Integration tests exercise concurrent checkout retries, competing carts, cancellation replay and payment replay.

## Render performance

The active hosting target is a Render Node web service. Use the build and start commands in `render.yaml`, with `ORVEN_RUNTIME=node`, `CLOUDFLARE_BUILD=0`, and a server-only `DATABASE_URL`. This path shares a Prisma connection pool across requests and uses normal Next.js image optimization. Choose a Render region close to the Supabase database and inspect query latency before changing pool limits.

The blueprint uses Render's Free plan. Free services sleep after 15 minutes without incoming traffic and can take about a minute to restart; application optimizations cannot eliminate that platform cold start. Confirm the actual service plan in Render, since dashboard settings may differ from this file. See [Render's Free service limits](https://render.com/docs/free). No billing plan is changed by this project.

Performance improvements reduce redundant cart/wishlist requests, reuse session CSRF tokens, batch reorder reads, stream product reviews and related items, and compute dashboard chart buckets in a single pass. Collection navigation is cached for five minutes and immediately invalidated after collection edits. Product inventory, cart totals, sessions and payment verification remain live. Cart mutations reconcile only their own expired reservations; checkout and the authenticated `/api/cron` endpoint retain store-wide reconciliation. Configure an external scheduler to call that endpoint with its existing `CRON_SECRET` authorization if background cleanup is desired.

Compare warm requests separately from first visits after idle: record collection/product response time, cart mutation time, database query time, and Render CPU/memory usage. The changes above are not a measured production speed guarantee.

## Optional Cloudflare Workers deployment (historical checks)

Published storefront: https://orven-store.narvasadarryljohn.workers.dev. Sign in at `/account` using `admin@orven.test` and the `DEPLOY_ADMIN_PASSWORD` value saved in your ignored `.env.supabase` file, then open `/admin`. The development passwords below do not work on this deployment.

The initial live checks passed, including admin dashboard, product export, price editing and inventory restoration. Continued checks hit Cloudflare's free-plan CPU ceiling: Worker logs report `exceededCpu` at 10 ms and requests return HTTP 503. Live checkout and the remaining browser tests are not yet verified. Enable Workers Paid in the account's Workers plan settings before resuming the full live suite. Workers Paid starts at $5/month, with usage charges above included limits; see [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time).

The Worker uses OpenNext and the configured `HYPERDRIVE` binding for Supabase. Hyperdrive query caching is disabled so sessions, stock and orders are read consistently. Database clients are scoped to each Worker request; PostgreSQL transaction locks retain checkout/payment idempotency. The home page and sitemap read live data. Product media comes from the bundled image manifest. Cloudflare builds serve the supplied WebP assets directly.

`npm run build:cloudflare` builds the Worker and removes copied private environment files from its output. The cleanup also checks generated files for known credential values and fails the build if any remain. It makes the Prisma WASM import relative so a Linux artifact can be deployed from another machine. Runtime `APP_URL`, `PAYMENT_MODE`, and `ORVEN_RUNTIME` are set in `wrangler.jsonc`; database credentials belong to the Hyperdrive configuration, never Worker assets or GitHub source. Public Supabase CA certificate files are intentionally committed.

`npm run deploy:cloudflare` builds and publishes using your authenticated Cloudflare account. Linux builds are available through the manual **Build Cloudflare Worker** GitHub Actions workflow; OpenNext's Windows support is incomplete. The workflow builds without hosted database passwords. To deploy its downloaded artifact, extract `orven-worker.tar.gz` in the project root, run `node scripts/clean-cloudflare.mjs`, then `npx wrangler deploy`. The `.env.supabase` file stores deployment login passwords locally and is excluded from GitHub. Payments remain sandbox-only.

## Development logins

| Role     | Email               | Password         |
| -------- | ------------------- | ---------------- |
| Admin    | admin@orven.test    | Atelier2026!demo |
| Customer | customer@orven.test | Orven2026!demo   |

Sign in at `/account`; administrators land at `/admin`. These credentials are development-only. Set `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` before first seeding a different environment. Changing the seed variables does not silently overwrite existing users' passwords.

Seed includes 3 collections, 21 products, 42 variants, low-stock/sold-out/made-to-order examples, 3 historical orders and `WELCOME10` (10%, ₱12,529.40 minimum) / `ATELIER25` (₱1,566.18, ₱18,794.10 minimum). Promotion thresholds are before discount; complimentary standard delivery is from ₱15,661.75 after discount. Seed records retain the original base-currency amounts.

## What works

- Responsive editorial home, original SVG wordmark, collection search/filter/sort/pagination stored in the URL, product gallery with native modal zoom and arrow-key navigation, colours/sizes, stock labels, related pieces.
- Persistent anonymous cart, accessible drawer and full bag page, quantity changes and promotion entry. All totals come from the server in integer USD cents.
- Guest/account checkout, saved destinations, standard/express delivery, review/progress, private confirmation/tracking link, order history.
- New registrations use Supabase Auth email confirmation and password recovery; existing accounts retain the original sign-in flow. Expiring application sessions and profile/address management remain in the application database. Legacy reset and order confirmation emails are logged to the server console.
- Admin product/variant/image/SEO editing, collection editing, inventory adjustments with reasons, order fulfillment/tracking/notes, customer names and records, promotions, newsletter count, support inbox, audit history and truthful 30-day metrics.
- Persisted newsletter signups and support messages; service pages, legal templates, metadata, Open Graph, product JSON-LD, sitemap and robots.
- Server role checks on every admin page and mutation; CSRF tokens and origin checks; database-backed auth/promo rate limiting; input validation; HttpOnly/SameSite cookies, Secure on production HTTPS; security headers.

## Payments and inventory

Default `PAYMENT_MODE=sandbox` works without credentials. The final action is labeled **Place sandbox order**. It reserves stock and records a simulated payment; no card fields, charge or actual shipment exists.

For Stripe test checkout, set:

```dotenv
PAYMENT_MODE="stripe"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"
```

Forward test webhooks with the Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the listener's signing secret. Subscribe to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. Only verified provider-confirmed, non-live, paid events in the expected session currency mark Stripe orders paid (PHP for new sessions, USD for legacy sessions). The return URL alone cannot do so. The order page has a refresh action for pending status. Only `sk_test_` keys are accepted.

Checkout re-fetches product prices and promotion rules. Inventory decrement, usage reservation, order/items/payment creation and audit log occur in one transaction; insufficient stock rolls everything back. The unique idempotency key returns the original order on retries; a bag cannot have two simultaneous pending checkouts. Payment confirmation is idempotent. Failures, cancellations and expiry restore stock and promotion usage once.

Reservations last 31 minutes and Stripe sessions expire at 30 minutes. Stripe state is reconciled before timed release; if verification is unavailable, stock stays held for safety. Configure a scheduler to POST `/api/cron` every minute with `Authorization: Bearer <CRON_SECRET>` for timely cleanup. Cart access and new checkout also release expired reservations. Canceling a Stripe reservation expires its provider session first. An interrupted checkout is recoverable from the bag: view the pending order, resume its Stripe test session, or cancel and start again.

See [Stripe's webhook guidance](https://docs.stripe.com/webhooks) and [fulfillment guidance](https://docs.stripe.com/checkout/fulfillment) for external setup.

## Administration

Admin update verified on 6 October 2026: 24 unit/integration tests and all eight new desktop/mobile admin browser scenarios passed; the ten storefront browser scenarios also passed. Build, lint, TypeScript and formatting checks passed. See [admin verification and screenshots](artifacts/admin-verification.md).

The admin at `/admin` has a dedicated sidebar, current-section navigation, mobile navigation, and an order search. The dashboard reports real database records for 7, 30 or 90 days, including paid order value, orders, average paid order value, new customer accounts, a daily sales chart with accessible values, and fulfillment/low-stock queues. All transaction data remains sandbox or Stripe test-mode data.

Lists use server-side search, relevant status filters, URL state and 12-record pagination. Products and orders also support sorting. Orders, products and inventory have filtered CSV exports across pages (up to 10,000 records); export endpoints require an administrator session, disable caching, and neutralize spreadsheet formula cells. Customer messages have a dedicated Inbox; activity records identify known administrators by name.

Product prices, fixed discounts and minimum spends are entered in **PHP pesos**, then reverse-converted to integer USD cents for server storage. Percentage discounts use whole percent. Promotion expiry is explicitly **UTC** to avoid device-timezone drift.

The product editor has image selection, upload and reordering, plus named fields for SKUs, colour swatches, sizes and made-to-order variants. Upload JPEG, PNG or WebP photos up to 8 MB directly from the editor; they are stored in a public Supabase Storage bucket and product records keep the resulting URL. Configure `SUPABASE_SECRET_KEY` as a server-only deployment secret (`SUPABASE_SERVICE_ROLE_KEY` is supported for legacy projects), and create a public `product-images` bucket (or set `SUPABASE_PRODUCT_IMAGES_BUCKET` to another bucket name) with an 8 MB limit and JPEG, PNG and WebP allowed. The upload API requires an administrator session, CSRF validation and per-admin rate limiting. Arbitrary remote URLs and filesystem paths remain rejected. Bundled media can still be expanded by placing owned files in `public/images` and adding filenames to `public/images/manifest.json`. New variants start with zero stock; existing variants remain to protect historical references. New products start unpublished. Archive products by clearing the Published checkbox.

Inventory adjustments use a dialog with a before/after quantity preview and required reason. Quantities exclude reservations, and adjustments retain an audit trail. Order details include items, full totals, customer and shipping information, provider payment state and a timeline. Fulfillment only offers valid forward transitions and requires a carrier/tracking number for shipped or delivered orders. Internal notes are persisted; unpaid orders cannot be fulfilled.

## Design and image replacement

Tokens are defined in `src/app/globals.css`. Ivory, stone, taupe, espresso, near-black and restrained brass; Cormorant Garamond display / Manrope UI; local Latin WOFF2 fonts with swap; fluid spacing and reduced-motion support.

All five WebP assets in `public/images` were created using the built-in image generation tool. `public/images/manifest.json` records the prompts and replacement contract. Product photographs are representative **AI concept placeholders**, reused across related sample products; there are no actual product photos or manufacturing claims. Replace the files at their stable paths in one step, then update alt text, accurate variants and verified product data. Campaign copy and product pages explicitly disclose the concept nature.

The 21st design context lives in `.21st`. Catalog search was attempted but authentication was unavailable; no 21st catalog component was copied. The interface uses project-native React components and Lucide icons. `21st review` was run; token declarations were informational findings and intentional search autofocus was the only warning.

## Checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
```

If Chrome is already installed, `$env:PLAYWRIGHT_CHANNEL="chrome"` runs the automated browser suite with it. Unit/integration tests require a separate PostgreSQL database through `TEST_DATABASE_URL` (default `postgresql://postgres@127.0.0.1:55432/orven_test`). The database name must end in `_test`; tests clear test records and must never point at the catalogue. Browser tests use the development database and place sample orders, so stock decreases as it would in normal use. Desktop/mobile preview screenshots are saved to `artifacts/`. Checks cover cent-based pricing/tax/shipping/promotions, transactional reservations and release, payment idempotency, admin authorization/CSRF, collection filters, gallery keys, responsive layout, automated WCAG checks, and browse → bag → sandbox checkout → confirmation.

## Assumptions and launch requirements

Final verification (4 October 2026): 21 unit/integration tests and all 10 desktop/mobile browser tests passed. The 360px storefront has no horizontal overflow, and automated WCAG 2 A/AA and 2.2 AA checks found no violations on home/product pages. Production build, lint, TypeScript and formatting checks passed. The full npm audit reports five high-severity development-only findings through Next's ESLint plugin and its glob dependencies, all rooted in [the unpatched braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Do not feed untrusted glob patterns into development tooling. npm's suggested forced downgrade of the Next lint configuration was not applied; production dependencies are checked separately with `npm audit --omit=dev`.

The production-only audit (`npm audit --omit=dev`) reports zero vulnerabilities.

Mobile Lighthouse against the local production build:

| Page    | Performance | Accessibility | Best practices | SEO | LCP  | CLS |
| ------- | ----------- | ------------- | -------------- | --- | ---- | --- |
| Home    | 86          | 100           | 100            | 100 | 2.2s | 0   |
| Product | 76          | 100           | 100            | 100 | 1.9s | 0   |

The performance target of 90 is **not met in this measurement**. Main-thread blocking remains the limiting factor (490ms home, 1,040ms product). Scores depend on the test environment; further profiling and reducing hydration work are required before claiming that target. Full reports and refreshed desktop/360px screenshots are in `artifacts/`; see [verification details](artifacts/verification.md).

- Brand: ORVEN; category: leather bags and small goods; quiet contemporary design; PHP-converted sample prices; design-conscious adults; ship-to PH, US, FR, DE, NL and IE.
- Storage now targets Supabase PostgreSQL through Cloudflare Hyperdrive. The local SQLite database is retained only as a read-only import source; the app no longer writes to it. A custom bcrypt/database-session implementation provides server-side authorization and session revocation. Cloudflare uses the OpenNext adapter and the configured Hyperdrive binding.
- Shipping and tax are **demonstration rules**, not real tax advice or compliant jurisdiction calculations. Integrate a verified tax/duty provider before real commerce.
- New Supabase Auth confirmation and recovery emails use Supabase's configured email sender. Its default sender is restricted to project-team addresses and is suitable only for development. Configure custom SMTP for customer delivery. Legacy password reset and order confirmation messages still use the console development mailer; add a transactional email provider and durable outbox before launch. Newsletter sending and unsubscribe are not implemented, and no marketing is sent.
- Stripe integration is implemented but requires the operator's test credentials/webhook configuration to test against the external provider. Live payments are intentionally unsupported.
- Legal pages are marked templates. Real merchandise, accurate product photography, validated origin/craft claims, company information, shipping/returns/refunds processes and legal review are needed before public sales.
- Sandbox order links are high-entropy bearer URLs; keep them private. Logged-in users also have account order history. Admin lists are paginated and exports are bounded. Bulk actions, browser media uploading, role management, automated refund processing and outbound support replies are not implemented.
- Automated accessibility checks and keyboard/mobile smoke checks complement but do not establish full WCAG compliance. Lighthouse scores are environment-specific and recorded separately when measured.
