/**
 * Dependency-free error reporting.
 *
 * Always logs to the server console (visible in Vercel Logs). When
 * SENTRY_DSN is set, the same error is forwarded to Sentry via its plain
 * HTTP store API — no SDK required. Reporting must never break the app,
 * so every path swallows its own failures.
 */
export async function reportError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message, extra ?? "");

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!match) return;
    const [, key, host, project] = match;
    await fetch(`https://${host}/api/${project}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=adpilot/1.0`,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        platform: "javascript",
        level: "error",
        logger: context,
        exception: {
          values: [
            {
              type: error instanceof Error ? error.name : "Error",
              value: message.slice(0, 500),
            },
          ],
        },
        extra: {
          ...extra,
          stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined,
        },
      }),
    });
  } catch {
    // Never let monitoring take the site down.
  }
}
