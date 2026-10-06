# E-commerce analytics requirements

All five commerce features and all seven dashboard views in the supplied specification are included.

| Required feature | Location |
| --- | --- |
| Online shopping | `/collections`, `/products/[slug]` |
| Cart | Bag drawer and `/cart` |
| Checkout | `/checkout`, sandbox or Stripe test payment |
| Product management | `/admin/products` and product editor |
| Customer account | `/account`, registration, profile, addresses and order history |
| Sales performance | `/admin`, paid value, paid orders, total orders and average paid order |
| Customer growth | `/admin`, new accounts and previous-period comparison |
| Product performance | `/admin`, top 10 product snapshot names by paid gross item value with units |
| Cart abandonment rate | `/admin`, tracked carts, converted, abandoned, active and rate |
| Revenue trends | `/admin`, daily paid order value for 7/30/90 days |
| Customer location | `/admin`, aggregate paid order delivery countries and shares |
| Top categories | `/admin`, category ranks, units and gross item value |

## Metric definitions

- Reporting intervals begin at UTC midnight and include the current day.
- Sales/revenue use paid orders only. Order value includes discount, delivery and estimated tax.
- Product/category gross item value uses historical order line prices before order discounts, delivery and tax. Product variants are grouped by saved product name. Categories use current catalogue membership; missing variants are uncategorized.
- Customer growth counts registered CUSTOMER accounts and compares with the immediately preceding equal-length reporting interval.
- Cart tracking records validated cart-item mutations transactionally in the existing audit store. Each distinct cart updated in the reporting interval is counted once. A paid order after the first observed update converts the cart. Otherwise, 24 hours since its most recent update makes it abandoned. Recently updated carts are active and excluded from the rate denominator. Recovered carts are converted. The rate is abandoned / (abandoned + converted). No historical events are fabricated, and empty datasets show Awaiting data.
- Customer location counts order destinations, including guest orders. Only country aggregates are displayed.

Payments remain test mode as configured. No schema migration is required for this release.

## Verification

- TypeScript, ESLint, targeted formatting checks and the production Next.js build passed.
- Analytics and pricing suites: 10 tests passed, including aggregation, snapshot prices, duplicate cart events, cart recovery, active-cart exclusion, empty cohorts and exact 24-hour inactivity boundaries.
- 21st dashboard review: zero findings. Catalogue search was unavailable without authentication; existing project components were reused.
- Live Render deployment and browser verification were not completed in this environment.
