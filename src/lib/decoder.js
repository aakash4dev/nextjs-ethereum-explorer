/**
 * Calldata, event log and revert reason decoding. Verified ABIs take
 * precedence; otherwise candidate signatures are tried until one decodes
 * cleanly (selector collisions are resolved by successful decoding).
 */
import { decodeErrorResult, decodeEventLog, decodeFunctionData, parseAbiItem, slice } from 'viem';
import { formatAbiItem, formatAbiParameter } from 'abitype';
import { lookupSignatures } from './signatures.js';

export function serializeValue(v) {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializeValue(x)]));
  }
  return v;
}

function describeParams(params = [], values = []) {
  const arr = Array.isArray(values) ? values : params.map((p, i) => values?.[p.name] ?? values?.[i]);
  return params.map((p, i) => ({
    name: p.name || `arg${i}`,
    type: formatAbiParameter({ ...p, name: undefined }).replace(/ indexed$/, ''),
    indexed: Boolean(p.indexed),
    value: serializeValue(arr[i]),
  }));
}

export function decodeInputWithAbi(abi, data) {
  if (!abi || !data || data === '0x' || data.length < 10) return null;
  try {
    const { functionName, args } = decodeFunctionData({ abi, data });
    const item = abi.find((x) => x.type === 'function' && x.name === functionName && (x.inputs?.length ?? 0) === (args?.length ?? 0))
      ?? abi.find((x) => x.type === 'function' && x.name === functionName);
    return {
      name: functionName,
      signature: formatAbiItem({ ...item, outputs: [], stateMutability: 'nonpayable' }).replace(/^function /, ''),
      args: describeParams(item?.inputs, args ?? []),
    };
  } catch {
    return null;
  }
}

/** Decode transaction input. Returns null for plain transfers / undecodable data. */
export async function decodeInput(data, { abi } = {}) {
  if (!data || data === '0x' || data.length < 10) return null;
  const viaAbi = decodeInputWithAbi(abi, data);
  if (viaAbi) return { ...viaAbi, source: 'verified' };
  const selector = data.slice(0, 10).toLowerCase();
  const candidates = await lookupSignatures(selector, 'function');
  for (const sig of candidates) {
    try {
      const item = parseAbiItem(sig.startsWith('function') ? sig : `function ${sig}`);
      const decoded = decodeInputWithAbi([item], data);
      if (decoded) return { ...decoded, source: 'signature' };
    } catch {
      /* try next candidate */
    }
  }
  return { name: null, signature: null, selector, args: [], source: 'unknown' };
}

function eventVariants(sig, indexedCount) {
  const item = parseAbiItem(sig.startsWith('event') ? sig : `event ${sig}`);
  const hasIndexed = item.inputs.some((i) => i.indexed);
  if (hasIndexed || indexedCount === 0) return [item];
  // Remote signature databases do not record `indexed`; assume the first N.
  return [{ ...item, inputs: item.inputs.map((p, i) => ({ ...p, indexed: i < indexedCount })) }];
}

function topicsOf(log) {
  const topics = log.topics ?? [log.topic0, log.topic1, log.topic2, log.topic3];
  return topics.filter((t) => t !== null && t !== undefined);
}

export function decodeLogWithAbi(abi, log) {
  const topics = topicsOf(log);
  if (!abi || !topics.length) return null;
  try {
    const { eventName, args } = decodeEventLog({ abi, topics, data: log.data ?? '0x', strict: true });
    const item = abi.find((x) => x.type === 'event' && x.name === eventName && x.inputs?.filter((i) => i.indexed).length === topics.length - 1)
      ?? abi.find((x) => x.type === 'event' && x.name === eventName);
    return {
      name: eventName,
      signature: formatAbiItem(item).replace(/^event /, ''),
      args: describeParams(item?.inputs, item?.inputs?.map((p, i) => (Array.isArray(args) ? args[i] : args?.[p.name]))),
    };
  } catch {
    return null;
  }
}

export async function decodeLog(log, { abi } = {}) {
  const viaAbi = decodeLogWithAbi(abi, log);
  if (viaAbi) return { ...viaAbi, source: 'verified' };
  const topics = topicsOf(log);
  if (!topics.length) return null;
  const candidates = await lookupSignatures(topics[0].toLowerCase(), 'event');
  for (const sig of candidates) {
    try {
      for (const item of eventVariants(sig, topics.length - 1)) {
        const decoded = decodeLogWithAbi([item], log);
        if (decoded) return { ...decoded, source: 'signature' };
      }
    } catch {
      /* next */
    }
  }
  return null;
}

const PANIC_CODES = {
  0x01: 'Assertion failed',
  0x11: 'Arithmetic overflow/underflow',
  0x12: 'Division by zero',
  0x21: 'Invalid enum value',
  0x22: 'Invalid storage byte array',
  0x31: 'pop() on empty array',
  0x32: 'Array index out of bounds',
  0x41: 'Out of memory',
  0x51: 'Invalid internal function',
};

/** Decode revert data from a trace / eth_call into a human-readable reason. */
export async function decodeRevert(data, { abi } = {}) {
  if (!data || data === '0x') return null;
  try {
    const { errorName, args } = decodeErrorResult({ abi: abi ?? [], data });
    if (errorName === 'Error') return String(args?.[0]);
    if (errorName === 'Panic') return `Panic: ${PANIC_CODES[Number(args?.[0])] ?? `code ${args?.[0]}`}`;
    return `${errorName}(${(args ?? []).map((a) => serializeValue(a)).join(', ')})`;
  } catch {
    /* fall through */
  }
  if (data.length >= 10) {
    const candidates = await lookupSignatures(slice(data, 0, 4).toLowerCase(), 'function');
    for (const sig of candidates) {
      try {
        const item = parseAbiItem(sig.replace(/^function /, 'error ').replace(/^(?!error )/, 'error '));
        const { errorName, args } = decodeErrorResult({ abi: [item], data });
        return `${errorName}(${(args ?? []).map((a) => serializeValue(a)).join(', ')})`;
      } catch {
        /* next */
      }
    }
  }
  return `Reverted with data ${data.length > 74 ? `${data.slice(0, 74)}…` : data}`;
}
