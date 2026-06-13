export type SubscriptionErrorCode =
  | 'MISSING_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'TOKEN_INVALID'
  | 'TOKEN_SCOPE_MISMATCH'
  | 'SUBSCRIBER_RATE_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED';

export interface SubscriptionErrorBody {
  error: SubscriptionErrorCode;
  message: string;
  subscribeUrl?: string;
  persistenceHint?: string;
}

export const HTTP_STATUS: Record<SubscriptionErrorCode, number> = {
  MISSING_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_REVOKED: 401,
  TOKEN_INVALID: 401,
  TOKEN_SCOPE_MISMATCH: 403,
  SUBSCRIBER_RATE_LIMIT_EXCEEDED: 429,
  RATE_LIMIT_EXCEEDED: 429,
};

export function errorBody(
  code: SubscriptionErrorCode,
  message: string,
  extra?: Pick<SubscriptionErrorBody, 'subscribeUrl' | 'persistenceHint'>,
): SubscriptionErrorBody {
  return { error: code, message, ...extra };
}
