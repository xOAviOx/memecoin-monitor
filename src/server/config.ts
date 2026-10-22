function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined || v === "") return dflt;
  return !["0", "false", "no", "off"].includes(v.toLowerCase());
}

function num(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : dflt;
}

export const config = {
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get demoMode() {
    return bool(process.env.DEMO_MODE, false);
  },
  get workerMode(): "separate" | "inprocess" {
    const url = process.env.DATABASE_URL?.trim();
    if (!url || url.startsWith("pglite:")) return "inprocess";
    return process.env.WORKER_MODE === "inprocess" ? "inprocess" : "separate";
  },
  intervals: {
    get discoverySec() {
      return num(process.env.DISCOVERY_INTERVAL_SEC, 90);
    },
    get refreshSec() {
      return num(process.env.REFRESH_INTERVAL_SEC, 45);
    },
    get securitySec() {
      return num(process.env.SECURITY_INTERVAL_SEC, 600);
    },
  },
  get hotTokenLimit() {
    return num(process.env.HOT_TOKEN_LIMIT, 200);
  },
  auth: {
    get password() {
      return process.env.APP_PASSWORD?.trim() || null;
    },
    get sessionSecret() {
      return process.env.SESSION_SECRET?.trim() || "insecure-dev-secret";
    },
  },
  providers: {
    get solanaRpcUrl() {
      return process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
    },
    get jupiter() {
      return bool(process.env.PROVIDER_JUPITER_ENABLED, true);
    },
    get dexscreener() {
      return bool(process.env.PROVIDER_DEXSCREENER_ENABLED, true);
    },
    get geckoterminal() {
      return bool(process.env.PROVIDER_GECKOTERMINAL_ENABLED, true);
    },
    get rugcheck() {
      return bool(process.env.PROVIDER_RUGCHECK_ENABLED, true);
    },
    get birdeyeKey() {
      return process.env.BIRDEYE_API_KEY?.trim() || null;
    },
    get heliusKey() {
      return process.env.HELIUS_API_KEY?.trim() || null;
    },
  },
  notify: {
    get vapidPublic() {
      return process.env.VAPID_PUBLIC_KEY?.trim() || null;
    },
    get vapidPrivate() {
      return process.env.VAPID_PRIVATE_KEY?.trim() || null;
    },
    get vapidSubject() {
      return process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
    },
    get telegramToken() {
      return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
    },
    get telegramChatId() {
      return process.env.TELEGRAM_CHAT_ID?.trim() || null;
    },
    get discordWebhook() {
      return process.env.DISCORD_WEBHOOK_URL?.trim() || null;
    },
    get smtp() {
      const host = process.env.SMTP_HOST?.trim();
      if (!host) return null;
      return {
        host,
        port: num(process.env.SMTP_PORT, 587),
        user: process.env.SMTP_USER?.trim() || undefined,
        pass: process.env.SMTP_PASS?.trim() || undefined,
        from: process.env.SMTP_FROM?.trim() || "memecoin-monitor@localhost",
        to: process.env.ALERT_EMAIL_TO?.trim() || null,
      };
    },
  },
};

export type AppConfig = typeof config;
