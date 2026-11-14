type SentryTarget = { storeUrl: string; publicKey: string };

const SENTRY_TIMEOUT_MS = 2_000;

export function parseSentryDsn(dsn: string | undefined): SentryTarget | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!url.username || !projectId) return null;
    const prefix = url.pathname.slice(0, url.pathname.lastIndexOf(projectId));
    return {
      storeUrl: `${url.protocol}//${url.host}${prefix}api/${projectId}/store/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

function describe(error: unknown): { type: string; value: string; stack?: string } {
  if (error instanceof Error) {
    return { type: error.name, value: error.message, stack: error.stack };
  }
  return { type: "NonError", value: typeof error === "string" ? error : JSON.stringify(error) ?? String(error) };
}

/**
 * Logs an unexpected error and, when SENTRY_DSN is set, posts it to Sentry's store API.
 * Never throws: reporting must not turn a handled 500 into a crash.
 */
export async function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const info = describe(error);
  console.error(`[${String(context.source ?? "app")}] ${info.type}: ${info.value}`, error);

  const target = parseSentryDsn(process.env.SENTRY_DSN);
  if (!target) return;

  try {
    await fetch(target.storeUrl, {
      method: "POST",
      signal: AbortSignal.timeout(SENTRY_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.publicKey}, sentry_client=tallyfolio/1.1.0`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replaceAll("-", ""),
        timestamp: new Date().toISOString(),
        platform: "node",
        level: "error",
        environment: process.env.NODE_ENV,
        exception: { values: [{ type: info.type, value: info.value }] },
        extra: { ...context, stack: info.stack },
      }),
    });
  } catch (reportError) {
    console.error("[log] Could not report to Sentry", reportError);
  }
}
