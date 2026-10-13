import { withApi, json, CACHE } from '@/lib/api';
import { getParam, parsePagination } from '@/lib/validation';
import { listTokens } from '@/lib/services/tokens';

export const dynamic = 'force-dynamic';

/** GET /api/tokens?type=ERC20|ERC721|ERC1155|NFT&sort=holders|recent|name&q= */
export const GET = withApi(async (req) => {
  const sp = new URL(req.url).searchParams;
  const type = ['ERC20', 'ERC721', 'ERC1155', 'NFT'].includes(getParam(sp, 'type')) ? getParam(sp, 'type') : 'ERC20';
  const q = getParam(sp, 'q')?.slice(0, 64) || undefined;
  return json(await listTokens({ ...parsePagination(sp), type, sort: getParam(sp, 'sort') ?? 'holders', q }), { cache: CACHE.medium });
});
