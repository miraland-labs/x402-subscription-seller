import type { Tier } from './tiers.js';

/** Decoded JWT payload — legacy tokens may omit sub, resources, jti. */
export interface TokenPayload {
  payer: string;
  tier: Tier;
  iat: number;
  exp: number;
  sub?: string;
  resources?: string[];
  jti?: string;
}

export const JWT_PERSISTENCE_HINT =
  'Save this JWT locally (file, DB, or secrets manager). After app or machine restart, ' +
  'present the same Bearer token until it expires. The seller does not re-issue a token ' +
  'without a new x402 payment. Renew via POST /api/v1/subscribe when TOKEN_EXPIRED.';

/** Missing or empty resources claim → service-wide access (SUBSCRIPTION_PATTERN.md). */
export function normalizeResources(resources: unknown): string[] {
  if (resources === undefined || resources === null) return ['*'];
  if (!Array.isArray(resources) || resources.length === 0) return ['*'];
  return resources.map(String);
}

/** Normalize request path for v1 exact-path scope checks. */
export function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

export function pathAllowed(resources: string[], requestPath: string): boolean {
  const normalized = normalizeResources(resources);
  if (normalized.includes('*')) return true;
  return normalized.includes(normalizePath(requestPath));
}
