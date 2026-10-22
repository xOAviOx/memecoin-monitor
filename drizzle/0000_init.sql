CREATE TABLE "alert_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rule_state" (
	"rule_id" integer NOT NULL,
	"token_id" integer NOT NULL,
	"conditions_met_since" timestamp with time zone,
	"last_fired_at" timestamp with time zone,
	"last_fingerprint" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_rule_state_rule_id_token_id_pk" PRIMARY KEY("rule_id","token_id")
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"scope" jsonb NOT NULL,
	"conditions" jsonb NOT NULL,
	"persistence_sec" integer DEFAULT 0 NOT NULL,
	"cooldown_sec" integer DEFAULT 3600 NOT NULL,
	"channels" jsonb DEFAULT '["inapp"]'::jsonb NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer,
	"user_id" integer NOT NULL,
	"token_id" integer NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scores" jsonb,
	"link" text NOT NULL,
	"fingerprint" text NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool_address" text NOT NULL,
	"chain" text NOT NULL,
	"timeframe" text NOT NULL,
	"ts" bigint NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"name" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_duration_ms" integer,
	"last_error" text,
	"run_count" integer DEFAULT 0 NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"score_id" integer,
	"rules_version" text NOT NULL,
	"cohort" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_price_usd" double precision NOT NULL,
	"entry_liquidity_usd" double precision,
	"size_usd" double precision NOT NULL,
	"fees_bps" integer NOT NULL,
	"entry_slippage_bps" integer NOT NULL,
	"entry_opportunity" double precision NOT NULL,
	"entry_risk" double precision NOT NULL,
	"entry_confidence" double precision NOT NULL,
	"outcomes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone,
	"exit_reason" text
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"chain" text NOT NULL,
	"address" text NOT NULL,
	"dex_id" text,
	"pool_type" text DEFAULT 'unknown' NOT NULL,
	"quote_token_address" text,
	"quote_symbol" text,
	"pool_created_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"liquidity_usd" double precision,
	"volume_h24" double precision,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer,
	"ok" boolean NOT NULL,
	"latency_ms" integer NOT NULL,
	"error" text,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_state" (
	"provider" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_ok_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"cooldown_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"failures" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"filter" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"snapshot_id" integer,
	"security_report_id" integer,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rules_version" text NOT NULL,
	"cohort" text NOT NULL,
	"opportunity" double precision NOT NULL,
	"risk" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"eligible" boolean NOT NULL,
	"gate_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opportunity_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"momentum_label" text NOT NULL,
	"risk_label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"holders" jsonb,
	"liquidity" jsonb,
	"sellability" jsonb,
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources_failed" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_at" timestamp with time zone,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fingerprint" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_id" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price_usd" double precision,
	"price_change" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"volume" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"buy_volume" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sell_volume" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"txns" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"traders" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"liquidity_usd" double precision,
	"liquidity_change" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"market_cap_usd" double precision,
	"fdv_usd" double precision,
	"holder_count" integer,
	"holder_change" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"organic_score" double precision,
	"organic_score_label" text,
	"pool_count" integer,
	"primary_pool_address" text,
	"supply" double precision,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain" text NOT NULL,
	"address" text NOT NULL,
	"symbol" text,
	"name" text,
	"decimals" integer,
	"image_url" text,
	"token_program" text,
	"launchpad" text,
	"lifecycle_stage" text DEFAULT 'unknown' NOT NULL,
	"creator_address" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_pool_created_at" timestamp with time zone,
	"graduated_at" timestamp with time zone,
	"discovered_via" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_hot" boolean DEFAULT true NOT NULL,
	"is_tracked" boolean DEFAULT true NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"last_security_at" timestamp with time zone,
	"last_scored_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain" text NOT NULL,
	"pool_address" text NOT NULL,
	"tx_hash" text NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"wallet" text,
	"token_amount" double precision,
	"quote_amount" double precision,
	"price_usd" double precision,
	"volume_usd" double precision,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"watchlist_id" integer NOT NULL,
	"token_id" integer NOT NULL,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_watchlist_id_token_id_pk" PRIMARY KEY("watchlist_id","token_id")
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rule_state" ADD CONSTRAINT "alert_rule_state_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rule_state" ADD CONSTRAINT "alert_rule_state_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_score_id_scores_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."scores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_snapshot_id_token_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."token_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_security_report_id_security_reports_id_fk" FOREIGN KEY ("security_report_id") REFERENCES "public"."security_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_reports" ADD CONSTRAINT "security_reports_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_events" ADD CONSTRAINT "token_events_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_snapshots" ADD CONSTRAINT "token_snapshots_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "alert_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "alerts_user_time_idx" ON "alerts" USING btree ("user_id","triggered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_fp_uq" ON "alerts" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "candles_uq" ON "candles" USING btree ("chain","pool_address","timeframe","ts");--> statement-breakpoint
CREATE INDEX "paper_token_idx" ON "paper_positions" USING btree ("token_id","opened_at");--> statement-breakpoint
CREATE INDEX "paper_status_idx" ON "paper_positions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pools_chain_address_uq" ON "pools" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX "pools_token_idx" ON "pools" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "provider_calls_idx" ON "provider_calls" USING btree ("provider","called_at");--> statement-breakpoint
CREATE INDEX "scores_token_time_idx" ON "scores" USING btree ("token_id","computed_at");--> statement-breakpoint
CREATE INDEX "security_token_time_idx" ON "security_reports" USING btree ("token_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "token_events_fp_uq" ON "token_events" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "token_events_token_idx" ON "token_events" USING btree ("token_id","detected_at");--> statement-breakpoint
CREATE INDEX "snapshots_token_time_idx" ON "token_snapshots" USING btree ("token_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_chain_address_uq" ON "tokens" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX "tokens_hot_idx" ON "tokens" USING btree ("is_hot","last_refreshed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trades_uq" ON "trades" USING btree ("chain","pool_address","tx_hash");--> statement-breakpoint
CREATE INDEX "trades_pool_ts_idx" ON "trades" USING btree ("pool_address","block_ts");