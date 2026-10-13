import { withApi, json, readBody } from '@/lib/api';
import { VerificationError, verifyContract } from '@/lib/verification/verify';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/**
 * POST /api/contract/verify — synchronous verification used by the web form.
 * Body: { address, codeFormat, sourceCode, contractName, compilerVersion,
 *         optimizationUsed, runs, evmVersion, viaIR, constructorArguments, libraries, licenseType }
 * Tooling (Hardhat / Foundry) should use the Etherscan-compatible /api endpoint.
 */
export const POST = withApi(async (req) => {
  const body = await readBody(req);
  if (typeof body.sourceCode === 'string' && body.sourceCode.length > 5_000_000) return json({ ok: false, error: 'Source too large (max 5 MB)' }, { status: 413 });
  try {
    const result = await verifyContract(body);
    return json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof VerificationError) return json({ ok: false, error: err.message }, { status: 422 });
    throw err;
  }
}, { cost: 20 });
