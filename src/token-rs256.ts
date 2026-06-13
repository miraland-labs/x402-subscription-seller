import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { TokenPayload } from './claims.js';
import { normalizeResources } from './claims.js';

export interface VerifyTokenWithJwksOptions {
  jwksUrl: string;
  expectedIss?: string;
  expectedSub?: string;
}

export async function verifyTokenWithJwks(
  token: string,
  options: VerifyTokenWithJwksOptions,
): Promise<TokenPayload> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new jwt.JsonWebTokenError('missing kid');
  }

  const client = jwksClient({
    jwksUri: options.jwksUrl,
    cache: true,
    rateLimit: true,
  });

  const key = await client.getSigningKey(decoded.header.kid);
  const signingKey = key.getPublicKey();

  const payload = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    issuer: options.expectedIss,
  }) as TokenPayload;

  if (options.expectedSub !== undefined && payload.sub !== options.expectedSub) {
    throw new jwt.JsonWebTokenError('subject mismatch');
  }

  return {
    ...payload,
    resources: normalizeResources(payload.resources),
  };
}
