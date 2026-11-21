# Turbo Stocks changes and verification

## Refresh imported conversations in a clean workspace — November 21, 2026

- An empty conversation is now treated as clean when reconciling imported saved history. A same-profile backup with remembered messages updates its checkbox, messages, and snapshot immediately; nonempty unsaved conversations and unsent main/quick drafts remain protected.
- Added the reproduced import-view regression. Syntax checks and all **117 tests** passed; no durable-data, transaction, or deployment behavior changed.

## Keep displayed accounts aligned with adopted authority — November 21, 2026

- Theme, export, and scoped-note operations now reconcile account/session memory with the authoritative snapshot after captured actor/context validation and before staging. Adopting a newer revision can no longer leave an old portfolio that later equal-revision sync skips. Stale account actions still reject before refresh and do not replay on a new profile.
- Added a failed-before/passed-after regression covering all three operations, coherent saved signatures, and preserved main/quick drafts plus unsaved conversations. Syntax checks and all **116 tests** passed. No storage schema, transaction protocol, or deployment behavior changed.

## Make browser transactions authoritative — November 21, 2026

- Reproduced a second loss despite an exclusive native lock: A saved/released, then B entered but four localStorage reads still returned the previous empty account. Both UI orders reported completion; reloading both tabs retained only B's trade. The bounded trace stopped at the first failure, round 27.
- Added an authoritative IndexedDB snapshot/revision with atomic readwrite compare-and-swap. Editable UI loads after initialization. Each mutation stages raw-key changes and account/profile/progress memory; durable transaction completion precedes published state, success feedback, draft clearing, and pending-control release. Aborted/denied commits retain prior durable data and drafts. Fixed-price arithmetic, existing raw values/IDs, and version-1 backup format remain intact.
- Migration retains original legacy data. Unknown accessible legacy copies are kept as recovery rows; previous authoritative and malformed original records also have export links. Existing authority wins over stale localStorage on reload. Cache mirroring is best-effort after commit and cannot roll back a successful order or import. Unavailable/corrupt authority fails closed for editing while keeping available data and recovery export readable. Older uncooperating versions remain outside the guarantee; close older tabs before editing and review preserved copies separately.
- Reset/watchlist/quiz, profile/authentication, scoped notes/chat/preferences, and backup replacement use the same staging/commit boundary. Reopened auth presentations keep newer credentials when an earlier request settles; delayed remembered-message failures preserve main/quick drafts. Same-lesson quiz presentation ownership remains intact. Import replaces the authoritative map atomically and preserves unrelated browser data.
- Verification: syntax checks and all **115 tests** passed, including 15 new authority/failure/presentation cases. A real Chromium audit passed 20 checks, including 25 ordered native-lock races with reload and zero missing reported trades, native aborts, withheld completion, stale-cache reload, mirror quota, note merging, and unavailable storage. Independent native checks passed CAS conflict, migration, mirror/abort preservation, malformed recovery export, and auth presentation checks.
- Rotated the shell to `authority` and cached the new loader/store scripts. An independent PWA check verified inert initialization, dynamic startup, cache delivery, offline reload, and additional durable offline trading with no runtime errors. Browser verification used isolated fixed-price fixtures and blocked external requests; no providers/models were called. No dependency, hosted database, hosting configuration, or account service was added. Publication is pending root review.

## Deliver the quiz shell to installed apps — November 21, 2026

- Rotated the shell cache from `safe-saves` to `quiz-presentation` for the quiz follow-up. Network-first fetching and normal waiting/activation remain unchanged; open tabs are not forcibly reloaded and local data is not reset.
- Service-worker syntax and all four PWA regressions passed. A Chromium fixture served the actual `fbc6358` worker and app, then updated to the new shell: the worker waited while the old client retained its unsent draft; after that client closed, activation removed the old shell cache and preserved holdings/history, unrelated data, and unrelated caches. Offline reload delivered the new quiz presentation controls with unchanged account data. No runtime errors or external requests occurred.

## Keep queued quiz feedback with its dialog — November 21, 2026

- Each opened lesson and quiz submission now has a presentation owner. A queued quiz still saves its legitimately submitted progress, but its score/error/cleanup cannot affect a freshly reopened lesson, including the same lesson ID, or release a newer pending submission's controls.
- Submit is disabled only for the current pending submission, and repeated submissions while it waits do not queue duplicate saves. Closing/reopening the lesson creates an enabled, fresh presentation and preserves newer answers when an earlier request finishes.
- Four focused regressions reproduced stale feedback, late errors, duplicate saves, and incorrect control ownership before repair. Syntax checks and all **100 tests** passed. Chromium checks with a native lock held in another tab verified single/double submission, same-lesson reopening, late quota failure, and an older completion while a newer submit remained held. Legitimate old progress and newer answers were preserved; no runtime errors or external requests occurred. No account schema, lesson IDs, lock protocol, or deployment behavior changed.

## Preserve tutor drafts during delayed saves — November 21, 2026

- A tutor send now checks its captured generation and profile after awaiting chat storage, before changing the main input. It clears only the unchanged main draft that was actually submitted. Optional-message and quick-tutor sends preserve the main draft, including edits made while they wait.
- Added five delayed-save regressions for cancellation, profile changes, changed/unchanged main drafts, optional messages, and the quick tutor; all reproduced draft loss before the repair. Syntax checks and all **96 tests** passed. A focused Chromium flow with a controlled delay before the native Web Lock request passed six variants, including an actual second-tab profile signup, without runtime errors or external requests. No account/storage schema, lock-coordination, or deployment behavior changed in this follow-up.

## Preserve paper accounts across concurrent tabs — November 21, 2026

- Started from GitHub main `0073041`, preserving the reviewed tutor/menu Escape priority and all earlier mobile/data repairs. No dependency, storage schema, backup format, paper-price arithmetic, holdings/lesson IDs, or account identity was replaced.
- Reproduced lost saved trades in actual Chromium tabs: two BUY actions both reported completion, but one holding/history entry disappeared in 25 of 30 synchronized runs. A native order confirmation also allowed another tab's completed order to be overwritten.
- Added one origin-wide Web Lock around complete read/confirmation/save transactions and coordinated reset, watchlist, quiz, profile/authentication, migration, backup import/export, and scoped writes with it. Requests retain their submitted actor, account snapshot, symbol/shares, quiz answers, or auth fields; stale requests are visibly refused before changing data. Confirmation is held inside the lock, with another context check before saving. Cancelled, quota-failed, and rejected requests release the lock without applying a stale rollback.
- Kept legacy records readable while migration waits or fails; migration only writes under the shared lock. Notes read the latest scoped records before merging. Chat saves reject an outdated stored conversation, and unloading tabs no longer rewrite old chat histories. Browsers without or denying Web Locks keep data readable/exportable, built-in study/tutor usable, and theme changes available for the current tab; mutation failure preserves data and unsent drafts. Uncoordinated read-only export is explicitly best-effort. Older cached clients and outside scripts are not covered by the coordination guarantee.
- Fixed a real-DOM import-feedback bug: clearing old recovery links after assigning status text erased success/failure/busy messages. The cleanup now precedes the new text. Rotated the PWA shell cache without clearing local data.
- Verification: syntax checks and **91 automated tests passed**, including 16 focused coordination/preservation cases. Rendered Chromium checks passed 30 simultaneous BUY races and 10 SELL races with no missing reported trades, native-confirmation/queued-profile interactions, a delayed-file import competing with order/reset/import/export, quota rollback/retry, unsupported/denied coordination, and usable read-only fallback. No browser runtime errors occurred.
- An actual Chromium service-worker update remained waiting with an old client open, activated after that client closed, removed the previous Turbo shell cache, retained the current cache and unrelated application cache/data, and loaded the updated shell offline with unchanged holdings, cash, and history. Browser checks used isolated fixtures, `LIVE_DATA=false`, and blocked external requests. Physical devices, screen readers, actual providers, GPU inference, and OCR were not exercised. This entry records local verification; no hosting deployment was performed by this pass.

## Current-bar validation and mobile repairs — November 21, 2026

- Started from GitHub main `4f2b74e`. Kept paper-trading prices, storage schemas, holdings, saved lesson IDs, local profiles, and provider-quote display intact.
- A current quote timestamp no longer permits a 30-minute scenario based on stale intraday bars. Scenarios also require chronological, distinct valid bar times; stale, missing, invalid, and future history is covered by HTTP regressions. Closed-session quotes remain visible with their provider timestamp, while the scenario stays unavailable. Numeric-string timestamps still work after normalization.
- Repaired reproduced phone overflow in the backup file picker and page-width preview controls. At widths of 360 pixels or less, account metrics use one column so currency values remain readable. The phone theme control now has a 44-pixel width.
- Added Escape dismissal and focus return for the quick tutor; the close button also returns focus to its launcher without clearing the draft. Corrected the launcher's dark text on a dark blue background in light mode. Rotated the PWA shell cache and verified that activation removes the previous cache while retaining the current one.
- Verification: `npm run check` passed; `npm test` passed **74 tests, 0 failures**. The stale-bar and quick-tutor regressions were reproduced before their repairs. Rendered Chromium checks exercised confirmed fractional buy/sell orders, cash/holdings/history persistence after reload, quick-tutor Escape/close and draft retention, and light-theme persistence. All 10 sections fit 320, 390, 768, and 1440 pixel viewports without horizontal page overflow; the narrow portfolio retained intact currency values. No browser runtime errors occurred.
- Browser checks used `LIVE_DATA=false` and blocked external requests. Actual provider feeds, installed-PWA updates, screen readers, model downloads/inference, and OCR were not tested. No dependency was added and no hosting deployment was performed in this pass.

## Search and dialog improvements — November 16, 2026

- Started from GitHub main `2d0dfb8`, preserving v0's current briefing/retry handling and canonical-path offline cache repair. No dependencies, storage schema, paper-trading arithmetic, lesson IDs, or authentication behavior were changed.
- Added a 44-pixel search-clear button, result-count announcements, useful empty-result help, lesson-description matching, and Enter-to-open. Stock/page results move focus into the destination; lesson results retain dialog focus.
- Replaced delayed modal focus observers with synchronous opener capture. Escape closes only the active dialog, returns focus, and preserves unrelated dialogs; body scrolling pauses until dialogs close. Existing Tab wrapping remains.
- Changed only the PWA shell cache name so the new shell has a separate cache. API/external-data bypass and v0's current-cache/canonical-path fallback remain intact.
- Verification: `npm ci` installed 74 packages and reported **0 audit findings**. `npm run check` passed; `npm test` passed **70 tests, 0 failures**, including added search/focus/dialog cases and existing trading, storage-failure, profile-isolation, backup, provider-failure and PWA simulations. Frontend tests use a simulated DOM; PWA tests use a simulated worker.
- Separate rendered Chrome checks at localhost:3103: stock Enter navigation → Markets with main-content focus; arrow-key lesson selection → Stocks 101; Shift+Tab wraps to Submit Quiz; Escape closes the lesson; daily-update unavailable-data display; return to its actual opener; clear-search query/focus reset; sign-in dialog Escape/focus recovery. The 390 × 844 viewport showed contained search results with a 44-pixel clear button. Screenshot: `TurboStocks-mobile-search-2026-11-16.jpg` in workspace outputs.
- The local browser check used `LIVE_DATA=false`. Live-provider responses, physical phones/tablets, screen-reader speech, installed PWA offline/update lifecycle, model inference, and OCR downloads were not tested in this pass. No hosting project was created or manually deployed; publication is through the existing GitHub repository.

## Compatible dependency patches — October 28, 2026
- Updated only the locked transitive packages `body-parser` 1.20.8 → 1.20.9 and `qs` 6.16.0 → 6.16.2 within the existing dependency constraints. These resolve the [body-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828) and [qs advisory](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw). No dependency was added and the application version remains 1.6.1.
- Started from current GitHub main `0bf38e0` and preserved v0's current-cache/canonical-path offline query-string repair. No UI, trading, authentication, storage, or provider code changed.
- Empty-cache `npm ci` passed and reported **0 npm audit findings**. `npm run check` passed and **66 tests passed, 0 failures**. No new rendered-browser or real-device verification was performed for this dependency-only pass.

## Dependency installation repair — October 27, 2026
- Fixed the exact Vercel npm E404: a broad application-version replacement had incorrectly changed the locked `mime` version and `send` dependency requirement to nonexistent `mime@1.6.1`. Restored the published `mime@1.6.0` version, tarball URL, and dependency requirement; the application remains version 1.6.1.
- Added a regression check comparing every installed dependency's version and requirements with the lockfile. It failed against the corrupted lockfile even when npm reused a cached tarball, then passed after the repair.
- Verified `npm install` and `npm ci` using separate empty caches, syntax checks, and **65 tests, 0 failures**. npm's audit still reports two existing dependency findings (one moderate, one high); these did not cause the installation failure.

## Release 1.6.1 — dimensional homepage showcase
- Added a dimensional chart-study illustration to the learning-first hero with perspective, layered lesson and practice cards, orbit lighting, and a chart labeled as illustrative rather than market data.
- Kept the existing Learn, Analyze, Practice, and Review shortcuts as real buttons into working sections; adjusted the stage at tablet and phone breakpoints. No autoplay or continuous motion was added; the scene remains static under reduced-motion settings.
- Verified visually in Chrome at desktop and narrow viewport widths. Clicked Analyze and confirmed it opened Markets. Automated frontend checks cover truthful labels, responsive styling, reduced-motion support, and real route actions.
- Verification on October 27, 2026: `npm run check` passed; `npm test` passed with **64 tests, 0 failures**.

## Release 1.6.0 — learning-first product and brand refresh
- Rebuilt the home hero around the actual Learn → Analyze → Practice → Review workflow. Four clickable preview tiles open the real lessons, market tools, paper portfolio, and review sections; the primary CTA opens existing learning paths.
- Reworked app palette, typography hierarchy, card surfaces, spacing, and responsive hero layout while retaining dark/light theme, existing icon family, saved data, and financial caveats. Added small hover feedback with reduced-motion support.
- Added an original matching vector mark/favicon and cached it in the PWA shell.
- Created an editable brand sheet, logo variants, landscape/portrait promo artwork, and concise launch copy under the workspace outputs folder.
- Verification on October 27, 2026: `npm run check` passed; `npm test` passed with **63 tests, 0 failures**. Rendered the home page in Chrome at the local preview and confirmed the learning workflow, market update, sample account, and navigation are present.

## Release 1.5.6 — sign-in feedback and market-data status
- Added accessible show/hide controls for local demo passwords. Password fields clear when the sign-in dialog closes; submit buttons announce and display the active sign-in or profile-creation state.
- The market briefing now reports quote and headline availability separately, so a successful headlines request cannot imply that quotes also loaded.
- Clarified that the multi-window mover scenario is unbacktested, and retained the stale/short-history suppression. Local demo profiles remain browser-only; no cloud account or cross-device sync is implemented.
- Verification on October 27, 2026: `npm run check` passed; `npm test` passed with **63 tests, 0 failures**, including local auth progress/password visibility and independent quote/news failure states.

## Release 1.5.5 — cautious mover estimate
- Replaced one-window straight-line extrapolation with a heavily dampened blend of 5-, 15-, and 30-minute returns. The estimate shrinks further when windows disagree and caps the center move at half of recent 30-minute volatility.
- Corrected volatility scaling to use elapsed minutes, and calculate the illustrative interval with compounded returns. The briefing now displays the estimated dollar and percentage move and percentage/dollar interval, plus simple time-window agreement.
- This is a heuristic without historical backtesting. No accuracy improvement is claimed; provider freshness/coverage limits still apply. Paper trading remains separate fixed sample data.
- Verification on October 26, 2026: `npm run check` passed; `npm test` passed with **61 tests, 0 failures**. Coverage includes positive and negative estimates, estimated percentage output, the recent-volatility range, and stale-quote fallback.

## Daily market briefing — October 25, 2026
- Added an on-demand home-page market update card and dialog with provider headlines, tracked-company movers, and a plain-language snapshot.
- Shows source names, quote times, provider errors, and the limited scope of tracked companies; renders provider text safely and keeps these data separate from fixed paper-trading prices.
- Updated the service worker shell cache identifier.
- Verification on October 25, 2026: `npm run check` passed; full `npm test` passed with **59 tests, 0 failures**, including the daily-briefing UI contract test.

## Estimated top-mover amounts — October 26, 2026
- The briefing now shows the provider-based dollar and percentage change since the previous close, plus the previous-close value and quote timestamp. This is an arithmetic estimate from provider data, not a forecast; simulator prices remain fixed samples.

## 30-minute directional scenario — October 26, 2026
- When quote history is fresh and has enough one-minute bars, the briefing adds a dampened continuation scenario and a recent-volatility range for the next 30 minutes. Outside fresh intraday quote conditions it says the estimate is unavailable. This heuristic has not been backtested and is not evidence of improved forecasting accuracy.
- Verification on October 26, 2026: `npm run check` passed; `npm test` passed with **60 tests, 0 failures**, including a fresh-quote estimate and stale-quote fallback check.

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

