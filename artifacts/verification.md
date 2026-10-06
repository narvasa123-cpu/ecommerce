# Verification — 4 October 2026

Local production preview: http://localhost:3000. Node 24, Next.js 16.3.8, SQLite, sandbox payments.

- Production build completed successfully before this final run.
- Vitest: 21 tests passed across two files. Covers pricing, reservation transactions, cancellation/expiry, idempotency, provider confirmation, authorization, CSRF and recovery from interrupted checkout.
- Playwright: 10 tests passed across desktop and 360×800 mobile Chromium. Covers navigation, filters, gallery keyboard controls, full sandbox purchase, account login and protected admin tools. The home page's document width is checked against the configured viewport.
- Axe: no violations for the selected WCAG 2 A/AA and 2.2 AA rules on home and product pages. Automated checks are not a full accessibility certification.
- Lint, TypeScript and formatting checks passed. The full npm audit reports five high-severity development-only findings through `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`, rooted in [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The advisory lists no patched version. The suggested forced downgrade of Next's lint tooling was not applied. These dependencies process repository glob patterns, not customer input; do not supply untrusted glob patterns to tooling. Production dependencies are audited separately with `npm audit --omit=dev`.

## Mobile Lighthouse

Production-only dependency audit: zero vulnerabilities (`npm audit --omit=dev`).

Lighthouse 13, default mobile simulation, installed Chrome, local production server. Captured sequentially after browser tests; screenshots and reports reflect the final application code.

| Page    | Performance | Accessibility | Best practices | SEO | LCP  | TBT     | CLS |
| ------- | ----------- | ------------- | -------------- | --- | ---- | ------- | --- |
| Home    | 86          | 100           | 100            | 100 | 2.2s | 490ms   | 0   |
| Product | 76          | 100           | 100            | 100 | 1.9s | 1,040ms | 0   |

The requested performance target of 90 is not met in this run. JavaScript evaluation/hydration and main-thread work remain the measured bottleneck; performance needs further profiling on the intended hosting environment. No measured layout shift occurred. Scores are measurements rather than guarantees.

- [Home HTML report](lighthouse-home.report.html) and [JSON](lighthouse-home.report.json)
- [Product HTML report](lighthouse-product.report.html) and [JSON](lighthouse-product.report.json)
- [Desktop home](home-desktop.png), [360px home](home-mobile.png)
- [Desktop product](product-desktop.png), [360px product](product-mobile.png)

External Stripe test-mode behavior still requires operator credentials and webhook setup. Payment assertions in this run use the explicitly labeled local sandbox and mocked provider state in integration tests. Browser purchases create sample orders and decrement local development inventory.
