/**
 * Client-side type mirrors. Only `import type` from server modules so no server
 * code is pulled into the browser bundle.
 */
import type { ScreenerRow } from "@/server/screener/query";
import type { tokenDetail, tokenCandles, tokenTrades } from "@/server/tokens/detail";
import type { ProviderStatus } from "@/server/providers/health";
import type { PlatformCoverage } from "@/server/providers/registry";
import type { METRIC_CATALOG } from "@/server/alerts/metrics";
import type { paperSummary } from "@/server/validation/paper";
import type { alertRules, alerts, jobs, savedFilters, watchlists, providerCalls, Finding, ScoreFactor, UserSettings, ScreenerFilter, AlertCondition, AlertScope, AlertChannel } from "@/server/db/schema";

export type { ScreenerRow, Finding, ScoreFactor, UserSettings, ScreenerFilter, AlertCondition, AlertScope, AlertChannel, ProviderStatus, PlatformCoverage };

type Jsonify<T> = T extends Date ? string : T extends (infer U)[] ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;

export type TokenDetail = Jsonify<Awaited<ReturnType<typeof tokenDetail>>>;
export type CandlesResponse = Jsonify<Awaited<ReturnType<typeof tokenCandles>>>;
export type TradesResponse = Jsonify<Awaited<ReturnType<typeof tokenTrades>>>;
export type PaperSummary = Jsonify<Awaited<ReturnType<typeof paperSummary>>>;

export type AlertRuleRow = Jsonify<typeof alertRules.$inferSelect>;
export type SavedFilterRow = Jsonify<typeof savedFilters.$inferSelect>;
export type WatchlistRow = Jsonify<typeof watchlists.$inferSelect>;
export type JobRow = Jsonify<typeof jobs.$inferSelect>;
export type ProviderCallRow = Jsonify<typeof providerCalls.$inferSelect>;
export type MetricCatalog = typeof METRIC_CATALOG;

export type AlertRow = Jsonify<typeof alerts.$inferSelect> & {
  token: { symbol: string | null; name: string | null; chain: string; address: string; imageUrl?: string | null };
  deliveries?: { channel: string; status: string; attempts: number; lastError: string | null; sentAt: string | null }[];
};

export type ScreenerResponse = {
  rows: ScreenerRow[];
  total: number;
  meta: {
    serverTime: string;
    refreshIntervalSec: number;
    lastRefreshAt: string | null;
    lastRefreshDurationMs: number | null;
    workerStatus: string;
    workerError: string | null;
    demo: boolean;
  };
};

export type WatchlistResponse = {
  watchlists: WatchlistRow[];
  items: { watchlistId: number; tokenId: number; note: string | null; addedAt: string; chain: string; address: string }[];
  rows: ScreenerRow[];
};

export type AlertsResponse = { alerts: AlertRow[]; unread: number };

export type ChannelAvailability = { inapp: boolean; push: boolean; telegram: boolean; discord: boolean; email: boolean };

export type RulesResponse = { rules: AlertRuleRow[]; metrics: MetricCatalog; channels: ChannelAvailability; watchlists: WatchlistRow[] };

export type SettingsResponse = { settings: UserSettings; channels: ChannelAvailability; authRequired: boolean; appUrl: string; demo: boolean };

export type PushResponse = { configured: boolean; publicKey: string | null; subscriptions: { id: number; endpoint: string; createdAt: string; lastUsedAt: string | null; failures: number }[] };

export type StatusResponse = {
  serverTime: string;
  rulesVersion: string;
  workerMode: string;
  demo: boolean;
  intervals: { discoverySec: number; refreshSec: number; securitySec: number; hotTokenLimit: number };
  counts: Record<string, number | null>;
  jobs: JobRow[];
  providers: ProviderStatus[];
  rpcCircuits: { method: string; failures: number; openUntil: string | null }[];
  recentErrors: ProviderCallRow[];
  coverage: PlatformCoverage[];
  metrics: { metric: string; sources: string; refresh: string; status: string }[];
  checks: { check: string; chain: string; source: string; status: string }[];
};
