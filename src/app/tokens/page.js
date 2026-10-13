import TokenList from './TokenList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Token Tracker (ERC-20)' };

export default function TokensPage({ searchParams }) {
  return <TokenList searchParams={searchParams} type="ERC20" title="Token Tracker (ERC-20)" base="/tokens" />;
}
