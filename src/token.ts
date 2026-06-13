import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Tier } from './tiers.js';
import { TIER_DURATIONS_SEC } from './tiers.js';
import type { TokenPayload } from './claims.js';
import { normalizeResources } from './claims.js';

export interface IssueTokenOptions {
  payer: string;
  tier: Tier;
  secret: string;
  /** Defaults to payer. */
  sub?: string;
  /** Defaults to `["*"]`. */
  resources?: string[];
  /** Defaults to random UUID. */
  jti?: string;
  /** Defaults to now (seconds). */
  iat?: number;
}

export interface VerifyTokenOptions {
  secret: string;
  /** When set, reject tokens whose `sub` does not match. */
  expectedSub?: string;
}

export function issueToken(options: IssueTokenOptions): string {
  const iat = options.iat ?? Math.floor(Date.now() / 1000);
  const exp = iat + TIER_DURATIONS_SEC[options.tier];
  const payload: TokenPayload = {
    payer: options.payer,
    tier: options.tier,
    sub: options.sub ?? options.payer,
    resources: normalizeResources(options.resources),
    jti: options.jti ?? randomUUID(),
    iat,
    exp,
  };
  return jwt.sign(payload, options.secret, { algorithm: 'HS256' });
}

export function verifyToken(token: string, options: VerifyTokenOptions): TokenPayload {
  const decoded = jwt.verify(token, options.secret, {
    algorithms: ['HS256'],
  }) as TokenPayload;

  if (options.expectedSub !== undefined && decoded.sub !== options.expectedSub) {
    throw new jwt.JsonWebTokenError('subject mismatch');
  }

  return {
    ...decoded,
    resources: normalizeResources(decoded.resources),
  };
}

export function tokenIssuedAtIso(payload: TokenPayload): string {
  return new Date(payload.iat * 1000).toISOString();
}

export function isTokenExpiredError(err: unknown): boolean {
  return err instanceof jwt.TokenExpiredError;
}

export function isTokenInvalidError(err: unknown): boolean {
  return err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError;
}
