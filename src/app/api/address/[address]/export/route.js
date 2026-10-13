import { withApi } from '@/lib/api';
import { HttpError, getParam, normalizeAddress } from '@/lib/validation';
import { exportAddressRows } from '@/lib/services/addresses';
import { formatEther } from '@/lib/format';

export const dynamic = 'force-dynamic';

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection and quote special characters.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const COLUMNS = {
  transactions: [
    ['Transaction Hash', (r) => r.hash], ['Blockno', (r) => r.blockNumber], ['DateTime (UTC)', (r) => r.timestamp],
    ['From', (r) => r.from], ['To', (r) => r.to], ['ContractAddress', (r) => r.contractAddress],
    ['Value (Native)', (r) => formatEther(r.value).replace(/,/g, '')], ['TxnFee (Native)', (r) => formatEther(r.fee).replace(/,/g, '')],
    ['Status', (r) => (r.status === 0 ? 'Failed' : 'Success')], ['Method', (r) => r.methodId],
  ],
  internal: [
    ['Transaction Hash', (r) => r.txHash], ['Blockno', (r) => r.blockNumber], ['DateTime (UTC)', (r) => r.timestamp],
    ['From', (r) => r.from], ['To', (r) => r.to], ['Value (Native)', (r) => formatEther(r.value).replace(/,/g, '')],
    ['Type', (r) => r.callType ?? r.type], ['ErrCode', (r) => r.error],
  ],
  tokens: [
    ['Transaction Hash', (r) => r.txHash], ['Blockno', (r) => r.blockNumber], ['DateTime (UTC)', (r) => r.timestamp],
    ['From', (r) => r.from], ['To', (r) => r.to], ['Token', (r) => r.token], ['Standard', (r) => r.tokenType],
    ['Raw Value', (r) => r.value], ['Token ID', (r) => r.tokenId],
  ],
};

/** GET /api/address/:address/export?kind=transactions|internal|tokens → CSV (max 5,000 rows) */
export const GET = withApi(async (req, { params }) => {
  const address = normalizeAddress(params.address);
  const kind = getParam(new URL(req.url).searchParams, 'kind') ?? 'transactions';
  const cols = COLUMNS[kind];
  if (!cols) throw new HttpError(400, 'kind must be transactions, internal or tokens');
  const rows = await exportAddressRows(address, kind);
  const lines = [cols.map(([h]) => h).join(','), ...rows.map((r) => cols.map(([, f]) => csvCell(f(r))).join(','))];
  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="export-${kind}-${address}.csv"`,
      'cache-control': 'no-store',
    },
  });
}, { cost: 10 });
