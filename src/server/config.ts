export interface Config {
  host: string;
  port: number;
  db: string;
  /** Present only when both a cert and a key path are configured. */
  tls: { cert: string; key: string } | undefined;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const cert = env.BOOKCASE_TLS_CERT;
  const key = env.BOOKCASE_TLS_KEY;
  return {
    host: env.BOOKCASE_HOST ?? "0.0.0.0",
    port: Number(env.BOOKCASE_PORT ?? 3000),
    db: env.BOOKCASE_DB ?? "./data/bookcase.db",
    tls: cert && key ? { cert, key } : undefined,
  };
}
