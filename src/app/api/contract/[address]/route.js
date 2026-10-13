import { withApi, json, CACHE } from '@/lib/api';
import { normalizeAddress } from '@/lib/validation';
import { detectProxy, getVerifiedContract } from '@/lib/services/contracts';

export const dynamic = 'force-dynamic';

/** GET /api/contract/:address — verified source, ABI and proxy info. */
export const GET = withApi(async (_req, { params }) => {
  const address = normalizeAddress(params.address);
  const [contract, proxy] = await Promise.all([getVerifiedContract(address), detectProxy(address)]);
  const implementation = proxy?.implementation ? await getVerifiedContract(proxy.implementation) : null;
  return json({ verified: Boolean(contract), contract, proxy, implementation: implementation ? { address: implementation.address, name: implementation.name, abi: implementation.abi } : null }, { cache: CACHE.short });
});
