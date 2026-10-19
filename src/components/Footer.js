import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';
import config from '@/lib/config';
import { Container } from './ui';

const COLUMNS = [
  { title: 'The chain', links: [['Blocks', '/blocks'], ['Transactions', '/txs'], ['Top accounts', '/accounts'], ['Verified contracts', '/contractsVerified']] },
  { title: 'Assets', links: [['ERC-20 tokens', '/tokens'], ['Token transfers', '/tokentxns'], ['NFT collections', '/nft-tokens'], ['NFT transfers', '/nft-transfers']] },
  { title: 'Reference', links: [['Charts & statistics', '/charts'], ['Gas tracker', '/gastracker'], ['API documentation', '/apis'], ['Indexer status', '/status'], ['Verify contract', '/verifyContract'], ['Input data decoder', '/inputdatadecoder'], ['Unit converter', '/unitconverter'], ['Broadcast transaction', '/pushTx'], ['Verify signature', '/verifySignature'], ['Beacon withdrawals', '/withdrawals']] },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t-4 border-double border-line-strong">
      <Container className="grid gap-10 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="text-2xl font-semibold tracking-tight">The {config.chainName} Ledger</Link>
          <p className="mt-3 max-w-sm leading-6 text-muted">
            An independent, open-source record of blocks, transactions, assets and contracts on {config.chainName}.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="ledger-kicker text-fg">{col.title}</div>
            <ul className="mt-3 space-y-2">
              {col.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-sm text-muted hover:text-primary">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col justify-between gap-2 py-4 font-sans text-[10px] uppercase tracking-[0.1em] text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Aakash Singh Rajput · MIT License</span>
          <a href="https://github.com/aakash4dev/nextjs-ethereum-explorer" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary">
            <FaGithub /> Source code
          </a>
        </Container>
      </div>
    </footer>
  );
}
