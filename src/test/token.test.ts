import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  issueToken,
  verifyToken,
  tokenIssuedAtIso,
  normalizeResources,
  pathAllowed,
  checkRevocation,
  createSubscriptionStore,
  createMemoryStoreAdapter,
  NOOP_STORE,
  TIER_DURATIONS_SEC,
} from '../index.js';

const SECRET = 'test-secret';

describe('issueToken / verifyToken', () => {
  it('issues token with sub, jti, resources defaults', () => {
    const iat = Math.floor(Date.now() / 1000);
    const token = issueToken({
      payer: '0xabc',
      tier: 'hourly',
      secret: SECRET,
      jti: 'fixed-jti',
      iat,
    });
    const payload = verifyToken(token, { secret: SECRET });
    assert.equal(payload.payer, '0xabc');
    assert.equal(payload.sub, '0xabc');
    assert.equal(payload.jti, 'fixed-jti');
    assert.deepEqual(payload.resources, ['*']);
    assert.equal(payload.iat, iat);
    assert.equal(payload.exp, iat + TIER_DURATIONS_SEC.hourly);
  });

  it('accepts legacy tokens without sub/resources/jti', () => {
    const legacy = jwt.sign(
      { payer: '0xlegacy', tier: 'daily' },
      SECRET,
      { algorithm: 'HS256', expiresIn: TIER_DURATIONS_SEC.daily },
    );
    const payload = verifyToken(legacy, { secret: SECRET });
    assert.equal(payload.payer, '0xlegacy');
    assert.deepEqual(payload.resources, ['*']);
  });

  it('rejects wrong secret', () => {
    const token = issueToken({ payer: 'x', tier: 'hourly', secret: SECRET });
    assert.throws(() => verifyToken(token, { secret: 'wrong' }));
  });
});

describe('pathAllowed', () => {
  it('wildcard grants all paths', () => {
    assert.equal(pathAllowed(['*'], '/api/v1/echo'), true);
  });

  it('exact path match', () => {
    assert.equal(pathAllowed(['/api/v1/echo'], '/api/v1/echo'), true);
    assert.equal(pathAllowed(['/api/v1/echo'], '/api/v1/other'), false);
  });

  it('normalizeResources treats empty as wildcard', () => {
    assert.deepEqual(normalizeResources(undefined), ['*']);
    assert.deepEqual(normalizeResources([]), ['*']);
  });
});

describe('revocation policies', () => {
  it('strict: missing row is revoked', () => {
    assert.equal(checkRevocation('strict', null), true);
  });

  it('lenient: missing row is not revoked', () => {
    assert.equal(checkRevocation('lenient', null), false);
  });

  it('noop store never revokes', () => {
    assert.equal(NOOP_STORE.isTokenRevoked('any', new Date().toISOString()), false);
  });

  it('strict store revokes marked tokens', () => {
    const adapter = createMemoryStoreAdapter();
    const store = createSubscriptionStore(adapter, 'strict');
    const issuedAtIso = new Date().toISOString();
    store.recordSubscription({
      payer: '0x1',
      tier: 'hourly',
      issuedAtIso,
      expiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.equal(store.isTokenRevoked('0x1', issuedAtIso), false);
    store.revokeToken('0x1', issuedAtIso);
    assert.equal(store.isTokenRevoked('0x1', issuedAtIso), true);
  });

  it('lenient store ignores missing row', () => {
    const adapter = createMemoryStoreAdapter();
    const store = createSubscriptionStore(adapter, 'lenient');
    assert.equal(store.isTokenRevoked('0xunknown', new Date().toISOString()), false);
  });
});

describe('tokenIssuedAtIso', () => {
  it('formats iat as ISO string', () => {
    const iso = tokenIssuedAtIso({ payer: 'x', tier: 'hourly', iat: 0, exp: 3600 });
    assert.equal(iso, '1970-01-01T00:00:00.000Z');
  });
});
