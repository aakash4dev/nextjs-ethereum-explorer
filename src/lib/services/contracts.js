import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { BEACON_ABI, PROXY_SLOTS } from '../abi.js';
import { Contract } from '../models.js';
import { getClient } from '../rpc.js';
import { serializeValue } from '../decoder.js';
import { HttpError } from '../validation.js';
import { NO_ID, cached, paginate } from './common.js';

const ZERO_WORD = /^0x0*$/;
const slotToAddress = (v) => (v && !ZERO_WORD.test(v) ? `0x${v.slice(-40)}`.toLowerCase() : null);

/** Detect EIP-1967 / EIP-1822 / beacon / OZ-legacy proxies. */
export async function detectProxy(address) {
  return cached(`proxy:${address}`, 30_000, async () => {
    const client = getClient();
    const read = (slot) => client.getStorageAt({ address, slot }).catch(() => null);
    const [impl, beacon, uups, legacy] = await Promise.all([read(PROXY_SLOTS.eip1967), read(PROXY_SLOTS.eip1967Beacon), read(PROXY_SLOTS.eip1822), read(PROXY_SLOTS.ozLegacy)]);
    if (slotToAddress(impl)) return { type: 'EIP-1967 Transparent/UUPS', implementation: slotToAddress(impl) };
    if (slotToAddress(beacon)) {
      const beaconAddr = slotToAddress(beacon);
      const implementation = await client.readContract({ address: beaconAddr, abi: BEACON_ABI, functionName: 'implementation' }).catch(() => null);
      return { type: 'EIP-1967 Beacon', beacon: beaconAddr, implementation: implementation?.toLowerCase() ?? null };
    }
    if (slotToAddress(uups)) return { type: 'EIP-1822 UUPS', implementation: slotToAddress(uups) };
    if (slotToAddress(legacy)) return { type: 'OpenZeppelin Legacy', implementation: slotToAddress(legacy) };
    // EIP-1167 minimal proxy: implementation embedded in the code.
    const code = await client.getCode({ address }).catch(() => null);
    const m = code?.match(/^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3$/i);
    if (m) return { type: 'EIP-1167 Minimal Proxy', implementation: `0x${m[1].toLowerCase()}` };
    return null;
  });
}

export async function getVerifiedContract(address) {
  return Contract.findOne({ address }).select(NO_ID).lean();
}

export async function listVerifiedContracts({ page = 1, limit = 25, q } = {}) {
  const filter = q ? { name: { $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } } : {};
  const [rows, total] = await Promise.all([
    Contract.find(filter).sort({ verifiedAt: -1 }).skip((page - 1) * limit).limit(limit).select({ ...NO_ID, address: 1, name: 1, compilerVersion: 1, optimizationUsed: 1, runs: 1, licenseType: 1, verifiedAt: 1, matchType: 1, evmVersion: 1 }).lean(),
    Contract.countDocuments(filter),
  ]);
  return { contracts: rows, pagination: paginate(total, page, limit) };
}

function coerceArg(type, value) {
  if (type.endsWith(']')) {
    const arr = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    const inner = type.slice(0, type.lastIndexOf('['));
    return arr.map((v) => coerceArg(inner, v));
  }
  if (type.startsWith('uint') || type.startsWith('int')) return BigInt(String(value).trim());
  if (type === 'bool') return value === true || String(value).trim().toLowerCase() === 'true' || value === '1';
  if (type.startsWith('tuple')) return typeof value === 'string' ? JSON.parse(value) : value;
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Execute a read-only (view/pure) function via eth_call. The ABI fragment is
 * taken from the verified contract (or its proxy implementation) so callers
 * cannot make the server encode arbitrary payloads.
 */
export async function callReadFunction(address, { functionName, signature, args = [], implementation }) {
  const source = implementation ? await getVerifiedContract(implementation) : await getVerifiedContract(address);
  if (!source?.abi) throw new HttpError(404, 'Contract is not verified');
  const fragments = source.abi.filter((f) => f.type === 'function' && f.name === functionName && ['view', 'pure'].includes(f.stateMutability));
  const fragment = signature ? fragments.find((f) => `${f.name}(${f.inputs.map((i) => i.type).join(',')})` === signature) : fragments[0];
  if (!fragment) throw new HttpError(400, 'Unknown read function');
  let coerced;
  try {
    coerced = fragment.inputs.map((inp, i) => coerceArg(inp.type, args[i]));
  } catch (err) {
    throw new HttpError(400, `Invalid argument: ${err.message}`);
  }
  const data = encodeFunctionData({ abi: [fragment], functionName, args: coerced });
  try {
    const { data: ret } = await getClient().call({ to: address, data });
    const decoded = decodeFunctionResult({ abi: [fragment], functionName, data: ret ?? '0x' });
    const values = fragment.outputs.length === 1 ? [decoded] : decoded;
    return { outputs: fragment.outputs.map((o, i) => ({ name: o.name, type: o.type, value: serializeValue(Array.isArray(values) ? values[i] : values?.[o.name]) })) };
  } catch (err) {
    return { error: err.shortMessage ?? err.message };
  }
}
