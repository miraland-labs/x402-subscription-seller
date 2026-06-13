export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array | string>;

export interface IssueViaAuthServiceOptions {
  baseUrl: string;
  merchantWallet: string;
  serviceId: string;
  payer: string;
  tier: string;
  resources: string[];
  signMessage: SignMessageFn;
}

export interface AuthServiceIssueResult {
  token: string;
  jti: string;
  expiresAt: string;
  tier: string;
  resources: string[];
}

function encodeSignature(sig: Uint8Array | string): string {
  if (typeof sig === 'string') return sig;
  return Buffer.from(sig).toString('base64');
}

export async function fetchIssueChallenge(
  baseUrl: string,
  merchantWallet: string,
  params: {
    serviceId: string;
    payer: string;
    tier: string;
    resources: string[];
  },
): Promise<{ message: string; expires_unix: number }> {
  const url = new URL(
    `/v1/services/${merchantWallet}/challenge`,
    baseUrl.replace(/\/+$/, ''),
  );
  url.searchParams.set('action', 'issue');
  url.searchParams.set('service_id', params.serviceId);
  url.searchParams.set('payer', params.payer);
  url.searchParams.set('tier', params.tier);
  url.searchParams.set('resources_json', JSON.stringify(params.resources));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`challenge failed: ${res.status} ${text}`);
  }
  return (await res.json()) as { message: string; expires_unix: number };
}

export async function issueTokenViaAuthService(
  options: IssueViaAuthServiceOptions,
): Promise<AuthServiceIssueResult> {
  const { message } = await fetchIssueChallenge(
    options.baseUrl,
    options.merchantWallet,
    {
      serviceId: options.serviceId,
      payer: options.payer,
      tier: options.tier,
      resources: options.resources,
    },
  );

  const rawSig = await options.signMessage(new TextEncoder().encode(message));
  const signature = encodeSignature(rawSig);

  const res = await fetch(
    new URL('/v1/tokens/issue', options.baseUrl.replace(/\/+$/, '')).toString(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`issue failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as AuthServiceIssueResult & { success: boolean };
  return {
    token: body.token,
    jti: body.jti,
    expiresAt: body.expiresAt,
    tier: body.tier,
    resources: body.resources,
  };
}
