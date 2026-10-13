import { Card, Container, PageHeader, Pagination } from '@/components/ui';
import { TokenTransfersTable } from '@/components/tables';
import { listTokenTransfers } from '@/lib/services/tokens';
import { dbConnect } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { parsePagination } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Token Transfers (ERC-20)' };

export default async function TransfersPage({ searchParams }) {
  const { page, limit } = parsePagination(await searchParams, { defaultLimit: 50 });
  await dbConnect();
  const { transfers, meta, pagination } = await listTokenTransfers({ page, limit, type: 'ERC20' });
  return (
    <Container>
      <PageHeader title="Token Transfers (ERC-20)" subtitle={`${formatNumber(pagination.total)} transfers indexed`} />
      <Card className="mt-4">
        <div className="flex items-center justify-end px-4 py-3">
          <Pagination base="/tokentxns" params={{ ps: limit }} page={page} totalPages={Math.min(pagination.totalPages, Math.floor(10_000 / limit))} />
        </div>
        <TokenTransfersTable transfers={transfers} meta={meta} nft={false} />
      </Card>
    </Container>
  );
}
