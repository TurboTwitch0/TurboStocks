# Release 1.5.4 Vercel and GitHub deployment readiness

## Daily market briefing — October 25, 2026
- Added an on-demand home-page market update card and dialog with provider headlines, tracked-company movers, and a plain-language snapshot.
- Shows source names, quote times, provider errors, and the limited scope of tracked companies; renders provider text safely and keeps these data separate from fixed paper-trading prices.
- Updated the service worker shell cache identifier.
- Verification on October 25, 2026: `npm run check` passed; full `npm test` passed with **59 tests, 0 failures**, including the daily-briefing UI contract test.

## Changes

- Added root `index.js` importing Express and exporting the existing app so Vercel's Express integration detects it. Local `npm start` continues to run `backend.js`.
- Added `vercel.json` with a 30-second maximum for the Express function. Vercel serves the existing `public/` frontend as static files; app API URLs and backend routes remain unchanged. Existing Netlify deployment files are retained.
- Explicitly selects the Express framework in `vercel.json` so a saved static-site framework preset cannot disable the server deployment.
- Expanded `.gitignore` for `.vercel/` and `.env.*`, documented GitHub-to-Vercel import/deploy steps and smoke checks, and recorded serverless cache/rate-limit and browser-local profile limitations.
- Extended ignores for private backup/trade exports and applied the backend security headers to Vercel's static assets. The service-worker script has explicit revalidation headers.
- Added `.vercelignore` to keep uploaded ZIP archives and the old `TurboStocks/` source folder out of the deployment while retaining them in Git history.
- Bumped package/lockfile and service-worker shell versions to 1.5.4. Added tests for the Vercel app export, duration config, and public asset layout.

## Verification

- `npm run check`: passed.
- Focused frontend, Netlify adapter, paper-engine, PWA, and Vercel suites: **50 passed, 0 failed**.
- Full `npm test`: **58 passed, 0 failed** after network access was enabled. This includes all eight local HTTP server tests that earlier runs could not reach.
- These tests check the app and configuration locally. Vercel's actual deployment is checked separately through the existing GitHub integration; no rendered-browser or real-device verification is implied.

# Release 1.5.3 mobile layout repair and verification

## Changes

- Replaced the overlapping responsive media-query patches with a consolidated tablet/phone layout system. It uses flexible minmax grids, compact typography, safe-area spacing, wrapping content, responsive tables, and reduced-motion support without hiding page overflow.
- Added a compact phone header with Turbo Stocks branding, search, theme, and profile controls; added a five-destination Home/Markets/Portfolio/Learn/More fixed navigation and an accessible More menu for Trending, News, Tutor, Community Pulse, Tools, and Copyright.
- Added four live simulated-account overview metrics to Home, compact phone hero actions, and two-column metric cards. TradingView widgets, market lists, portfolio tables, lesson paths, news cards, tutor responses, dialogs, and the mini tutor now use narrower layouts. The fixed nav accounts for bottom safe area, and it yields space when a mobile keyboard opens.
- Preserved fixed sample trading calculations, saved lesson IDs, profile storage, charts, news and tutor functionality. Bumped the app package and service-worker shell to version 1.5.3.
- Added automated checks for the five mobile destinations, More menu pages, dashboard metrics, safe-area navigation, and keyboard behavior.

## Verification

- `npm run check`: passed.
- Focused frontend, Netlify adapter, paper-engine, and PWA suites: **48 passed, 0 failed**.
- Full `npm test`: **48 passed, 8 failed**. All eight failures are local HTTP server tests blocked by this environment with `connect EACCES 127.0.0.1:<ephemeral-port>` before they can reach their test servers.
- Stylesheet braces are balanced (539 opening and 539 closing); package and lockfile versions both match 1.5.3.
- The automated frontend suite uses a simulated DOM, not a rendered browser. The 320, 360, 375, 390, and 430 CSS breakpoints and tablet/desktop rules were inspected in source, but their rendered behavior, landscape mode, actual iPhone/Android devices, TradingView reflow, keyboard behavior, and PWA update lifecycle were not visually verified in this session.

# Release 1.5.2 changes and verification

- Made help popovers hidden with an explicit CSS priority unless their info button has `aria-expanded="true"`; hover and focus rules cannot expose them.
- Reset all help buttons to closed on page startup and on browser `pageshow`, including back-forward cache restores.
- Mirrored the fix into the project currently open in VS Code (`outputs/TurboStocks-1.4.1/TurboStocks`) and bumped its shell cache/version to 1.4.2. Bumped this standalone latest project and cache to 1.5.2.
- Latest `npm run check`: passed; focused frontend/Netlify/paper-engine/PWA suites: **47 passed, 0 failed**.
- Active VS Code project's `npm run check`: passed; frontend suite: **30 passed, 0 failed**.
- Rendered-browser verification remains incomplete.

# Release 1.5.1 changes and verification

- Portfolio info popovers now appear only after the info button is activated. Hovering or tabbing to an info button no longer opens the text; clicking the button toggles it, and clicking outside closes it. The button remains keyboard-operable, with its explanation available to assistive technology.
- Bumped the package and service-worker shell to 1.5.1 so installed apps can fetch the change.
- `npm run check`: passed.
- Focused frontend, Netlify adapter, paper-engine, and PWA suite: **47 passed, 0 failed**.
- Full suite: **47 passed, 8 failed**. The 8 local HTTP server tests are blocked by this environment with `connect EACCES 127.0.0.1:<ephemeral-port>`.
- Rendered-browser verification was not completed.

# Release 1.5.0 changes and verification

## Changes

- Added watchlist sorting by saved order, symbol, fixed sample price, or fixed sample percentage change. Sorting is a view preference and does not rewrite the saved watchlist.
- Added trade-history filters for symbol/action and inclusive date range. The summary reports matching versus saved trades; CSV export now follows the active filters and keeps spreadsheet-formula neutralization.
- Added stock-detail actions that prepare a buy or sell order in the portfolio form. They do not place a trade; the existing preview and explicit confirmation are still required.
- Improved the responsive history-filter layout and released the service-worker shell as `turbo-shell-v1.5.0` so installed apps can fetch the update.
- No runtime dependency was added. Existing sample prices remain separate from external chart data.

## Verification

- `npm run check`: passed.
- `node --test tests/frontend.test.js tests/netlify.test.js tests/paper-engine.test.js tests/pwa.test.js`: **46 passed, 0 failed**.
- Full `npm test`: **46 passed, 8 failed**. All eight failures are HTTP server tests blocked in this environment by `connect EACCES 127.0.0.1:<ephemeral-port>`; the server-listener tests could not connect to their local test server.
- The frontend tests use a simulated DOM. Rendered-browser, mobile viewport, and installed-PWA verification were not completed.

## Changed files

- `public/app.js`, `public/ui.js`, `public/index.html`, `public/styles.css` — watchlist sorting, trade filters and matching CSV, stock-detail order setup, and responsive controls.
- `public/sw.js`, `package.json`, `package-lock.json`, `README.md`, `CHANGES-AND-TESTS.md` — 1.5.0 release and setup notes.
- `tests/frontend.test.js` — coverage for the new behaviors and filtered CSV safety.

# Release 1.4.1 changes and verification

- Moved the device preview toolbar from the global header into the Other page. The controls still preview Desktop, Laptop, Tablet, and Phone content widths; the explanatory text clarifies that this does not resize the browser or change responsive breakpoints.
- Added a regression test that verifies the preview controls exist only within Other and retain their preview behavior.
- Bumped the app and service-worker shell to 1.4.1 to make the UI update available to installed app caches.
- `npm run check`: passed.
- `node --test tests/frontend.test.js tests/netlify.test.js tests/paper-engine.test.js tests/pwa.test.js`: **42 passed, 0 failed**.
- Full `npm test`: **42 passed, 8 failed** in this restricted environment; each failure is a server-listener check rejected with `connect EACCES 127.0.0.1:<ephemeral-port>`. The failure prevents claiming the full suite passed.
- Rendered-browser verification was not completed; the localhost browser tab is not confirmed to be serving this working copy.
# Release 1.4.0 changes and verification

## What changed from the supplied 1.3.3 source

- Reworked the header and design tokens to a restrained navy, blue, white and gray interface; removed the top-left text brand while retaining the app identity elsewhere. Added stronger keyboard focus, disabled states, help buttons, mobile navigation behavior, and responsive portfolio/learning layouts.
- Made the portfolio explain total simulated value, cash, sample-price holdings, purchase cost basis, realized/unrealized P/L, and concentration by position. The allocation list includes cash and repeats the chart's percentages as text for screen readers. It does not imply a daily return or calculate an unsupported total return.
- Added four suggested learning paths with progress and next-lesson buttons, searchable lessons, objectives, difficulty/read time, and explanations for every lesson quiz. Existing lesson IDs and local progress records remain valid.
- Clarified tutor response type (built-in guide, local model, retrieved news, or calculated paper snapshot), added cancellation and follow-up-aware lesson retrieval, and expanded quiz routing for the new topics. The guide continues to work without a model/API. OCR is explicitly text extraction only.
- Added TradingView chart startup error handling, a timeout fallback, retry controls for failed embed widgets, and set chart symbol changes off to match the app's stock detail and order controls.
- Added regression checks for portfolio/allocation presentation, lesson ID preservation and metadata, new tutor topics, tutor labels, and cleanup of the 1.3.3 service-worker cache. Bumped package and worker shell versions to 1.4.0.

## Changed files

- `public/index.html` — header, portfolio descriptions, learning path/search areas, tutor labels and cancel control.
- `public/app.js` — portfolio rendering, learning path/search metadata, quiz explanations, tutor context/labels/cancellation, and chart/widget recovery.
- `public/styles.css` — new theme tokens, focus states, portfolio/learning layouts, mobile navigation and loading/fallback treatments.
- `public/ui.js` — keyboard/tap help popover behavior.
- `public/sw.js` — new `turbo-shell-v1.4.0` cache name.
- `tests/frontend.test.js`, `tests/pwa.test.js` — new regression coverage and expected prior-cache cleanup.
- `package.json`, `package-lock.json`, `README.md`, `CHANGES-AND-TESTS.md` — release version, user setup, deployment, scope, results and limitations.

## Automated verification

Run with the installed Node.js 24.21.0 runtime on October 13, 2026:

- `npm run check`: passed (backend, Netlify function, app, paper engine, UI helpers and service worker syntax).
- `npm test`: **49 passed, 0 failed**. Tests include 46 inherited checks and 3 new checks for portfolio values/allocation, lesson paths and stable IDs, and tutor topic routing/mode labeling. Existing suites cover paper trading reconciliation and fractional trades, damaged/quota storage, profiles/stale tabs, backups, quiz saves, provider failures, API routes/rate limits, Netlify adapter invocation, and service-worker boundaries.
- `npm ci` was completed successfully earlier in this work from the unchanged dependency lock entries; no production/runtime dependency was added for 1.4.0.
- Netlify's current official docs were reviewed: [Express on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/), [Function configuration and limits](https://docs.netlify.com/build/functions/configuration/), [redirects and rewrites](https://docs.netlify.com/manage/routing/redirects/overview/), and [rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/). The Express adapter test passes, but it does not run Netlify's own redirect or bundling system.

## Browser and deployment verification

- Rendered-browser check: **not completed**. Attempts to open `http://localhost:3100` and `http://127.0.0.1:3100` from the in-app browser timed out. Shell loopback requests also timed out. The Express server process did start, but this did not permit rendered page, mobile viewport, keyboard-theme, or live UI inspection. Automated DOM tests are simulated and are not browser verification.
- `netlify dev`: **not completed**. The Netlify CLI was not installed; the `npx netlify-cli --version` attempt stalled while acquiring it. Netlify redirect/function bundling was therefore not exercised. No deployment or publish was performed.
- PWA cache rules were tested through the simulated service-worker harness. Installed PWA offline startup/update behavior was not tested in a real browser.
- Provider success, WebGPU model download/inference, OCR download, and mobile/device layout behavior remain unverified.

## Remaining limitations

Netlify synchronous Functions currently have a 60-second execution limit and 6 MB buffered request/response payload limit in the documented defaults. Provider calls in this project abort after 8 seconds. News/quote caches, coalescing, and the basic in-process rate counter are instance-local, reset on cold starts, and do not provide cross-instance abuse protection. Google News RSS excerpts are untrusted; Yahoo quotes are an unofficial integration whose commercial-use permission has not been established; TradingView widgets use external data. The paper engine always uses fixed samples. Browser-local profiles do not provide secure server accounts or cross-device synchronization.

The Netlify CLI attempt and browser access limitations are environment constraints, not successful verifications. Before publishing, run `netlify dev` locally and check the deployed static pages and `/api/*` endpoints, then review real-device responsive, accessibility and PWA behavior.

## Release 1.3.3 historical record

## Changes in this release

- Added Netlify Functions support around the existing Express app, API rewrites preserving `/api/...`, static asset publishing from `public`, compatibility redirects, `serverless-http`, and deployment setup notes.
- Added validated version-1 browser backup import (10 MB limit), a replacement preview/confirmation, and best-effort rollback if browser storage rejects an import. Backup contents are checked before they can replace data.
- Added stock detail cards, add/remove watchlist controls, trade-history filtering, formula-safe CSV export, full-position close orders, and order previews with estimated cost/proceeds, buying power, and realized P/L.
- Quiz feedback now shows each correct answer and a relevant excerpt from the lesson.
- Bumped the service-worker shell cache version so revised app assets replace the prior cached shell.
- Updated beginner VS Code/start/test/deploy instructions and a prioritized roadmap. Local demo profiles and paper trading remain local and simulated.
- Sign-in now submits through a native HTML form with correct browser autofill/keyboard validation; signup-only fields become required only in signup mode. Sign-out keeps the active profile and shows an error if browser storage blocks clearing the session.
- Hardened backup import with an exact allowlist of supported app keys, bounded/deep JSON validation, profile and record cross-checks, allowed symbol checks, and a 10 MB limit. Preview counts now include community notes and preferences. Imports acquire a cross-tab lock, recheck the stored snapshot before committing, verify the replacement, refresh in-memory state on success, and attempt to restore the old snapshot on failure. If restoration cannot be verified, the UI offers a recovery download.
- Prevented app writes from other tabs while a backup replacement is underway. Browser `navigator.locks` is used when available; the fallback uses a short-lived local-storage lease and is best-effort under simultaneous-tab races.
- Fixed the service-worker cache version, which remained at 1.3.1 in the 1.3.2 package. The new release installs a fresh shell cache and removes prior Turbo Stocks shell caches on activation; a regression test covers the versioned cleanup.

## Automated verification

Run using Node.js v24.21.0 on October 13, 2026 (America/Chicago):

- `npm ci --ignore-scripts --no-audit --no-fund`: completed successfully; dependencies installed from the lockfile.
- `npm run check`: passed for the Express backend, Netlify function, browser app, paper engine, UI helpers, and service worker.
- `npm run check`: passed after the 1.3.3 cache fix.
- `npm test`: **38 passed, 8 blocked** (46 total). All eight blocked tests are Express listener tests; each failed to connect to a local ephemeral `127.0.0.1` port with `connect EACCES`. They could not verify their route behavior in this environment. Rerun `npm test` on a normal local machine with loopback access.
- `npm audit --omit=dev`: **0 reported vulnerabilities** for the locked production dependencies at check time.

Passing coverage includes sign-in/sign-up/sign-out (including blocked-storage sign-out), fractional buys/sales, weighted average cost, cash proceeds, buying power, realized and unrealized P/L reconciliation, corrupt storage, failed saves, stale tabs, demo-profile separation, tutor errors, backup import allowlisting and validation, failed-write restoration, navigation and inline handlers, Netlify function adapter invocation, and worker cache boundaries. The adapter test invokes the handler with a synthetic `/api/search` event; it does not exercise Netlify's redirect engine. The loopback-dependent Express route/provider/rate-limit checks were unable to run because of this host's socket restriction.

## Browser and deployment verification status

- **Rendered-browser check: not completed.** The app server started at `http://localhost:3000`, but the in-app browser timed out connecting to it. This does not establish visual or responsive correctness.
- **Netlify deployment: not performed**, as requested. The function adapter itself was invoked by an automated test, but the Netlify CLI is not installed here, so Netlify's bundling and rewrite engine were not exercised. Use `netlify dev` or a Netlify deploy preview to verify `/api/*` routing and static assets before production deployment.
- Frontend DOM tests are simulated and do not count as a rendered-browser check. Service-worker tests use a simulated worker and do not establish real offline/update behavior.

## Remaining manual checks

- Check page rendering, 320/375/390/768 px layouts, desktop, 200% zoom, mobile navigation, keyboard focus and both themes in current desktop/mobile browsers.
- Exercise dialogs, backup file picker and CSV download through the rendered app; test import on a nearly full/blocked storage device.
- On Netlify, verify `/api/search`, `/api/trending-stocks`, static asset routes, environment configuration, cold starts, provider timeouts, and deploy logs.
- Verify actual PWA installation, offline launch and update lifecycle on target devices; do not install a worker update in the middle of an order.
- Verify WebGPU model downloads/inference and OCR on supported devices. OCR reads text only. No local model, live market/news success, or commercial provider permission has been verified.

## Limits

The in-memory caches, request coalescing, and basic rate limit reset with a function instance and are not shared across Netlify instances. They are not a durable abuse-control service. Netlify functions and external news/quote providers are subject to their timeouts and availability. The quote source is an unofficial Yahoo integration and its commercial-use permission was not established. Google News RSS excerpts are untrusted and do not provide verified facts. TradingView has separate external data. Paper trades always use fixed sample prices. User accounts are browser-local demo profiles; secure backend authentication and synchronization are not implemented.



## Search layout update — October 21, 2026
- Results open directly below the search field, wrap long names, and scroll within available viewport height on every screen size.
- Visual viewport resize/scroll handling accounts for mobile keyboard space; 16px input text avoids iPhone focus zoom.
- Results use native buttons with arrow-key navigation, Escape dismissal, and outside-click/focus dismissal.
- Updated service worker cache identifier.
- Verification: syntax checks and all 58 existing automated tests passed. Rendered-browser verification was blocked by a local preview connection timeout; physical-device keyboard and orientation behavior remain untested.
