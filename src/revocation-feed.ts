export interface RevocationFeedResponse {
  service_id: string;
  cursor: string;
  revoked_jti: string[];
  complete: boolean;
}

export interface RevocationPollOptions {
  baseUrl: string;
  serviceId: string;
  intervalSec?: number;
  failClosed?: boolean;
  /** Persist cursor between polls (optional) */
  loadCursor?: () => string | undefined;
  saveCursor?: (cursor: string) => void;
}

export class RevocationPollCache {
  private readonly revoked = new Set<string>();
  private lastCursor: string | undefined;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPollAt = 0;

  constructor(private readonly options: RevocationPollOptions) {
    this.lastCursor = options.loadCursor?.();
  }

  get size(): number {
    return this.revoked.size;
  }

  isRevoked(jti: string | undefined): boolean {
    if (!jti) return false;
    return this.revoked.has(jti);
  }

  async pollOnce(): Promise<void> {
    const url = new URL('/v1/revocations', this.options.baseUrl.replace(/\/+$/, ''));
    url.searchParams.set('service_id', this.options.serviceId);
    if (this.lastCursor) {
      url.searchParams.set('since', this.lastCursor);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      if (this.options.failClosed) {
        throw new Error(`revocation feed error: ${res.status}`);
      }
      return;
    }

    const body = (await res.json()) as RevocationFeedResponse;
    for (const jti of body.revoked_jti) {
      this.revoked.add(jti);
    }
    this.lastCursor = body.cursor;
    this.options.saveCursor?.(body.cursor);
    this.lastPollAt = Date.now();
  }

  start(): void {
    const intervalMs = (this.options.intervalSec ?? 60) * 1000;
    void this.pollOnce().catch(() => {});
    this.timer = setInterval(() => {
      void this.pollOnce().catch(() => {});
    }, intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export function createRevocationPollCache(
  options: RevocationPollOptions,
): RevocationPollCache {
  return new RevocationPollCache(options);
}
