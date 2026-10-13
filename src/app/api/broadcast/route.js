import { withApi, json, readBody } from '@/lib/api';
import { HttpError, isHex } from '@/lib/validation';
import { rpc } from '@/lib/rpc';

export const dynamic = 'force-dynamic';

/** POST /api/broadcast { signedTransaction } — relays eth_sendRawTransaction. */
export const POST = withApi(async (req) => {
  const { signedTransaction } = await readBody(req);
  if (!isHex(signedTransaction ?? '') || signedTransaction.length < 100 || signedTransaction.length > 262_144) {
    throw new HttpError(400, 'signedTransaction must be a hex-encoded signed transaction');
  }
  try {
    const hash = await rpc('eth_sendRawTransaction', [signedTransaction.trim()]);
    return json({ ok: true, hash });
  } catch (err) {
    return json({ ok: false, error: err.details ?? err.shortMessage ?? err.message }, { status: 422 });
  }
}, { cost: 10, db: false });
