import { withApi, json, readBody } from '@/lib/api';
import { HttpError, isAddress, isHex } from '@/lib/validation';
import { decodeInput } from '@/lib/decoder';
import { getVerifiedContract } from '@/lib/services/contracts';

export const dynamic = 'force-dynamic';

/** POST /api/decode { data, abi?, address? } — decode calldata with an ABI, a verified contract, or the signature DB. */
export const POST = withApi(async (req) => {
  const body = await readBody(req);
  if (!isHex(body.data ?? '') || body.data.length < 10) throw new HttpError(400, 'data must be hex calldata (at least a 4-byte selector)');
  let abi = null;
  if (body.abi) {
    try {
      abi = typeof body.abi === 'string' ? JSON.parse(body.abi) : body.abi;
      if (!Array.isArray(abi)) throw new Error('not an array');
    } catch {
      throw new HttpError(400, 'abi must be a JSON ABI array');
    }
  } else if (isAddress(body.address ?? '')) {
    abi = (await getVerifiedContract(body.address.toLowerCase()))?.abi ?? null;
  }
  return json({ decoded: await decodeInput(body.data.trim(), { abi }) });
});
