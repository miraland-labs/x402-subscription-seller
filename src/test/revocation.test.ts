import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RevocationPollCache } from '../revocation-feed.js';

describe('RevocationPollCache', () => {
  it('tracks revoked jti', () => {
    const cache = new RevocationPollCache({
      baseUrl: 'https://auth.example.com',
      serviceId: 'api.example.com',
    });
    assert.equal(cache.isRevoked('unknown'), false);
    (cache as unknown as { revoked: Set<string> }).revoked.add('abc');
    assert.equal(cache.isRevoked('abc'), true);
  });
});
