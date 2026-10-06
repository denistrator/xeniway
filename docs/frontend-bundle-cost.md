# Frontend bundle cost

The original baseline was measured on October 6, 2026, against commit `8788de2`. The follow-up below records the on-demand create-form change based on `f390c76`. This is a production-build asset baseline, not a before/after Tailwind Variants migration benchmark. All sizes below use decimal KB (1 KB = 1,000 bytes).

## October 7 state-machine refactor measurement

The access refactor preserves existing download boundaries. Compared with the pre-refactor build (`3fbb00a`, with documentation-only `19b1e34` on top), Vite's build-log estimates changed as follows:

| Shared chunk | Before emitted / gzip KB | After emitted / gzip KB |
| --- | ---: | ---: |
| Entry | 516.42 / 159.50 | 520.73 / 160.83 |
| Workspace | 334.32 / 93.67 | 334.88 / 93.82 |
| Styling (`button`) | 44.94 / 14.75 | 44.94 / 14.75 |

This is a small bundle increase, not a download optimization. Explicit transitions and the runtime add policy code; chunk attribution alone cannot establish total route cost or CPU improvement.

The final production build was also served with API port 3103 and preview port 4186. Fresh Chromium contexts at 1440×900, English/default preferences, no worker and an unopened create form produced these JS/CSS Resource Timing totals. Protected routes used the seeded account; direct workspace used a separate authenticated context. Board → workspace used the actual MAXED card, cleared timings before the click, and waited for the editor read view and network idle.

| Route / navigation | Files | Emitted KB | Modeled gzip KB | Encoded body KB | Transfer KB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold login | 12 | 631.54 | 194.66 | 193.61 | 197.21 |
| Cold board | 12 | 662.95 | 204.87 | 203.44 | 207.04 |
| Cold workspace | 15 | 995.91 | 297.26 | 295.07 | 299.57 |
| Board → workspace delta | 5 | 363.36 | 102.43 | 101.63 | 103.13 |

No route requested the create host. These final-route totals are a new baseline, not a directly comparable before/after route benchmark: the historical measurements below predate later offline/PWA additions. They exclude HTML, API responses, images, fonts and maps. Preview compression/caching can differ from deployment, and these are byte measurements, not interaction timings.

The measured validation reduction is separate: a four-query stored snapshot invokes status validation four times instead of eight after removing duplicate canonical derivation. Strict stored-shape, hash, timestamp and ownership checks remain covered. No IndexedDB-open reduction or runtime-speed improvement is claimed; each operation still owns its connection and transaction.

## Method and scope

Offline preparation is a separate, explicitly requested download: it fetches all public build assets, including lazy create/workspace/locale chunks and PWA metadata/icons, plus all three private application lists and every unique workspace's data. Ordinary startup does not register the worker or trigger this whole-build download. Do not count preparation bytes as cold-route savings or describe moving code among chunks as removing it. The production offline suite checks that the create host is not fetched before consent. Historical measurements below predate the offline runtime; the recorded read-only-runtime baseline is a point-in-time measurement, not a measurement of the later PWA/full-workspace-preload additions.

Build from `apps/web` with `bunx vite build --manifest --sourcemap hidden`. The ignored manifest identifies imports; hidden source maps identify bundled sources without adding a browser source-map request. Do not publish diagnostic source maps unintentionally.

Serve the build with `env API_PORT=3101 bunx vite preview --host 127.0.0.1 --port 4175 --strictPort`. For this run, the local API used port 3101 and `APP_ORIGIN`/`CORS_ORIGIN` of `http://127.0.0.1:4175`, with existing migrated/seeded local services. These are local measurement settings, not production configuration.

Playwright Chromium used a 1440×900 viewport, default English preferences, and a fresh browser context for each cold route. Protected routes used an authenticated seed-account session. Navigation measurements used actual links/card buttons in the SPA. After navigation, allow lazy imports to start before waiting for network idle; a URL change alone does not mean route assets have loaded. Clear resource timings before each warm navigation. Reload the settled workspace separately to inspect HTTP-cache reuse.

For each phase, collect `performance.getEntriesByType("resource")`, filter `/assets/` JavaScript and CSS, and sum `encodedBodySize` and `transferSize`. Deduplicate asset URLs when summing emitted file sizes. The tables exclude HTML, API responses, images, fonts, and source maps. They measure initial route settlement, not every later interaction, locale, or theme change.

“Compressed body” is the browser-observed encoded response size. “Transfer” is the browser's transfer-size estimate, including response overhead. The preview served compressed assets; deployment compression and caching may differ. Independently gzip each emitted file with Node's `zlib.gzipSync()` for a reproducible modeled size; these totals differ slightly from preview response compression and Vite's displayed gzip estimates. The original baseline had no interaction-timing probe; the follow-up adds limited local samples below, without CPU/network throttling.

## Read-only offline runtime baseline

Measured October 6, 2026 against the final uncommitted Phase 1 production build, with entry `index-Su8VHIbj.js`. The build was served on preview 4175 with an isolated API on 3102 and existing seeded fixtures. Chromium used fresh English 1440×900 contexts for cold login and cold authenticated board; Add job and preparation then used the settled board context. No application writes were made. This is a point-in-time baseline, not a controlled optimization comparison.

| Phase | Files / reads | Emitted KB | Modeled gzip KB | Encoded body KB | Response transfer KB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold `/login`, JS/CSS | 12 | 622.567 | 192.099 | 191.035 | 194.635 |
| Cold signed-in `/`, JS/CSS | 12 | 653.976 | 202.313 | 200.875 | 204.475 |
| First Add job delta, JS/CSS | 1 | 11.988 | 3.864 | 3.855 | 4.155 |
| Prepare public manifest assets | 53 | 1,346.125 | 387.886 | 391.825 | 407.341 |
| Prepare private list reads | 3 | — | — | 20.238 | 21.775 |
| Prepare assets + lists | 56 | — | — | 412.063 | 429.116 |

Cold-route and first-open rows use Resource Timing and exclude HTML, favicons, API responses, and worker registration. Both cold routes had zero worker registrations; first Add job fetched one lazy host. Preparation includes index/favicons and deliberately fetches the entire public manifest even after ordinary route visits. It uses Playwright `Request.sizes()` for worker-owned requests; response transfer here is body plus response headers, excluding request headers and connection overhead. Those accounting methods are not interchangeable, and deployment compression may differ.

The worker is separately 8.919 KB emitted / 3.315 KB modeled gzip. Chromium did not expose its registration-response body size, so the preparation aggregates exclude that actual cost rather than assume zero. Private list sizes depend on account data. No private fields or credentials were logged. Historical route/workspace measurements below remain useful context but are not the current full-route baseline.

## Historical cold route downloads

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

## Follow-up: on-demand create form

The shared layout now renders a lightweight authentication/loading boundary. The host import starts on the first authenticated Add job activation, not when a public page or board renders. The host remains mounted after closing until authentication is lost or the account changes. Existing mutation, dialog, and form behavior is retained; no hover/focus preload, manual chunk splitting, dependency replacement, or workspace-editor change was introduced.

Repeated the production-preview procedure above with the new build. No `job-manager-host` asset appeared in any initial route load. These compressed-body totals include JavaScript and CSS, with the create form unopened:

| Cold route | Original KB | On-demand KB | Reduction KB |
| --- | ---: | ---: | ---: |
| `/about` | 187.04 | 182.18 | 4.86 |
| `/login` | 186.02 | 181.99 | 4.03 |
| `/register` | 186.39 | 182.36 | 4.03 |
| `/forgot-password` | 185.53 | 181.50 | 4.03 |
| `/reset-password?token=invalid` | 185.84 | 181.82 | 4.03 |
| `/` | 195.67 | 191.79 | 3.89 |
| `/archive` | 190.29 | 186.40 | 3.89 |
| `/blacklist` | 190.34 | 186.46 | 3.89 |
| `/applications/:id` | 286.66 | 282.77 | 3.89 |

First Add job activation from the settled board fetches one new JavaScript file (`job-manager-host-DjPYOfET.js`), **11.96 KB emitted / 3.83 KB compressed body / 4.13 KB transfer**. Closing and reopening fetches no new assets. Keyboard activation, initial close-button focus, Escape, and focus return were verified against the preview. The browser regression additionally delays the first import and moves focus while loading, verifying activation-time focus restoration. Direct board → workspace remains **100.95 KB compressed body / 102.45 KB transfer**; workspace navigation is not optimized by this change.

The new entry is **482.54 KB emitted / 147.71 KB modeled gzip**, slightly larger uncompressed than the original entry. Total emitted JavaScript is **1,239.62 KB / 354.28 KB modeled gzip** across 48 files. This optimization defers downloads; it does not remove the form's code. Most shared form primitives are still needed by auth, board, or workspace routes, limiting the cold-load reduction.

Cached workspace reload transfer was about **4.50 KB** for 15 JS/CSS resources. Chromium may report the cached representation's `encodedBodySize` even when transfer only reflects revalidation; do not interpret that cached value as a newly downloaded body. The original baseline's zero encoded size and this follow-up's populated encoded size are not evidence of a caching regression.

## Entry and workspace byte attribution

Use the hidden source maps to decode generated positions and attribute each generated span up to the next mapping to its source package. Unmapped prefixes, segments, newlines, and remaining bytes are counted separately; totals reconcile with emitted file bytes. This is approximate **minified-code attribution**, not source-content length, gzip allocation, removable bytes, or runtime CPU cost.

### Entry: `index-DP5-4LSf.js`

| Contributor | Approximate emitted KB |
| --- | ---: |
| React DOM | 207.12 |
| Zod | 82.23 |
| Application code, including English dictionary/shared contracts | 44.53 |
| i18next | 43.17 |
| React Router | 38.28 |
| TanStack Query core + React bindings | 34.92 |
| Redux Toolkit, Redux, React Redux, Immer, thunk, external-store helper | 23.80 |
| Scheduler | 3.54 |
| Other dependencies | 1.87 |
| Unmapped generated code | 3.09 |

The English dictionary accounts for approximately 13.99 KB of application code. Other locales remain lazy. `main.tsx` imports React DOM and global providers; the shared layout/header need routing, auth queries, preferences, and i18n on public and protected routes. `lib/user-preferences.ts` imports the locale/theme/form enum schemas from the shared contract module, making Zod an eager dependency even on routes without an application form. The API client and Query hooks already use type-only shared imports; moving them into a vendor chunk would not remove these required downloads.

The actionable entry investigation is whether shared schema-module boundaries can avoid unnecessary eager construction while retaining shared validation. Removing validation, replacing the React runtime, or duplicating preference contracts is not part of this change. No numeric saving is established for a future schema split.

### Workspace: `application-workspace-page-CRKQNOPp.js`

| Contributor | Approximate emitted KB |
| --- | ---: |
| Atlaskit feature-gate client + Statsig client/core | 112.95 |
| Tooltip/Popper dependencies | 42.61 |
| Application workspace code | 34.52 |
| Top-layer, portal, layering | 29.74 |
| Atlaskit Form + Final Form/focus | 25.76 |
| Tokens, app-provider, theme | 23.21 |
| Button/icon/primitives/spinner/support | 19.10 |
| Motion | 7.23 |
| InlineEdit itself | 6.06 |
| Analytics/context helpers | 5.30 |
| Other dependencies | 23.27 |
| Unmapped generated code | 2.65 |

The feature-gate/Statsig group is about **34% of workspace JavaScript before compression**. The installed InlineEdit imports `@atlaskit/platform-feature-flags/fg`; its `resolveBooleanFlag` module statically imports the feature-gate client, which brings the Statsig dependency graph into the bundle. The application already installs `setBooleanFeatureFlagResolver(() => false)` in `main.tsx`. That runtime resolver preserves false flag behavior, but does not remove static dependency code from the build. Bundled SDK code alone does not prove that remote feature-gate requests occur.

InlineEdit's own 6.06 KB does not represent its transitive cost. Conversely, the whole 332.40 KB chunk is not all editor-library code. Investigate supported upstream dependency/import reductions before considering a library change. Do not alias packages to empty stubs or blanket-replace flag functions: those can silently change component behavior and need a separate reviewed design and regression coverage.

### Local interaction and responsive checks

Five fresh authenticated Chromium contexts started at a settled board with no workspace chunk cached. Browser-side timestamps measured the actual card click to the workspace company editor appearing plus two animation frames, and the company edit click to input focus plus two animation frames. No fields were changed or saved.

| Diagnostic interaction | Median ms | Range ms |
| --- | ---: | ---: |
| Board card activation → workspace ready | 109.4 | 94.2–112.9 |
| First company edit → input focused | 30.3 | 29.7–30.9 |

These are local unthrottled loopback samples and include API, chunk loading, render, and frame-alignment delays; they are not INP, CPU-only measurements, performance budgets, or proof of a production improvement. There is no equivalent pre-change interaction sample. Capture representative-device traces before deciding that any dependency is a runtime bottleneck.

At 390×844 with reduced motion, the lazy-loaded dialog received focus and remained within the viewport. The unchanged authenticated header extended the document to 411 px both before and after opening; its trailing language-control group overflowed the 390 px viewport. This separate responsive issue is recorded in the backlog, not fixed by hiding overflow or expanding this loading change.
