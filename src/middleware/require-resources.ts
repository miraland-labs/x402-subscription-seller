import type { NextFunction, Response } from 'express';
import { pathAllowed } from '../claims.js';
import { errorBody, HTTP_STATUS } from '../errors.js';
import type { AuthenticatedRequest } from './require-bearer.js';

export interface RequireResourcesOptions {
  /** Exact v1 paths (e.g. `/api/v1/echo`). Wildcard `*` in token grants all. */
  paths?: string[];
}

/**
 * Opt-in scope enforcement. Mount after `requireBearer`.
 * Uses `req.path` (Express path without query string).
 */
export function requireResources(options: RequireResourcesOptions = {}) {
  const explicitPaths = options.paths;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const payload = req.subscription;
    if (!payload) {
      res.status(HTTP_STATUS.MISSING_TOKEN).json(
        errorBody('MISSING_TOKEN', 'Subscription context missing — mount requireBearer first'),
      );
      return;
    }

    const requestPath = req.path;
    if (explicitPaths && !explicitPaths.includes(requestPath)) {
      next();
      return;
    }

    const resources = payload.resources ?? ['*'];
    if (!pathAllowed(resources, requestPath)) {
      res.status(HTTP_STATUS.TOKEN_SCOPE_MISMATCH).json(
        errorBody(
          'TOKEN_SCOPE_MISMATCH',
          `Token not authorized for ${requestPath}`,
        ),
      );
      return;
    }

    next();
  };
}
