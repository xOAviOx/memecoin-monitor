type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;

function emit(level: Level, scope: string, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return;
  const ts = new Date().toISOString();
  const extra = meta ? " " + JSON.stringify(meta) : "";
  const line = `${ts} [${level.toUpperCase()}] [${scope}] ${msg}${extra}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logger(scope: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", scope, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", scope, msg, meta),
  };
}
