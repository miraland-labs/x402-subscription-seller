import type { NextFunction, Request, Response } from 'express';
import type { TokenPayload } from '../claims.js';
import { errorBody, HTTP_STATUS } from '../errors.js';
import { JWT_PERSISTENCE_HINT } from '../claims.js';
import {
  isTokenExpiredError,
  isTokenInvalidError,
  tokenIssuedAtIso,
  verifyToken,
} from '../token.js';
import type { SubscriptionStore } from '../store.js';
import { NOOP_STORE } from '../store.js';

export interface AuthenticatedRequest extends Request {
  subscription?: TokenPayload;
}

export interface RequireBearerOptions {
  secret: string;
  store?: SubscriptionStore;
  subscribeUrl?: string;
  /** When set, reject tokens whose `sub` does not match. */
  expectedSub?: string;
}

export function requireBearer(options: RequireBearerOptions) {
  const store = options.store ?? NOOP_STORE;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.MISSING_TOKEN).json(
        errorBody('MISSING_TOKEN', 'Authorization: Bearer <token> required', {
          subscribeUrl: options.subscribeUrl,
          persistenceHint: JWT_PERSISTENCE_HINT,
        }),
      );
      return;
    }

    const token = auth.slice('Bearer '.length).trim();
    if (!token) {
      res.status(HTTP_STATUS.MISSING_TOKEN).json(
        errorBody('MISSING_TOKEN', 'Authorization: Bearer <token> required', {
          subscribeUrl: options.subscribeUrl,
        }),
      );
      return;
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token, {
        secret: options.secret,
        expectedSub: options.expectedSub,
      });
    } catch (err) {
      if (isTokenExpiredError(err)) {
        res.status(HTTP_STATUS.TOKEN_EXPIRED).json(
          errorBody('TOKEN_EXPIRED', 'Subscription token expired', {
            subscribeUrl: options.subscribeUrl,
          }),
        );
        return;
      }
      if (isTokenInvalidError(err)) {
        res.status(HTTP_STATUS.TOKEN_INVALID).json(
          errorBody('TOKEN_INVALID', 'Invalid subscription token'),
        );
        return;
      }
      res.status(HTTP_STATUS.TOKEN_INVALID).json(
        errorBody('TOKEN_INVALID', 'Invalid subscription token'),
      );
      return;
    }

    const issuedAtIso = tokenIssuedAtIso(payload);
    if (store.isTokenRevoked(payload.payer, issuedAtIso)) {
      res.status(HTTP_STATUS.TOKEN_REVOKED).json(
        errorBody('TOKEN_REVOKED', 'Subscription token revoked', {
          subscribeUrl: options.subscribeUrl,
        }),
      );
      return;
    }

    req.subscription = payload;
    next();
  };
}
