import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  bigint,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Core market entities
// ---------------------------------------------------------------------------

export const tokens = pgTable(
  "tokens",
  {
    id: serial("id").primaryKey(),
    chain: text("chain").notNull(),
    address: text("address").notNull(),
    symbol: text("symbol"),
    name: text("name"),
    decimals: integer("decimals"),
    imageUrl: text("image_url"),
    tokenProgram: text("token_program"),
    launchpad: text("launchpad"),
    // bonding_curve | graduated | pool | unknown
    lifecycleStage: text("lifecycle_stage").notNull().default("unknown"),
    creatorAddress: text("creator_address"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    firstPoolCreatedAt: timestamp("first_pool_created_at", { withTimezone: true }),
    graduatedAt: timestamp("graduated_at", { withTimezone: true }),
    discoveredVia: jsonb("discovered_via").$type<string[]>().notNull().default([]),
    isHot: boolean("is_hot").notNull().default(true),
    isTracked: boolean("is_tracked").notNull().default(true),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    lastSecurityAt: timestamp("last_security_at", { withTimezone: true }),
    lastScoredAt: timestamp("last_scored_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<TokenMetadata>().notNull().default({}),
  },
  (t) => [
    uniqueIndex("tokens_chain_address_uq").on(t.chain, t.address),
    index("tokens_hot_idx").on(t.isHot, t.lastRefreshedAt),
  ],
);

export type TokenMetadata = {
  websites?: string[];
  socials?: { type: string; url: string }[];
  description?: string;
  tags?: string[];
  boosts?: { active: number; total: number; observedAt: string };
  bondingCurvePct?: number;
  graduatedPool?: string;
};

export const pools = pgTable(
  "pools",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    chain: text("chain").notNull(),
    address: text("address").notNull(),
    dexId: text("dex_id"),
    // bonding_curve | amm | clmm | dlmm | unknown
    poolType: text("pool_type").notNull().default("unknown"),
    quoteTokenAddress: text("quote_token_address"),
    quoteSymbol: text("quote_symbol"),
    poolCreatedAt: timestamp("pool_created_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").notNull().default(false),
    liquidityUsd: doublePrecision("liquidity_usd"),
    volumeH24: doublePrecision("volume_h24"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    source: text("source"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pools_chain_address_uq").on(t.chain, t.address),
    index("pools_token_idx").on(t.tokenId),
  ],
);

export type WindowValues = { m5?: number | null; h1?: number | null; h6?: number | null; h24?: number | null };
export type WindowTxns = { m5?: { buys: number; sells: number } | null; h1?: { buys: number; sells: number } | null; h6?: { buys: number; sells: number } | null; h24?: { buys: number; sells: number } | null };
export type WindowTraders = {
  [k in "m5" | "h1" | "h6" | "h24"]?: { traders?: number | null; netBuyers?: number | null; organicBuyers?: number | null; buyers?: number | null; sellers?: number | null } | null;
};
export type FieldSources = Record<string, { source: string; observedAt: string }>;

export const tokenSnapshots = pgTable(
  "token_snapshots",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    priceUsd: doublePrecision("price_usd"),
    priceChange: jsonb("price_change").$type<WindowValues>().notNull().default({}),
    volume: jsonb("volume").$type<WindowValues>().notNull().default({}),
    buyVolume: jsonb("buy_volume").$type<WindowValues>().notNull().default({}),
    sellVolume: jsonb("sell_volume").$type<WindowValues>().notNull().default({}),
    txns: jsonb("txns").$type<WindowTxns>().notNull().default({}),
    traders: jsonb("traders").$type<WindowTraders>().notNull().default({}),
    liquidityUsd: doublePrecision("liquidity_usd"),
    liquidityChange: jsonb("liquidity_change").$type<WindowValues>().notNull().default({}),
    marketCapUsd: doublePrecision("market_cap_usd"),
    fdvUsd: doublePrecision("fdv_usd"),
    holderCount: integer("holder_count"),
    holderChange: jsonb("holder_change").$type<WindowValues>().notNull().default({}),
    organicScore: doublePrecision("organic_score"),
    organicScoreLabel: text("organic_score_label"),
    poolCount: integer("pool_count"),
    primaryPoolAddress: text("primary_pool_address"),
    supply: doublePrecision("supply"),
    sources: jsonb("sources").$type<FieldSources>().notNull().default({}),
  },
  (t) => [index("snapshots_token_time_idx").on(t.tokenId, t.observedAt)],
);

export const candles = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    poolAddress: text("pool_address").notNull(),
    chain: text("chain").notNull(),
    timeframe: text("timeframe").notNull(),
    ts: bigint("ts", { mode: "number" }).notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume").notNull(),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("candles_uq").on(t.chain, t.poolAddress, t.timeframe, t.ts)],
);

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    chain: text("chain").notNull(),
    poolAddress: text("pool_address").notNull(),
    txHash: text("tx_hash").notNull(),
    blockTs: timestamp("block_ts", { withTimezone: true }).notNull(),
    kind: text("kind").notNull(),
    wallet: text("wallet"),
    tokenAmount: doublePrecision("token_amount"),
    quoteAmount: doublePrecision("quote_amount"),
    priceUsd: doublePrecision("price_usd"),
    volumeUsd: doublePrecision("volume_usd"),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trades_uq").on(t.chain, t.poolAddress, t.txHash), index("trades_pool_ts_idx").on(t.poolAddress, t.blockTs)],
);

// ---------------------------------------------------------------------------
// Risk & scoring
// ---------------------------------------------------------------------------

export type Finding = {
  key: string;
  title: string;
  // observed = read from chain/provider; inferred = heuristic; unknown = check not possible
  status: "observed" | "inferred" | "unknown";
  severity: "none" | "info" | "low" | "medium" | "high" | "critical";
  observed: string;
  whyItMatters: string;
  source: string;
  observedAt: string;
  limitations?: string;
  value?: unknown;
};

export const securityReports = pgTable(
  "security_reports",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    findings: jsonb("findings").$type<Finding[]>().notNull().default([]),
    holders: jsonb("holders").$type<HolderInfo | null>(),
    liquidity: jsonb("liquidity").$type<LiquiditySecurity | null>(),
    sellability: jsonb("sellability").$type<Sellability | null>(),
    sourcesUsed: jsonb("sources_used").$type<string[]>().notNull().default([]),
    sourcesFailed: jsonb("sources_failed").$type<{ source: string; error: string }[]>().notNull().default([]),
  },
  (t) => [index("security_token_time_idx").on(t.tokenId, t.checkedAt)],
);

export type HolderInfo = {
  source: string;
  observedAt: string;
  totalHolders?: number | null;
  top10Pct?: number | null;
  top20Pct?: number | null;
  largestPct?: number | null;
  creatorPct?: number | null;
  insiderPct?: number | null;
  topAccounts: { address: string; owner?: string; pct: number; uiAmount: number; label?: string; isPool?: boolean; isInsider?: boolean }[];
  limitations: string;
};

export type LiquiditySecurity = {
  model: "bonding_curve" | "amm" | "clmm" | "dlmm" | "unknown";
  observedAt: string;
  source: string;
  lpLockedPct?: number | null;
  lpBurnedPct?: number | null;
  lpProviders?: number | null;
  totalLiquidityUsd?: number | null;
  interpretation: string;
};

export type Sellability = {
  source: string;
  observedAt: string;
  status: "route_found" | "no_route" | "error" | "unknown";
  priceImpactPct?: number | null;
  inputUsd?: number | null;
  outputUsd?: number | null;
  realizedPct?: number | null;
  routeLabels?: string[];
  limitations: string;
};

export type ScoreFactor = {
  key: string;
  label: string;
  contribution: number;
  weight: number;
  value: number | string | null;
  explanation: string;
  source?: string;
};

export const scores = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    snapshotId: integer("snapshot_id").references(() => tokenSnapshots.id, { onDelete: "set null" }),
    securityReportId: integer("security_report_id").references(() => securityReports.id, { onDelete: "set null" }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    rulesVersion: text("rules_version").notNull(),
    cohort: text("cohort").notNull(),
    opportunity: doublePrecision("opportunity").notNull(),
    risk: doublePrecision("risk").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    eligible: boolean("eligible").notNull(),
    gateReasons: jsonb("gate_reasons").$type<string[]>().notNull().default([]),
    opportunityFactors: jsonb("opportunity_factors").$type<ScoreFactor[]>().notNull().default([]),
    riskFactors: jsonb("risk_factors").$type<ScoreFactor[]>().notNull().default([]),
    confidenceFactors: jsonb("confidence_factors").$type<ScoreFactor[]>().notNull().default([]),
    summary: text("summary").notNull(),
    momentumLabel: text("momentum_label").notNull(),
    riskLabel: text("risk_label").notNull(),
  },
  (t) => [index("scores_token_time_idx").on(t.tokenId, t.computedAt)],
);

export const tokenEvents = pgTable(
  "token_events",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    eventAt: timestamp("event_at", { withTimezone: true }),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    fingerprint: text("fingerprint").notNull(),
  },
  (t) => [uniqueIndex("token_events_fp_uq").on(t.fingerprint), index("token_events_token_idx").on(t.tokenId, t.detectedAt)],
);

// ---------------------------------------------------------------------------
// Users, settings, watchlists, filters
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = {
  channels: { inapp: boolean; push: boolean; telegram: boolean; discord: boolean; email: boolean };
  quietHours?: { start: string; end: string } | null;
  defaultMaxRisk: number;
  defaultMinConfidence: number;
  screenerColumns?: string[];
  reducedMotion?: boolean;
};

export const userSettings = pgTable("user_settings", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<UserSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    watchlistId: integer("watchlist_id").notNull().references(() => watchlists.id, { onDelete: "cascade" }),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    note: text("note"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.watchlistId, t.tokenId] })],
);

export type ScreenerFilter = {
  chains?: string[];
  stages?: string[];
  minAgeMin?: number;
  maxAgeMin?: number;
  minLiquidity?: number;
  maxLiquidity?: number;
  minVolumeH1?: number;
  minVolumeH24?: number;
  minMcap?: number;
  maxMcap?: number;
  maxRisk?: number;
  minConfidence?: number;
  minOpportunity?: number;
  eligibleOnly?: boolean;
  search?: string;
  sort?: string;
  dir?: "asc" | "desc";
};

export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filter: jsonb("filter").$type<ScreenerFilter>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export type AlertCondition = {
  metric: string; // e.g. opportunity, risk, confidence, price_change_h1, volume_h1, liquidity_usd, holder_change_h1, event:creator_sell
  op: ">" | ">=" | "<" | "<=" | "==" | "exists";
  value?: number | string;
};

export type AlertScope =
  | { type: "all"; chains?: string[]; filter?: ScreenerFilter }
  | { type: "watchlist"; watchlistId: number }
  | { type: "token"; tokenId: number };

export type AlertChannel = "inapp" | "push" | "telegram" | "discord" | "email";

export const alertRules = pgTable("alert_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  severity: text("severity").notNull().default("info"),
  scope: jsonb("scope").$type<AlertScope>().notNull(),
  conditions: jsonb("conditions").$type<AlertCondition[]>().notNull(),
  // Require all conditions to hold continuously for this many seconds before firing (0 = immediate).
  persistenceSec: integer("persistence_sec").notNull().default(0),
  cooldownSec: integer("cooldown_sec").notNull().default(3600),
  channels: jsonb("channels").$type<AlertChannel[]>().notNull().default(["inapp"]),
  isExample: boolean("is_example").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertRuleState = pgTable(
  "alert_rule_state",
  {
    ruleId: integer("rule_id").notNull().references(() => alertRules.id, { onDelete: "cascade" }),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    conditionsMetSince: timestamp("conditions_met_since", { withTimezone: true }),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
    lastFingerprint: text("last_fingerprint"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ruleId, t.tokenId] })],
);

export const alerts = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    ruleId: integer("rule_id").references(() => alertRules.id, { onDelete: "set null" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
    conditions: jsonb("conditions").$type<AlertCondition[]>().notNull().default([]),
    observed: jsonb("observed").$type<Record<string, unknown>>().notNull().default({}),
    scores: jsonb("scores").$type<{ opportunity: number; risk: number; confidence: number; eligible: boolean } | null>(),
    link: text("link").notNull(),
    fingerprint: text("fingerprint").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("alerts_user_time_idx").on(t.userId, t.triggeredAt), uniqueIndex("alerts_fp_uq").on(t.fingerprint)],
);

export const alertDeliveries = pgTable(
  "alert_deliveries",
  {
    id: serial("id").primaryKey(),
    alertId: integer("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deliveries_status_idx").on(t.status, t.nextAttemptAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  failures: integer("failures").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Operations: provider health, jobs
// ---------------------------------------------------------------------------

export const providerCalls = pgTable(
  "provider_calls",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    endpoint: text("endpoint").notNull(),
    statusCode: integer("status_code"),
    ok: boolean("ok").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    error: text("error"),
    calledAt: timestamp("called_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("provider_calls_idx").on(t.provider, t.calledAt)],
);

export const providerState = pgTable("provider_state", {
  provider: text("provider").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  name: text("name").primaryKey(),
  status: text("status").notNull().default("idle"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastDurationMs: integer("last_duration_ms"),
  lastError: text("last_error"),
  runCount: integer("run_count").notNull().default(0),
  stats: jsonb("stats").$type<Record<string, unknown>>().notNull().default({}),
});

// ---------------------------------------------------------------------------
// Validation: forward paper tracking
// ---------------------------------------------------------------------------

export type PaperOutcome = { at: string; priceUsd: number | null; liquidityUsd: number | null; netReturnPct: number | null; exitable: boolean; note?: string };

export const paperPositions = pgTable(
  "paper_positions",
  {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id, { onDelete: "cascade" }),
    scoreId: integer("score_id").references(() => scores.id, { onDelete: "set null" }),
    rulesVersion: text("rules_version").notNull(),
    cohort: text("cohort").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    entryPriceUsd: doublePrecision("entry_price_usd").notNull(),
    entryLiquidityUsd: doublePrecision("entry_liquidity_usd"),
    sizeUsd: doublePrecision("size_usd").notNull(),
    feesBps: integer("fees_bps").notNull(),
    entrySlippageBps: integer("entry_slippage_bps").notNull(),
    entryOpportunity: doublePrecision("entry_opportunity").notNull(),
    entryRisk: doublePrecision("entry_risk").notNull(),
    entryConfidence: doublePrecision("entry_confidence").notNull(),
    outcomes: jsonb("outcomes").$type<Partial<Record<"h1" | "h6" | "h24", PaperOutcome>>>().notNull().default({}),
    status: text("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    exitReason: text("exit_reason"),
  },
  (t) => [index("paper_token_idx").on(t.tokenId, t.openedAt), index("paper_status_idx").on(t.status)],
);
