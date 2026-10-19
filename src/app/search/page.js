import Link from 'next/link';
import { redirect } from 'next/navigation';
import SearchBar from '@/components/client/SearchBar';
import { Card, Container, EmptyState, PageHeader } from '@/components/ui';
import { resolveQuery, suggest } from '@/lib/services/search';
import { dbConnect } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ searchParams }) {
  const { q = '', f = 'all' } = await searchParams;
  const filter = ['address', 'token', 'block', 'tx'].includes(f) ? f : 'all';
  const term = String(q).slice(0, 128);
  await dbConnect();
  const direct = term ? await resolveQuery(term, filter) : null;
  if (direct) redirect(direct.path);
  const results = term ? await suggest(term, 25, filter) : [];
  return (
    <Container className="max-w-4xl">
      <PageHeader title="Search results" subtitle={term ? `for "${term}"` : null} />
      <div className="mt-4"><SearchBar initialQuery={term} initialFilter={filter} /></div>
      <Card className="mt-4">
        {results.length ? (
          <ul className="divide-y divide-line">
            {results.map((r) => (
              <li key={r.path} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <Link href={r.path} className="link font-medium">{r.title}</Link>
                  {r.subtitle && <div className="hash truncate text-xs text-muted">{r.subtitle}</div>}
                </div>
                <span className="rounded bg-surface-3 px-2 py-0.5 text-xs uppercase text-muted">{r.badge ?? r.kind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Sorry, we couldn&apos;t find any results. Try an address, transaction hash, block number, or token name/symbol.</EmptyState>
        )}
      </Card>
    </Container>
  );
}
