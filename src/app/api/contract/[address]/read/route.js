import { withApi, json, readBody } from '@/lib/api';
import { HttpError, normalizeAddress } from '@/lib/validation';
import { callReadFunction } from '@/lib/services/contracts';

export const dynamic = 'force-dynamic';

/** POST /api/contract/:address/read { functionName, signature?, args[], implementation? } */
export const POST = withApi(async (req, { params }) => {
  const address = normalizeAddress(params.address);
  const body = await readBody(req);
  if (typeof body.functionName !== 'string' || !body.functionName) throw new HttpError(400, 'functionName is required');
  if (body.args !== undefined && !Array.isArray(body.args)) throw new HttpError(400, 'args must be an array');
  const implementation = body.implementation ? normalizeAddress(body.implementation) : undefined;
  return json(await callReadFunction(address, { functionName: body.functionName, signature: body.signature, args: body.args ?? [], implementation }));
}, { cost: 2 });
