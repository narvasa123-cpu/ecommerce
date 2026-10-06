# Admin update — 6 October 2026

Preview: http://localhost:3000/admin. Sign in through `/account` with `admin@orven.test` / `Atelier2026!demo`.

The administration area now has its own espresso sidebar, compact Manrope typography, warm neutral panels, active navigation, mobile menu and order search. It uses existing project React components, Lucide icons and native dialogs. 21st catalog search required unavailable authentication; no catalog component was copied. The design decision is recorded in `.21st/design.json` and `.21st/DESIGN.md`.

## Delivered workflows

- Dashboard: 7/30/90-day reports, real paid order value, order count, average paid order value, new customers, daily chart with an accessible data table, fulfillment queue, stock attention and activity.
- Records: server-side search, status filters, sorting where relevant, shareable URL state, 12-row pagination, empty states and dedicated support inbox.
- Products: USD price fields, image selection/reordering, meaningful alt text, structured SKU/colour/size/made-to-order fields, publishing controls and search metadata. New products start unpublished; existing variants are retained.
- Inventory: before/after quantity preview, required reason, transactional adjustments and audit records.
- Orders: items, complete totals, payment state, customer/shipping details, timeline, persisted internal notes and valid fulfillment transitions. Tracking is required when shipping or delivering.
- Promotions: percent or dollar discounts, dollar minimum spend, usage limits and an explicit UTC expiry field.
- CSV: filtered product/order/inventory exports across pages, capped at 10,000 records, admin authorization, private/no-store caching and spreadsheet formula neutralization.

## Verification

- Production build, TypeScript, lint and formatting passed.
- Vitest: **24 tests passed** across three files, including export authorization and spreadsheet safety.
- Storefront browser suite: **10 desktop/mobile scenarios passed**, including sandbox checkout, keyboard gallery controls, account login and admin access.
- Final admin browser suite: **8/8 passed** against the production build, including desktop and 360×800 mobile dashboard, records, exports, price saves, stock adjustments and order notes.
- The full browser run first passed 17/18 scenarios. Its mobile pagination failure revealed offscreen accessibility labels escaping table containment and widening the document. Table containment was fixed, the initial 360px-width assertion was strengthened, and all eight admin scenarios were rerun successfully.
- Axe found no violations under the selected WCAG 2 A/AA and 2.2 AA rules on the dashboard and product editor at both viewport sizes. Automated checks do not establish full compliance.
- 21st review completed with informational colour/token notices only.

Test edits restore product price, stock quantity and original order notes. Audit entries remain. Storefront purchases create local sample orders and decrease stock normally.

## Screenshots

- [Desktop dashboard](admin-dashboard-desktop.png) / [360px dashboard](admin-dashboard-mobile.png)
- [Desktop products](admin-products-desktop.png) / [360px products](admin-products-mobile.png)
- [Desktop editor](admin-product-editor-desktop.png) / [360px editor](admin-product-editor-mobile.png)

The store still uses SQLite and sandbox/test payments. Bulk actions, browser media uploads, staff-role management, automatic refunds and outbound support replies are not implemented. Existing launch requirements in the README still apply.
