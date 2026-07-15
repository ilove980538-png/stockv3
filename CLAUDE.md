# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

StockOS v2 (「謝先生投資中心」) — a personal US-stock portfolio dashboard deployed on Vercel. It tracks holdings/cash for two accounts (`my` 我的 and `dad` 爸爸的), a watchlist, a curated stock scoring table, and AI-generated analysis/advice powered by the Anthropic API.

There is no build system, no package.json, no tests, and no linter. The frontend is a single self-contained HTML file (inline CSS + vanilla JS); the backend is two Vercel serverless functions. Changes ship by pushing to `main`, which Vercel deploys.

## Commands

- **Local dev with working API routes:** `vercel dev` (requires `CLAUDE_API_KEY` and `SUPABASE_ANON_KEY` env vars, set in the Vercel dashboard in production).
- **Frontend-only preview:** open `public/index.html` in a browser — Finnhub calls work (key is hardcoded client-side), but `/api/*` calls fail.
- There is nothing to build, lint, or test.

## Layout and routing

`vercel.json` defines all routing:

- `/api/claude` → `api/claude.js` — proxies `POST` bodies (`{model, max_tokens, messages}`) to the Anthropic Messages API, injecting `CLAUDE_API_KEY` server-side so the key never reaches the browser. `maxDuration: 60`.
- `/api/sync` → `api/sync.js` — persists the whole portfolio as a single row (`id='main'`) in a Supabase `portfolio` table via its REST API (`GET` reads, `POST` does a PATCH upsert). Uses `SUPABASE_ANON_KEY`. `maxDuration: 10`.
- Everything else → `/public/*`, so `public/index.html` is the app that users actually see.

### ⚠️ Duplicate/stale files — know which copy is live

- **`api/index.html` is NOT served** (Vercel treats `api/` as functions only), yet it is the *newer* frontend variant: it adds Supabase cloud sync (`cloudSave`/`cloudLoad`/`SYNC_ENABLED`, debounced 1.5s save inside `persist()`). The served `public/index.html` has **no** `/api/sync` calls — its state lives only in `localStorage`. When editing the frontend, edit `public/index.html`; be aware the two copies have diverged (~1863 vs ~1918 lines) and reconciling them (porting sync into `public/`) may be the actual intent behind a request.
- **`claude.js` at the repo root is a legacy duplicate** of `api/claude.js` and is not routed to. Don't edit it expecting effect.

## Frontend architecture (`public/index.html`)

One `<script>` block at the bottom of the file contains the entire app. Key regions, in order:

- **Config:** `FKEY` (Finnhub API key, hardcoded), `CKEY` (empty — Claude key is server-side), `CMODEL`, `APP_VER`. Bump `APP_VER` when making user-visible changes; it is displayed in AI output.
- **`SCORE_DB`:** a hand-maintained static array of ~70 stocks with scores (`buy`/`rep`/`fut` 1–5 stars), analyst targets, and zh-TW notes, grouped by the 17 `SECTORS` codes (SC, WF, PK, …). This is data, not fetched — updating scores means editing this array.
- **State:** global `S` object seeded from `DEFAULT_*` constants on first load, then persisted to `localStorage` under `sv2_*` keys (see `K`) via `persist()`. `S.quotes` is the in-memory quote cache. Custom score-table columns live in `sos_customcols`/`sos_customdata`.
- **Market data:** `getQ`/`getCandles`/`getNews` hit Finnhub directly from the browser. Quotes are fetched in batches of 5 with small delays to respect rate limits (see `init()` and `doRefresh()`; auto-refresh every 5 minutes).
- **Technical analysis:** `calcMA/calcEMA/calcRSI/calcMACD/calcBoll/calcKDJ/calcSR/calcATR` compute indicators locally from candle data.
- **AI features:** `runAI()` (per-symbol market analysis) and `runAdvisor()` (whole-portfolio advice) assemble large Traditional-Chinese prompts embedding live quotes, computed indicators, news, and `SCORE_DB` context, then POST to `/api/claude`. They instruct the model to return **JSON only** and parse defensively (strip ``` fences, slice from first `{` to last `}`); keep that contract if you touch the prompts or parsing.
- **Rendering:** each tab (`tab-overview`, `tab-myport`, `tab-dadport`, `tab-watchlist`, `tab-aianalysis`, `tab-scoretable`, `tab-cashlog`, `tab-perf`, `tab-advisor`) has a `render*` function dispatched by `goTab()`/`renderActive()`. UI is built with template strings into `innerHTML`; styling uses the CSS custom properties defined in `:root`.

## Conventions

- All UI text, comments, and AI prompts are **Traditional Chinese (zh-TW)**; keep new user-facing strings in zh-TW.
- The code style is deliberately terse/compact: single-letter helpers (`f` format, `cl` up/dn class, `ld`/`sv` localStorage), one-line functions, minimal whitespace. Match it rather than reformatting.
- Money/gain rendering uses the `up`/`dn`/`nt` classes and the `f()`/`fS()` formatters; portfolio math flows through `pStats(acct)`.
- After any state mutation, call `persist()` and then the relevant `render*` (or `renderAll()`).
