import Link from 'next/link';
import { FaChevronDown, FaEthereum, FaBars } from 'react-icons/fa';
import HeaderTicker from './client/HeaderTicker';
import ThemeToggle from './client/ThemeToggle';
import SearchBar from './client/SearchBar';
import config from '@/lib/config';
import { Container } from './ui';

export const NAV = [
  { label: 'Home', href: '/' },
  {
    label: 'Blockchain',
    items: [
      { label: 'Transactions', href: '/txs' },
      { label: 'Pending Transactions', href: '/txsPending' },
      { label: 'Internal Transactions', href: '/txsInternal' },
      { label: 'View Blocks', href: '/blocks' },
      { label: 'Beacon Withdrawals', href: '/withdrawals' },
      { label: 'Top Accounts', href: '/accounts' },
      { label: 'Verified Contracts', href: '/contractsVerified' },
    ],
  },
  {
    label: 'Tokens',
    items: [
      { label: 'Top Tokens (ERC-20)', href: '/tokens' },
      { label: 'Token Transfers (ERC-20)', href: '/tokentxns' },
      { label: 'Top NFTs', href: '/nft-tokens' },
      { label: 'NFT Transfers', href: '/nft-transfers' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Charts & Stats', href: '/charts' },
      { label: 'Gas Tracker', href: '/gastracker' },
      { label: 'Indexer Status', href: '/status' },
      { label: 'API Documentation', href: '/apis' },
    ],
  },
  {
    label: 'Developers',
    items: [
      { label: 'Verify Contract', href: '/verifyContract' },
      { label: 'Input Data Decoder', href: '/inputdatadecoder' },
      { label: 'Unit Converter', href: '/unitconverter' },
      { label: 'Broadcast Transaction', href: '/pushTx' },
      { label: 'Verify Signature', href: '/verifySignature' },
    ],
  },
];

function Dropdown({ item }) {
  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-fg hover:text-primary group-focus-within:text-primary" aria-haspopup="true">
        {item.label} <FaChevronDown className="h-2.5 w-2.5 transition-transform group-hover:rotate-180" />
      </button>
      <div className="invisible absolute right-0 top-full z-50 min-w-56 translate-y-1 rounded-xl border border-line bg-surface p-1.5 opacity-0 shadow-lg transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {item.items.map((s) => (
          <Link key={s.href} href={s.href} className="block rounded-lg px-3 py-2 text-sm text-fg hover:bg-primary-soft hover:text-primary">
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="hidden border-b border-line md:block">
        <Container className="flex h-10 items-center justify-between gap-4 text-xs text-muted">
          <HeaderTicker />
          <div className="w-full max-w-md">
            <SearchBar />
          </div>
        </Container>
      </div>
      <Container className="flex h-14 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-fg">
          <FaEthereum className="h-6 w-6 text-primary" />
          <span>{config.chainName} Explorer</span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((item) =>
            item.items ? (
              <Dropdown key={item.label} item={item} />
            ) : (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-fg hover:text-primary">
                {item.label}
              </Link>
            ),
          )}
          <span className="ml-2">
            <ThemeToggle />
          </span>
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <details className="group relative">
            <summary className="list-none rounded-lg border border-line p-2 text-fg" aria-label="Open menu">
              <FaBars className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-72 overflow-auto rounded-xl border border-line bg-surface p-2 shadow-lg">
              <div className="mb-2 md:hidden">
                <SearchBar />
              </div>
              {NAV.map((item) =>
                item.items ? (
                  <div key={item.label} className="py-1">
                    <div className="px-3 py-1 text-xs font-semibold uppercase text-muted">{item.label}</div>
                    {item.items.map((s) => (
                      <Link key={s.href} href={s.href} className="block rounded-lg px-3 py-1.5 text-sm hover:bg-primary-soft">
                        {s.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-primary-soft">
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
