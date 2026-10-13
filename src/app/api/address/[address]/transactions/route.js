import { withApi, json, CACHE } from '@/lib/api';
import { HttpError, getParam, normalizeAddress, parsePagination } from '@/lib/validation';
import { listInternalTransactions, listTransactions } from '@/lib/services/transactions';
import { listTokenTransfers } from '@/lib/services/tokens';
import { getAddressLogs } from '@/lib/services/addresses';
import { getMinedBlocks, listWithdrawals } from '@/lib/services/blocks';

export const dynamic = 'force-dynamic';

const KINDS = {
  normal: (address, p) => listTransactions({ ...p, address }),
  internal: (address, p) => listInternalTransactions({ ...p, address }),
  erc20: (address, p) => listTokenTransfers({ ...p, address, type: 'ERC20' }),
  nft: (address, p) => listTokenTransfers({ ...p, address, type: 'NFT' }),
  logs: (address, p) => getAddressLogs(address, p),
  withdrawals: (address, p) => listWithdrawals({ ...p, address }),
  mined: (address, p) => getMinedBlocks(address, p),
};

/** GET /api/address/:address/transactions?type=normal|internal|erc20|nft|logs|withdrawals|mined */
export const GET = withApi(async (req, { params }) => {
  const address = normalizeAddress(params.address);
  const sp = new URL(req.url).searchParams;
  const type = getParam(sp, 'type') ?? 'normal';
  if (!KINDS[type]) throw new HttpError(400, `type must be one of ${Object.keys(KINDS).join(', ')}`);
  return json(await KINDS[type](address, parsePagination(sp)), { cache: CACHE.short });
});
