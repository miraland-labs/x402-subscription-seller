export type { Tier } from './tiers.js';
export {
  ALL_TIERS,
  isValidTier,
  TIER_DURATIONS_SEC,
  TIER_LABELS,
} from './tiers.js';

export type { SubscriptionErrorCode, SubscriptionErrorBody } from './errors.js';
export { errorBody, HTTP_STATUS } from './errors.js';

export type { TokenPayload } from './claims.js';
export {
  JWT_PERSISTENCE_HINT,
  normalizePath,
  normalizeResources,
  pathAllowed,
} from './claims.js';

export type { IssueTokenOptions, VerifyTokenOptions } from './token.js';
export {
  issueToken,
  verifyToken,
  tokenIssuedAtIso,
  isTokenExpiredError,
  isTokenInvalidError,
} from './token.js';

export type {
  SubscriptionRecord,
  SubscriptionLookup,
  StorePolicy,
  SubscriptionStoreAdapter,
  SubscriptionStore,
} from './store.js';
export {
  checkRevocation,
  createSubscriptionStore,
  createMemoryStoreAdapter,
  NOOP_STORE,
} from './store.js';

export type { AuthenticatedRequest, RequireBearerOptions } from './middleware/require-bearer.js';
export { requireBearer } from './middleware/require-bearer.js';

export type { RequireResourcesOptions } from './middleware/require-resources.js';
export { requireResources } from './middleware/require-resources.js';
