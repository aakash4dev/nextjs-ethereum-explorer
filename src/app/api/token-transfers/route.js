import { withApi, json, CACHE } from '@/lib/api';
import { getParam, parsePagination } from '@/lib/validation';
import { listTokenTransfers } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

/** GET /api/token-transfers?type=ERC20|ERC721|ERC1155|NFT */
export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const type = ['ERC20', 'ERC721', 'ERC1155', 'NFT'].includes(getParam(sp, 'type')) ? getParam(sp, 'type') : 'ERC20';
  return json(await listTokenTransfers({ ...parsePagination(sp), type }), { cache: CACHE.short });
});
