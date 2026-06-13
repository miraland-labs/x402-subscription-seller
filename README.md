# @pr402/subscription-seller

Tier A subscription seller SDK for x402/pr402: HS256 JWT issue/verify, revocation store policies, and Express middleware.

## Install

```bash
npm install @pr402/subscription-seller
```

Local development (monorepo sibling):

```json
"@pr402/subscription-seller": "file:../x402-subscription-seller"
```

## Quick start

```typescript
import express from 'express';
import {
  issueToken,
  createSubscriptionStore,
  createMemoryStoreAdapter,
  requireBearer,
  ALL_TIERS,
} from '@pr402/subscription-seller';

const secret = process.env.JWT_SECRET!;
const store = createSubscriptionStore(createMemoryStoreAdapter(), 'strict');

const app = express();
app.use(requireBearer({ secret, store, subscribeUrl: '/api/v1/subscribe/info' }));

app.post('/api/v1/echo', (req, res) => {
  res.json({ payer: req.subscription!.payer, tier: req.subscription!.tier });
});
```

## JWT claims

New tokens include `payer`, `tier`, `sub` (defaults to payer), `jti`, `resources` (defaults to `["*"]`), `iat`, `exp`.

Legacy tokens with only `{ payer, tier, iat, exp }` remain valid; missing `resources` is treated as service-wide access.

## Store policies

| Policy | Missing DB row | Row with `revoked=1` |
|--------|----------------|----------------------|
| `strict` | Revoked | Revoked |
| `lenient` | Active | Revoked |
| `noop` | Active | Active |

Wire your database via `SubscriptionStoreAdapter` + `createSubscriptionStore(adapter, 'strict' | 'lenient')`, or use `NOOP_STORE` for expiry-only checks.

## Errors

Middleware returns JSON `{ error, message, subscribeUrl?, persistenceHint? }` with HTTP status:

- `401` — `MISSING_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `TOKEN_INVALID`
- `403` — `TOKEN_SCOPE_MISMATCH` (opt-in via `requireResources`)
- `429` — rate limits (seller-owned; not emitted by this SDK)

## License

MIT
