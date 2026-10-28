# memescope — meme-coin intelligence (Solana MVP)

Discovers trending Solana tokens from public APIs, stores timestamped snapshots, runs explainable
risk checks, computes three separate heuristic scores (opportunity, risk, data confidence) with
eligibility gates, and sends configurable alerts (in-app, browser push; Telegram/Discord/email
adapters). Dark, data-dense terminal UI. No automated trading.

Plan, architecture, provider comparison, assumptions, costs and roadmap: [`docs/PLAN.md`](docs/PLAN.md).
Live coverage matrix, provider health, quotas and measured latency: **`/coverage`** in the app.

---

## 1. Quick start

Requirements: Node 20+ (tested on 22.19), npm. Docker only for the PostgreSQL path.

### Path A — PostgreSQL (recommended; web + worker as separate processes)

```bash
npm install
cp .env.example .env                      # defaults already point at the compose database (port 5433)
docker compose up -d                      # postgres:16 on localhost:5433, user/pass/db = memecoin
npm run db:migrate
npm run dev                               # web UI on http://localhost:3000
npm run worker                            # second terminal: discovery / refresh / security / alerts / deliveries
```

### Path B — zero dependencies (embedded PGlite, worker inside the web process)

```bash
npm install
cp .env.example .env
# in .env: leave DATABASE_URL empty  -> uses ./data/pglite ; WORKER_MODE is forced to inprocess
npm run dev
```

PGlite is single-process, so the scheduler runs inside Next.js. Do not run `npm run worker` in this mode.

Within ~90 s the screener fills from live providers (no API keys needed). The first security
pass for a token lands a few minutes later; until then its essential checks read **Unknown** and the
token is **gated**, never green.

### Demo mode (fixtures, no network)

```bash
# .env: DEMO_MODE=true  (worker disabled, UI banners everywhere)
npm run db:seed-demo
npm run dev
```

Seeds six clearly labelled tokens (`Demo: …`, addresses starting with `Demo`, every source recorded as
`demo fixture`) covering a clean eligible token, an active mint authority, a 9-minute-old bonding-curve
launch with no security report, a liquidity-removal rug with no sell route, a holder-concentration case
and a sparse-data/outage case. Scores and alerts are produced by the real engines. Do not seed the demo
into a live database; the two datasets would be mixed in the screener.

---

## 2. Configuration (`.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://memecoin:memecoin@localhost:5433/memecoin` | Empty or `pglite://<dir>` → embedded PGlite |
| `WORKER_MODE` | `separate` | `inprocess` runs the scheduler inside Next.js (forced for PGlite) |
| `DISCOVERY_INTERVAL_SEC` / `REFRESH_INTERVAL_SEC` / `SECURITY_INTERVAL_SEC` | `90` / `45` / `600` | Lower values spend provider quota faster |
| `HOT_TOKEN_LIMIT` | `200` | Tokens refreshed every cycle: launches < 15 min old first, then highest 1h volume. Others go to the cold lane (60 per cycle, each ≤ every 10 min) |
| `APP_PASSWORD` | empty | When set, every page and API route requires login (signed cookie). Empty = unauthenticated (localhost use only) |
| `SESSION_SECRET` | — | Long random string; required when `APP_PASSWORD` is set |
| `APP_URL` | `http://localhost:3000` | Used for links inside alerts |
| `SOLANA_RPC_URL` | public mainnet | **Set a Helius/QuickNode/Triton URL** for reliable holder data (see §7) |
| `PROVIDER_*_ENABLED` | `true` | Disable a provider entirely |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | empty | Browser push. Generate with `npm run push:keys` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | empty | Telegram adapter |
| `DISCORD_WEBHOOK_URL` | empty | Discord adapter |
| `SMTP_*` / `ALERT_EMAIL_TO` | empty | Email adapter |
| `DEMO_MODE` | `false` | Disables the worker and labels all data as fixtures |

Unconfigured channels are shown as "not configured" in Settings and deliveries to them are recorded as
`skipped`, never silently dropped. Secrets stay server-side; the browser only receives the VAPID public key.

---

## 3. Running in production

Two processes share one PostgreSQL database:

```bash
npm run build
npm run start          # web (Next.js), e.g. behind a reverse proxy with TLS
npm run worker         # long-running worker; restart-safe (job state, alert state and delivery queue live in the DB)
```

- Set `APP_PASSWORD`, `SESSION_SECRET`, `APP_URL` (public URL), `SOLANA_RPC_URL`, VAPID keys.
- Browser push requires HTTPS (or localhost). The service worker is `public/sw.js`.
- Horizontal scaling of the worker is not supported yet (single scheduler; see Deferred).
- Fly.io / Railway / Render: one web service + one worker service + managed Postgres. Estimated cost in `docs/PLAN.md §5`.

---

## 4. What is implemented

**Discovery & ingestion** (`src/server/providers`, `src/server/ingest`)
- Jupiter Tokens v2 (recent, trending, organic), DexScreener (token pairs, batch stats, boosts), GeckoTerminal (new/trending pools, OHLCV, trades), Solana JSON-RPC (mint, Token-2022 extensions, supply, holders), RugCheck (optional, degrades to Unknown).
- Token identity is always `chain + mint address`. Pools are deduplicated across providers; volume/transactions are summed across distinct pools exactly once, price/market cap come from the deepest pool, and token-level and pool-level numbers are never added together. Exactly one primary pool per token.
- Every snapshot carries per-field `source` and `observedAt`, plus `ingestedAt`. Lifecycle stage (bonding curve → graduated → pool) is derived from provider attribution.
- Per-provider sliding-window rate limiters with minimum spacing and adaptive widening after any 429, exponential back-off, per-method circuit breaker for RPC, provider health and quota recorded to the DB.
- Hot/cold refresh lanes; watchlisted and alert-scoped tokens are always refreshed.

**Risk engine** (`src/server/chains/solana.ts`, `src/server/risk/engine.ts`)
Mint authority, freeze authority, Token-2022 extensions (permanent delegate, transfer fee/hook, non-transferable, default frozen, mint close authority, confidential transfers, mutable metadata), holder concentration, creator holdings and launch history, liquidity model (bonding curve / AMM / CLMM / DLMM / unrecognised), LP lock/burn (RugCheck), sell-route probe via quote simulation, paid-promotion flag, behavioural findings (liquidity removal, suspected wash/bot volume, creator sells). Each finding records what was observed, why it matters, severity, source + timestamp, limitations, and whether it was **observed**, **inferred** or **unknown**. A failed quote is reported as "no route found (inferred)", not as a honeypot; a lock is never described as safety.

**Scoring** (`src/server/scoring`, rules `v1.0.0` in `rules.v1.ts`)
Three independent scores with factor-level breakdowns. Cohorts = chain · age bucket · liquidity bucket · lifecycle stage. Gates: critical finding, unknown essential security check (mint/freeze authority), no sell route, liquidity unknown or below floor, risk > 75, confidence < 40. Unknown checks add zero risk points, lower confidence and block eligibility. Sparse market data (< 40 % of core metrics) scales confidence down so a fresh timestamp cannot compensate for a provider outage. Labels use "momentum" and "risk" language only.

**Alerts** (`src/server/alerts`)
Rules with metric/event conditions, scope (all + optional pre-filter / watchlist / single token), persistence window, cooldown, severity, channels. Fingerprint de-duplication (rule + token + hour + coarse metric buckets), state in the DB so it survives restarts. Deliveries are queued with retry/back-off (max 5 attempts) per channel; in-app via SSE with polling fallback; browser push via Web Push; Telegram, Discord, SMTP adapters. Five editable example rules, labelled illustrative.

**UI** (`src/app`, `src/components`)
Screener (sortable, configurable columns, presets, saved filters, URL-synced filters, keyboard navigation, price flashes, stale rows dimmed), token detail (score breakdowns, market windows with per-field source tooltips, candle + volume chart with SMA/EMA/RSI, risk evidence panel, holders, pools and liquidity history, trades, events), watchlist with notes, alert history and rule editor, settings (channels, push subscription, defaults, quiet hours, reduced motion), coverage/status page, validation page, login. Loading/empty/error/offline/stale states; dark high-contrast palette; reduced-motion support.

**Validation** (`src/server/validation/paper.ts`)
Forward paper tracking of eligible tokens: entry at observed price with fee + price-impact haircut, exit marks at 1h/6h/24h, failed-exit and collapse accounting, cohort summaries. Kept separate from the scoring heuristics; the UI states that this is not a backtest and carries survivorship/look-ahead caveats.

**Operations**
`/api/health`, `/api/status` (jobs, provider health, quotas, circuits, coverage matrix), structured logs, DB-backed job records, measured observed→ingested latency.

---

## 5. Measured behaviour (this machine, 2026-10-27, keyless providers)

| Item | Measured |
| --- | --- |
| Discovery cycle | ~190 candidates per run, 13–25 s |
| Hot-lane refresh (200 hot + watchlisted/alert-scoped + 60 cold ≈ 260 tokens) | 7–20 s per 45 s cycle; median observed→ingested 1.9–2.5 s |
| Freshness (≈2,000 tracked tokens) | hot lane: median 7 s, p90 8 s since last refresh; cold lane: median ≈ 10 min, max ≈ 24 min |
| Security pass | 25 tokens per ~60–75 s cycle (bounded by Jupiter quote pacing + RPC); pinned/hot tokens first |
| Jupiter lite-api | true limit ≈ 5 req per sliding 10 s per IP (all endpoints). At 2.1 s spacing: 99.8 % OK over 25 min (1 × 429, absorbed by adaptive back-off), p50 ≈ 110 ms |
| DexScreener | 100 % OK, p50 ≈ 65–350 ms |
| GeckoTerminal | ≈ 97–100 % OK at ≤ 25 req/min (occasional timeout), p50 ≈ 110–150 ms |
| Public Solana RPC | `getAccountInfo`/`getTokenSupply` fine; `getTokenLargestAccounts` always 429 → holder concentration reads Unknown unless `SOLANA_RPC_URL` is a paid endpoint |
| RugCheck | unreachable from this network (firewall); adapter unverified, degrades to Unknown |

Achievable refresh targets with free tiers: hot tokens every 45 s, cold tokens every ~10–20 min,
security re-check for hot tokens roughly every 10 min, OHLCV on demand with a 2-minute cache.

---

## 6. Tests

```bash
npm run typecheck     # clean
npm test              # vitest, PGlite in-memory DB
```

Last run: **6 files, 34 tests, all passing** (`npx vitest run`, ~4 s).

| File | Covers |
| --- | --- |
| `tests/identity.test.ts` | chain+address identity, EVM lowercasing vs Solana case-sensitivity, pool dedup across providers, volume summed once, price from deepest pool, foreign-mint pools ignored, null (not zero) aggregates |
| `tests/pools.test.ts` | provider dex-id → pool model mapping, exactly one primary pool across batches, known type never overwritten by unknown |
| `tests/scoring.test.ts` | eligibility gates, momentum never overriding critical risk, missing essential checks read Unknown and gate, risk points/caps, cohort id, cohort-relative momentum, missing factors reported not zeroed |
| `tests/stale-data.test.ts` | stale snapshot lowers confidence, stale security report flagged, provider outage → low completeness + gated, unknown metrics never satisfy a condition, UI staleness labels |
| `tests/alerts.test.ts` | fire once, in-app delivery, cooldown, fingerprint dedup, persistence window and reset, unknown metric never fires, watchlist scope, delivery retry/back-off/max attempts, skipped unconfigured channels |
| `tests/watchlist.test.ts` | items and notes survive closing/reopening the database; idempotent per token |

Main journeys were exercised end to end against live data (track → detail → watchlist → rule → alert with
delivery and link) via the API and in a headless browser (all pages render without console errors).

`npm run build` succeeds (24 routes, all dynamic).

---

## 7. Remaining dependencies on credentials or paid data

| Need | Why | Without it |
| --- | --- | --- |
| Paid Solana RPC (`SOLANA_RPC_URL`: Helius, QuickNode, Triton) | `getTokenLargestAccounts` is throttled on the public endpoint | Holder concentration from RPC reads Unknown; Jupiter's top-holder % is used when present and labelled as an aggregator figure |
| RugCheck reachability | LP lock %, insider graph, risk list | `lp_lock` and insider findings read Unknown |
| VAPID keys (`npm run push:keys`) | Browser push | Push channel shows "not configured"; in-app alerts still work |
| Telegram bot token + chat id, Discord webhook, SMTP | External channels | Deliveries recorded as `skipped` |
| Helius DAS / Enhanced Transactions (free key) | Exact holder counts, creator transaction history | Holder count is Jupiter's estimate; creator history is Jupiter's `devMints` count |
| Birdeye / GeckoTerminal paid tier | Higher candle/trade quotas | 30 req/min candles, cached 2 min |

---

## 8. Deferred (not in this MVP)

- **EVM chains (Base, Ethereum, BNB)**: `ChainAdapter` interface and `chain` column exist; no EVM adapter (ownership/proxy/tax/blacklist/honeypot simulation) yet.
- **RugCheck end-to-end verification** (network-blocked here).
- **Helius holder enumeration and creator transaction history**; **Birdeye**.
- **Redis/BullMQ** and multi-worker scaling (current scheduler and delivery queue are PostgreSQL-backed, single worker).
- **Multi-user accounts** (single-operator password gate today; `users` table is in place).
- **Historical replay / calibration** of cohorts from paper-tracking outcomes (needs accumulated data).
- **Social metrics** (no social API configured).
- **Order-book venues** (Manifest, OpenBook) are detected but their liquidity model is reported as unrecognised.

---

## 9. Project layout

```
src/app/                 Next.js App Router pages + API routes (/api/*)
src/components/          UI (screener, token panels, alerts, shell, primitives)
src/lib/                 client helpers (formatting, hooks, API client, indicators)
src/server/providers/    provider adapters, rate limiter, health
src/server/chains/       chain adapters (solana.ts; types for EVM)
src/server/ingest/       identity, normalization, discovery, refresh lanes, security runner, repo
src/server/risk/         behavioural findings + merge
src/server/scoring/      rules.v1.ts (all thresholds), score.ts, run.ts
src/server/alerts/       metrics, evaluate, deliver, examples, schemas, SSE bus
src/server/validation/   paper tracking
src/server/db/           Drizzle schema, client (pg / PGlite), migrations runner
src/worker/              scheduler + entrypoint (npm run worker, worker:once)
drizzle/                 SQL migrations
scripts/                 generate-vapid.ts, seed-demo.ts
tests/                   vitest suites + helpers
docs/PLAN.md             plan, architecture, provider comparison, costs, roadmap
```

## 10. Important behaviours to know

- Nothing is ever shown green by default. Missing, stale or unsupported checks are **Unknown** and reduce confidence.
- Scores are versioned heuristics (`rulesVersion` stored with every score). They are not probabilities and the UI never phrases them as such.
- Alerts are evaluated by the worker after every refresh and survive restarts; cooldown and fingerprint state live in `alert_rule_state`.
- Manual "Refresh" on a token page is rate-limited to once per 30 s per token and reuses the same ingestion/scoring path as the worker.
