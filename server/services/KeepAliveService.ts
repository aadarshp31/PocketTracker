const MIN_INTERVAL_MS = 12 * 60 * 1000;
const MAX_INTERVAL_MS = 13 * 60 * 1000;
const PING_TIMEOUT_MS = 15_000;

function randomIntervalMs(): number {
  return MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1));
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveKeepAliveUrl(): string | null {
  if (process.env.KEEP_ALIVE_URL) {
    return process.env.KEEP_ALIVE_URL;
  }

  if (process.env.RENDER_EXTERNAL_URL) {
    return `${trimTrailingSlash(process.env.RENDER_EXTERNAL_URL)}/api/`;
  }

  return null;
}

function shouldStartKeepAlive(): boolean {
  if (process.env.KEEP_ALIVE_ENABLED === 'false') {
    return false;
  }

  if (process.env.KEEP_ALIVE_ENABLED === 'true') {
    return true;
  }

  return Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
}

async function ping(url: string): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'user-agent': 'pockettracker-keep-alive' },
    signal: AbortSignal.timeout(PING_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`keep-alive ping returned ${response.status}`);
  }
}

function scheduleNextPing(url: string): void {
  const delayMs = randomIntervalMs();

  setTimeout(async () => {
    try {
      await ping(url);
      console.info(`keep-alive ping succeeded (${Math.round(delayMs / 1000)}s interval)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`keep-alive ping failed: ${message}`);
    }

    scheduleNextPing(url);
  }, delayMs);
}

export function startKeepAlive(): void {
  if (!shouldStartKeepAlive()) {
    return;
  }

  const url = resolveKeepAliveUrl();
  if (!url) {
    console.warn('keep-alive is enabled but KEEP_ALIVE_URL / RENDER_EXTERNAL_URL is not set');
    return;
  }

  console.info(`keep-alive scheduled for ${url} every 12-13 minutes`);
  scheduleNextPing(url);
}
