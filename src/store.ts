import type { Tier } from './tiers.js';

export interface SubscriptionRecord {
  payer: string;
  tier: Tier;
  issuedAtIso: string;
  expiresAtIso: string;
  txHash?: string;
  jti?: string;
}

export interface SubscriptionLookup {
  revoked: boolean;
}

export type StorePolicy = 'strict' | 'lenient' | 'noop';

/**
 * Low-level persistence adapter. Implement against your DB (SQLite, Postgres, etc.).
 * `lookup` returns null when no row exists for payer + issuedAtIso.
 */
export interface SubscriptionStoreAdapter {
  recordSubscription(record: SubscriptionRecord): void;
  lookup(payer: string, issuedAtIso: string): SubscriptionLookup | null;
  markRevoked(payer: string, issuedAtIso: string): boolean;
}

/** Store used by middleware — includes revocation policy. */
export interface SubscriptionStore {
  recordSubscription(record: SubscriptionRecord): void;
  isTokenRevoked(payer: string, issuedAtIso: string): boolean;
  revokeToken(payer: string, issuedAtIso: string): boolean;
}

export function checkRevocation(
  policy: StorePolicy,
  lookup: SubscriptionLookup | null,
): boolean {
  if (policy === 'noop') return false;
  if (policy === 'lenient') {
    if (!lookup) return false;
    return lookup.revoked;
  }
  // strict
  if (!lookup) return true;
  return lookup.revoked;
}

export function createSubscriptionStore(
  adapter: SubscriptionStoreAdapter,
  policy: Exclude<StorePolicy, 'noop'>,
): SubscriptionStore {
  return {
    recordSubscription(record) {
      adapter.recordSubscription(record);
    },
    isTokenRevoked(payer, issuedAtIso) {
      return checkRevocation(policy, adapter.lookup(payer, issuedAtIso));
    },
    revokeToken(payer, issuedAtIso) {
      return adapter.markRevoked(payer, issuedAtIso);
    },
  };
}

export const NOOP_STORE: SubscriptionStore = {
  recordSubscription() {},
  isTokenRevoked() {
    return false;
  },
  revokeToken() {
    return false;
  },
};

/** In-memory store for tests and demos. Strict by default via missing-row semantics. */
export function createMemoryStoreAdapter(): SubscriptionStoreAdapter {
  const rows = new Map<string, SubscriptionLookup & { record?: SubscriptionRecord }>();

  function key(payer: string, issuedAtIso: string): string {
    return `${payer.toLowerCase()}:${issuedAtIso}`;
  }

  return {
    recordSubscription(record) {
      rows.set(key(record.payer, record.issuedAtIso), {
        revoked: false,
        record,
      });
    },
    lookup(payer, issuedAtIso) {
      const row = rows.get(key(payer, issuedAtIso));
      if (!row) return null;
      return { revoked: row.revoked };
    },
    markRevoked(payer, issuedAtIso) {
      const k = key(payer, issuedAtIso);
      const row = rows.get(k);
      if (!row) return false;
      row.revoked = true;
      return true;
    },
  };
}
