export interface JwksDocument {
  keys: Array<Record<string, string>>;
}

export interface JwksCacheOptions {
  jwksUrl: string;
  ttlSec?: number;
}

interface CacheEntry {
  doc: JwksDocument;
  fetchedAt: number;
}

const DEFAULT_TTL_SEC = parseInt(
  process.env.SUBSCRIPTION_AUTH_JWKS_TTL_SEC ?? '3600',
  10,
);

let cache: CacheEntry | null = null;

export async function fetchJwks(
  jwksUrl: string,
  init?: RequestInit,
): Promise<JwksDocument> {
  const res = await fetch(jwksUrl, init);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  return (await res.json()) as JwksDocument;
}

/** Returns cached JWKS; on fetch failure uses stale cache if present. */
export async function getJwks(options: JwksCacheOptions): Promise<JwksDocument> {
  const ttlMs = (options.ttlSec ?? DEFAULT_TTL_SEC) * 1000;
  const now = Date.now();
  if (cache && now - cache.fetchedAt < ttlMs) {
    return cache.doc;
  }
  try {
    const doc = await fetchJwks(options.jwksUrl);
    cache = { doc, fetchedAt: now };
    return doc;
  } catch (err) {
    if (cache) return cache.doc;
    throw err;
  }
}

export function clearJwksCache(): void {
  cache = null;
}

export function findJwkForKid(doc: JwksDocument, kid: string): Record<string, string> | undefined {
  return doc.keys.find((k) => k.kid === kid);
}
