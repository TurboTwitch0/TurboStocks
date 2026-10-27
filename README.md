# Turbo Stocks 1.5.5

Turbo Stocks is a financial education and paper-trading application. Paper trades use fixed educational sample prices; they do not access a brokerage or use market-provider prices. Existing lessons and saved lesson IDs, branding, themes, charts, news study tools, community tools, OCR, and the optional on-device tutor are retained.

## Run in VS Code

1. Install [Node.js 20 or later](https://nodejs.org/) and [Visual Studio Code](https://code.visualstudio.com/).
2. Extract the ZIP and open the `TurboStocks` folder in VS Code with **File → Open Folder**.
3. Choose **Terminal → New Terminal** and run:

   ```sh
   npm ci
   npm run check
   npm test
   npm start
   ```

4. Open `http://localhost:3000` in a browser. Stop the server with **Ctrl+C** in the terminal.

Do not open `public/index.html` by double-clicking it: the server is needed for API requests, Web Crypto, and service-worker registration. `npm ci` installs the dependencies listed in the lockfile. The ZIP intentionally does not contain `node_modules` or secrets.

## Use the app

- The responsive layout now has a compact phone dashboard, four simulated-account metrics, a five-item bottom bar, and a “More” menu for Trending, News, Tutor, Community Pulse, and tools. The phone header keeps search, theme, and profile controls on separate, reachable rows. Tablet and desktop keep their wider layouts.

- The home-page **Daily market update** opens on demand and shows recent news headlines with source links, a timestamped top-mover snapshot, and a limited-sample summary. Movers include observed dollar and percentage change since provider-reported previous close and, when fresh intraday bars are available, a cautious 30-minute scenario blending 5-, 15-, and 30-minute direction. It shows an estimated dollar and percent move plus an illustrative recent-volatility range. This heuristic is not backtested and does not establish forecast accuracy; paper-trading prices remain separate fixed samples.

- Search company symbols and open a stock detail view. Sort the watchlist by saved order, symbol, sample price, or sample change. Stock details can prepare a paper order for review.
- Place fractional paper orders after reviewing estimated cost/proceeds, buying power, and (for sales) realized P/L. Position prices are fixed samples; no fees, spreads, slippage, market hours, short selling, or real execution are modeled.
- Review positions, cost basis, realized and unrealized P/L, and filter trade history by symbol, side, and date range. CSV export includes only matching trades and neutralizes spreadsheet formula cells.
- Export a private browser backup from **Portfolio → Trade history**. Import accepts Turbo Stocks format version 1 JSON up to 10 MB, validates it, displays the replacement scope, and asks before replacing Turbo Stocks browser data. Keep backups private because they can contain local profile names, email addresses, password hashes, trades, and progress.
- Demo profiles and all app data remain in the current browser's local storage. They are not secure online accounts and do not sync. Switching devices, browser profiles, or site origins does not move data. Sign out before sharing a device.
- Portfolio now explains cost basis, realized/unrealized profit or loss, and a cash-inclusive allocation. Paper return is not shown because the app does not record complete starting capital and cash flows.
- Academy paths provide suggested next lessons while retaining existing lesson progress. Search lessons by topic. Quiz results include the correct answer and an explanation.
- Tutor replies show whether they came from the built-in guide, an optional local model, retrieved headlines, or a calculated paper snapshot. Cancel a slow response and retry. Headline text is untrusted; OCR reads text and does not understand chart images.
- Embedded TradingView charts are external. If they fail or take too long, the app displays a recovery message while fixed-price paper trading remains available.

## Tests and checks

Run `npm run check` for JavaScript syntax checks and `npm test` for automated tests. The tests cover paper arithmetic and reconciliation, fractions, validation, blocked/quota storage behavior, profiles and stale tabs, tutor/provider failure handling, backup import, navigation and inline handlers, mobile navigation markup and responsive rules, server routes/provider errors/rate limits, the Netlify function adapter, the Vercel Express entry point, and simulated service-worker cache rules. See [CHANGES-AND-TESTS.md](CHANGES-AND-TESTS.md) for the latest exact result.

The frontend tests use a minimal simulated DOM; they are not visual browser tests. Service-worker checks use a simulated worker. Server-route tests use an actual local HTTP server and the complete 61-test suite passes. The mover scenario is an unbacktested heuristic, not a validated forecast. Rendered-browser layouts, a real Netlify deployment, installed PWA lifecycle, GPU model inference, and OCR download were not verified in this release. See [CHANGES-AND-TESTS.md](CHANGES-AND-TESTS.md) for exact results and limitations.

## Deploy on Vercel from GitHub (when you are ready)

The Vercel entry point and configuration are included. The GitHub project is [TurboTwitch0/TurboStocks](https://github.com/TurboTwitch0/TurboStocks), and its production site is [turbostocks.vercel.app](https://turbostocks.vercel.app). Vercel's Express integration detects the root [`index.js`](index.js), which imports Express and exports the existing application. Vercel runs it as a serverless Express function; frontend files in `public/` are served by Vercel as static assets. The `/api/...` URLs in the frontend remain unchanged. Vercel's current Express guide notes that `express.static()` does not serve deployed assets, so keep the site's assets under `public/`.

1. Extract the ZIP and open the extracted project folder in VS Code. Push the extracted files at the repository root: Vercel does not extract an uploaded ZIP. In **Source Control**, choose **Initialize Repository**, commit the project, and select **Publish to GitHub**. Or push the project to a GitHub repository you already own. Do not publish personal backups, `.env` files, or `node_modules`; the included `.gitignore` excludes these and `.vercel/`.
2. In Vercel, select **Add New → Project**, connect GitHub if prompted, and **Import** this repository. Use the project root as the Root Directory. `vercel.json` explicitly selects Express, including for projects previously configured as static sites; leave Build Command and Output Directory at their defaults. The included `package-lock.json` lets Vercel install the dependencies. No API keys are required for deployment.
3. Select **Deploy**. Vercel creates preview deployments for other branch pushes and deploys the configured production branch (typically `main`). A push to GitHub triggers a new deployment. Check Vercel's build log, then open the deployment URL.
4. Verify the homepage and these routes: `/health`, `/api/search?q=education`, and `/api/trending-stocks`. Provider endpoints can fail when upstream services are unavailable; paper trading uses separate fixed educational sample prices. Optionally set `LIVE_DATA=false` in Vercel Project Settings → Environment Variables to disable backend news and provider quote requests, then redeploy.

The Express app is one serverless function with a 30-second configured maximum. External requests abort after 8 seconds. In-memory provider caches, pending-request coalescing, and request counters are per-instance and best-effort: serverless cold starts and multiple instances do not share them, so they are not durable caching or strong abuse protection. Profiles and trading data remain in each browser's local storage and do not sync between devices. The configuration also applies security headers to static assets and prevents stale service-worker scripts from being cached by the browser.

To run Vercel's local development environment, install the Vercel CLI (`npm install --global vercel`) and run `vercel dev` from the project folder. The ordinary local app still starts with `npm start`.

Review Vercel's current [Express deployment guide](https://vercel.com/docs/frameworks/backend/express), [Git deployments](https://vercel.com/docs/git), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), and [Function duration limits](https://vercel.com/docs/functions/configuring-functions/duration) before changing hosting settings.

## Deploy on Netlify (when you are ready)

Deployment files are prepared; this project has **not** been published.

1. In VS Code, open **Source Control**, choose **Initialize Repository**, then commit the extracted project folder. Create a private GitHub repository and use **Publish to GitHub**. Do not commit personal backups, `.env` files, or `node_modules`.
2. Sign in to Netlify, select **Add new site → Import an existing project**, connect GitHub, and select that repository. The included [`netlify.toml`](netlify.toml) sets the publish directory to `public`, the Functions directory to `netlify/functions`, and rewrites existing `/api/...` URLs to the Express function. No frontend URL changes are needed.
3. Keep the build command blank. The included `netlify.toml` supplies the `public` publish directory and function settings. Set Node.js 20 or later for the runtime if Netlify offers a version setting. Choose **Deploy site** and check the deploy log for successful function bundling.
4. Open the assigned HTTPS site URL and verify the pages, `/api/search?q=education`, and `/api/trending-stocks`. Provider requests may fail; the app must still leave sample-price paper trading usable. Set `LIVE_DATA=false` in the site's **environment variables** if you want to disable server news/quote routes, then redeploy. Netlify configuration-file variables are not exposed to Functions, so set that value in the Netlify UI instead.

To check the Netlify rewrite and Functions locally before connecting a site, install the Netlify CLI in a terminal with `npm install --global netlify-cli`, then run `netlify dev` in the project folder. Netlify documents this as the local environment that applies redirects and serves Functions. This project does not bundle the CLI as a runtime dependency.

The Express adapter uses `serverless-http`. Netlify synchronous functions have a 60-second execution limit and a 6 MB buffered request/response limit under current defaults. Provider fetches abort after 8 seconds. The app's in-memory news/quote caches, pending-request coalescing, and basic rate counter are instance-local and best-effort: they reset on cold starts, and do not provide shared cache or reliable abuse prevention across concurrent instances. Netlify's function runtime serves API requests; the Netlify CDN serves static assets. Review Netlify's current [Express deployment guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/), [Function configuration](https://docs.netlify.com/build/functions/configuration/), and [environment-variable guidance](https://docs.netlify.com/build/functions/environment-variables/) before deployment because hosting defaults can change.

## AI, news, and data boundaries

- The built-in tutor's lesson/rule responses work without paid APIs, keys, or credits. The optional Qwen local model uses WebLLM on compatible WebGPU devices and needs a one-time model download and sufficient GPU memory; downloads and inference can fail or be unavailable. Model text is generated, not sourced financial advice. Answer labels distinguish built-in guidance, local generation, linked news, and local paper calculations.
- Current-news queries use Google News RSS through the backend and display links for the learner to inspect. Search results are untrusted excerpts, not verified facts. They do not provide current prices or predictions.
- The quote endpoint is an experimental unofficial Yahoo Finance integration and not a supported market-data contract. Its commercial-use permission has not been established. TradingView widgets use their own external data. These external sources remain separate from the fixed paper-trading sample prices.
- Image study extracts text with OCR only. It does not interpret candlestick shapes or understand images.
- The app's local demo profiles are not backend accounts. Secure accounts and cross-device synchronization are not implemented.

## Prioritized roadmap after release one

| Priority | Feature and benefit | Dependencies | Complexity | Security and cost |
| --- | --- | --- | --- | --- |
| 1 | Portfolio concentration explanations that surface shared exposures | Holding metadata, clear grouping rules, and a reviewed mapping | Medium | Explain assumptions and avoid implying diversification removes risk; no service cost with curated local data |
| 2 | Trading journal for recording a thesis and reviewing outcomes | Local schema, backup migration, optional links to paper trades | Medium | Journals may contain sensitive reflections; local storage is not encrypted by default; no service cost if local-only |
| 3 | Company comparisons using sourced, comparable information | Permitted data source, aligned reporting periods/currencies, citations and update dates | High | Attribution and source quality need review; likely recurring data/API cost |
| 4 | Secure backend accounts and cross-device synchronization | Identity provider, database, migrations, recovery, privacy and deployment design | High | Requires authorization, secure sessions, encryption, retention and incident response; recurring infrastructure costs |
| 5 | Documented, permitted market/news sources | Provider due diligence, source labels, attribution, limits and monitoring | Medium–High | License and commercial-use review; recurring provider or usage costs may apply |



