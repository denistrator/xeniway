# Frontend bundle cost

Measured on October 6, 2026, against commit `8788de2`. This is a production-build asset baseline, not a claim about rendering speed or a before/after migration benchmark. All sizes below use decimal KB (1 KB = 1,000 bytes).

## Method and scope

Build from `apps/web` with `bunx vite build --manifest --sourcemap hidden`. The ignored manifest identifies imports; hidden source maps identify bundled sources without adding a browser source-map request. Do not publish diagnostic source maps unintentionally.

Serve the build with `env API_PORT=3101 bunx vite preview --host 127.0.0.1 --port 4175 --strictPort`. For this run, the local API used port 3101 and `APP_ORIGIN`/`CORS_ORIGIN` of `http://127.0.0.1:4175`, with existing migrated/seeded local services. These are local measurement settings, not production configuration.

Playwright Chromium used a 1440×900 viewport, default English preferences, and a fresh browser context for each cold route. Protected routes used an authenticated seed-account session. Navigation measurements used actual links/card buttons in the SPA. After navigation, allow lazy imports to start before waiting for network idle; a URL change alone does not mean route assets have loaded. Clear resource timings before each warm navigation. Reload the settled workspace separately to inspect HTTP-cache reuse.

For each phase, collect `performance.getEntriesByType("resource")`, filter `/assets/` JavaScript and CSS, and sum `encodedBodySize` and `transferSize`. Deduplicate asset URLs when summing emitted file sizes. The tables exclude HTML, API responses, images, fonts, and source maps. They measure initial route settlement, not every later interaction, locale, or theme change.

“Compressed body” is the browser-observed encoded response size. “Transfer” is the browser's transfer-size estimate, including response overhead. The preview served compressed assets; deployment compression and caching may differ. Independently gzip each emitted file with Node's `zlib.gzipSync()` for a reproducible modeled size; these totals differ slightly from preview response compression and Vite's displayed gzip estimates. No throttled CPU/network or interaction-latency benchmark was performed.

## Cold route downloads

| Route | JS / CSS files | Emitted JS KB | Emitted CSS KB | Compressed body KB | Transfer KB |
| --- | --- | ---: | ---: | ---: | ---: |
| `/about` | 10 / 1 | 568.84 | 41.35 | 187.04 | 190.34 |
| `/login` | 13 / 1 | 563.14 | 41.35 | 186.02 | 190.22 |
| `/register` | 13 / 1 | 564.56 | 41.35 | 186.39 | 190.59 |
| `/forgot-password` | 12 / 1 | 562.38 | 41.35 | 185.53 | 189.43 |
| `/reset-password?token=invalid` | 12 / 1 | 563.38 | 41.35 | 185.84 | 189.74 |
| `/` (board) | 12 / 1 | 594.35 | 41.35 | 195.67 | 199.57 |
| `/archive` | 14 / 1 | 576.36 | 41.35 | 190.29 | 194.79 |
| `/blacklist` | 14 / 1 | 576.56 | 41.35 | 190.34 | 194.84 |
| `/applications/:id` | 14 / 2 | 906.13 | 59.85 | 286.66 | 291.46 |

The complete build contains 48 JavaScript files totaling 1,239.03 KB emitted / 354.34 KB modeled gzip, plus two CSS files totaling 59.85 KB emitted / 13.07 KB modeled gzip. This is not a single-route download: it includes lazy routes, alternative themes, and locale dictionaries.

## Warm navigation and caching

Start at a settled board, then navigate through archive, blacklist, board, and workspace in the same context:

| Transition | New JS / CSS files | Compressed body KB | Transfer KB |
| --- | --- | ---: | ---: |
| Board → archive | 4 / 0 | 5.46 | 6.66 |
| Archive → blacklist | 1 / 0 | 1.02 | 1.32 |
| Blacklist → board | 0 / 0 | 0.00 | 0.00 |
| Board → workspace, after those visits | 2 / 1 | 97.94 | 98.84 |
| Workspace reload, after settlement | 14 / 2 revalidated assets | 0.00 | 4.80 |

In a separate fresh authenticated context, **board → workspace directly** fetched four JavaScript files and one CSS file: 342.12 KB emitted JS + 18.50 KB emitted CSS, **100.96 KB compressed body / 102.46 KB transfer**. Visiting archive first makes the later workspace delta smaller because Card and activity code are already loaded. Do not subtract cold route totals to estimate a navigation delta: some board-only code remains cached but is not needed by the workspace.

The reload result is preview-specific HTTP revalidation, not a guarantee of zero production requests. The shared styling chunk was not downloaded again during SPA navigation.

## What the shared styling chunk carries

`button--hxEZsqB.js` is **44.95 KB emitted / 14.60 KB modeled gzip**. It is present in every measured cold route, including public pages. Its source map contains:

- Three Tailwind Variants distribution modules, including class conflict resolution and its configuration.
- Radix Slot and compose-refs helpers.
- The application Button recipe/component.

Approximate generated-code attribution from source-map spans puts Tailwind Variants at 41.1 KB, Radix helpers at 2.85 KB, and Button at 0.87 KB. These are approximate minified-byte allocations, not source-file sizes or independently additive compressed costs. The chunk name does not imply that its entire cost belongs to Button rendering.

The entry `index-wdtKnb7f.js` is 482.04 KB emitted / 147.80 KB modeled gzip. The earlier build log showed an entry of about 513 KB, but there is no matching pre-migration route-download measurement here. The smaller entry does not establish a net reduction: dependency code moved into shared chunks. The 14.60 KB shared chunk is also not the incremental cost of adopting Tailwind Variants, since the prior styling dependencies had their own cost.

## Interpretation and follow-up

The workspace chunk `application-workspace-page-D22Xpd1-.js` is 332.40 KB emitted / 92.46 KB modeled gzip, with another 18.50 KB emitted workspace CSS. Its source map includes 213 Atlaskit modules, 206 other dependency modules, and 31 application modules; module counts are not byte attribution. No separate `custom-theme` chunk was requested during these initial English/default-preference routes.

The evidence supports investigating two separate questions if optimization is approved:

1. **Shared cold-load cost:** inspect the large entry and why global job-manager/form dependencies are requested even on public routes. Keep the styling chunk in that accounting rather than reporting entry size alone.
2. **Workspace incremental cost:** attribute the workspace's dependency bytes and measure read/edit interaction performance before changing loading boundaries. Its roughly 101 KB direct-navigation compressed download is larger than the entire shared styling chunk.

No application optimization or dependency replacement was made for this measurement. Preserve Atlaskit InlineEdit, saved-field behavior, keyboard/focus management, validation, responsive layouts, and the compact-field unsaved-change warning in any later work. Repeat the route measurements on the intended host with its compression/cache policy and representative locale/theme settings before choosing performance budgets.
