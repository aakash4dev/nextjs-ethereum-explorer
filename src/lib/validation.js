import config from './config.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const isAddress = (v) => typeof v === 'string' && ADDRESS_RE.test(v.trim());
export const isHash = (v) => typeof v === 'string' && HASH_RE.test(v.trim());
export const isHex = (v) => typeof v === 'string' && HEX_RE.test(v.trim()) && v.trim().length % 2 === 0;
export const isBlockNumber = (v) => typeof v === 'string' ? /^\d{1,12}$/.test(v.trim()) : Number.isSafeInteger(v) && v >= 0;

export function normalizeAddress(v) {
  if (!isAddress(v)) throw new HttpError(400, 'Invalid address');
  return v.trim().toLowerCase();
}

export function normalizeHash(v, what = 'hash') {
  if (!isHash(v)) throw new HttpError(400, `Invalid ${what}`);
  return v.trim().toLowerCase();
}

export function parseBlockNumber(v) {
  if (!isBlockNumber(String(v ?? ''))) throw new HttpError(400, 'Invalid block number');
  return Number.parseInt(String(v), 10);
}

function readParam(params, name) {
  if (!params) return null;
  if (typeof params.get === 'function') return params.get(name);
  const v = params[name];
  return Array.isArray(v) ? v[0] : v ?? null;
}

/**
 * Parse page/limit from URLSearchParams or a Next.js searchParams object,
 * clamping to API_MAX_PAGE_SIZE and to the maximum result window (deep offset
 * pagination is expensive; Etherscan applies the same 10k-record window).
 */
export function parsePagination(params, { defaultLimit = 25, maxLimit = config.maxPageSize, pageKey = 'page', limitKey = 'limit' } = {}) {
  const rawLimit = Number.parseInt(readParam(params, limitKey) ?? readParam(params, 'ps') ?? readParam(params, 'offset') ?? '', 10);
  const rawPage = Number.parseInt(readParam(params, pageKey) ?? readParam(params, 'p') ?? '', 10);
  const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit));
  const maxPage = Math.max(1, Math.floor(config.maxResultWindow / limit));
  const page = Math.min(maxPage, Math.max(1, Number.isFinite(rawPage) ? rawPage : 1));
  return { page, limit, skip: (page - 1) * limit, maxPage };
}

export function getParam(params, name) {
  return readParam(params, name);
}

export const PAGE_SIZES = [10, 25, 50, 100];
