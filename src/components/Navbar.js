import Link from 'next/link';
import HeaderTicker from './client/HeaderTicker';
import ThemeToggle from './client/ThemeToggle';
import SearchBar from './client/SearchBar';
import config from '@/lib/config';
import { Container } from './ui';

const PRIMARY = [
  ['Front page', '/'],
  ['Blockchain', '/blocks'],
  ['Tokens', '/tokens'],
  ['Statistics', '/charts'],
  ['Developers', '/apis'],
];

const SECONDARY = [
  ['Blocks', '/blocks'],
  ['Transactions', '/txs'],
  ['Pending', '/txsPending'],
  ['Internal transactions', '/txsInternal'],
  ['Verified contracts', '/contractsVerified'],
  ['Top accounts', '/accounts'],
  ['Gas tracker', '/gastracker'],
];

export default function Navbar() {
  return (
    <header className="bg-bg">
      <Container>
        <div className="flex min-h-9 items-center justify-between gap-4 border-b border-line font-sans text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">
          <div className="flex items-center gap-3">
            <span>Live on-chain record</span>
            <span className="hidden text-fg sm:inline">{config.chainName}{config.chainId ? ` · Chain ${config.chainId}` : ' network'}</span>
          </div>
          <div className="flex items-center gap-4">
            <HeaderTicker />
            <ThemeToggle />
          </div>
        </div>

        <div className="ledger-double-rule grid gap-5 py-5 lg:grid-cols-[1fr_minmax(360px,500px)] lg:items-center">
          <Link href="/" className="text-[2rem] font-semibold leading-none tracking-[-0.045em] text-fg sm:text-[2.65rem]">
            The {config.chainName} Ledger
          </Link>
          <SearchBar />
        </div>

        <nav className="ledger-primary-nav scrollbar-thin flex items-center gap-7 overflow-x-auto border-b border-line py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.1em]" aria-label="Main navigation">
          {PRIMARY.map(([label, href]) => (
            <Link key={href} href={href} className="shrink-0 text-fg transition-colors hover:text-primary">
              {label}
            </Link>
          ))}
          <span className="ml-auto hidden shrink-0 text-muted md:inline">Independent network index</span>
        </nav>

        <nav className="scrollbar-thin flex items-center gap-6 overflow-x-auto border-b border-line py-2.5 font-sans text-[11px] text-muted" aria-label="Blockchain sections">
          {SECONDARY.map(([label, href]) => (
            <Link key={href} href={href} className="shrink-0 transition-colors hover:text-primary">
              {label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
