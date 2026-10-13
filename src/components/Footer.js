import Image from 'next/image';
import Link from 'next/link';
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube, FaMedium, FaGlobe, FaEnvelope, FaEthereum } from 'react-icons/fa';
import config from '@/lib/config';
import { Container } from './ui';

const COLUMNS = [
  { title: 'Blockchain', links: [['Transactions', '/txs'], ['Blocks', '/blocks'], ['Top Accounts', '/accounts'], ['Verified Contracts', '/contractsVerified']] },
  { title: 'Tokens', links: [['ERC-20 Tokens', '/tokens'], ['Token Transfers', '/tokentxns'], ['NFTs', '/nft-tokens'], ['NFT Transfers', '/nft-transfers']] },
  { title: 'Resources', links: [['Charts & Stats', '/charts'], ['Gas Tracker', '/gastracker'], ['API Documentation', '/apis'], ['Indexer Status', '/status']] },
  { title: 'Developers', links: [['Verify Contract', '/verifyContract'], ['Input Data Decoder', '/inputdatadecoder'], ['Unit Converter', '/unitconverter'], ['Broadcast Transaction', '/pushTx']] },
];

const SOCIAL = [
  ['https://www.aakash4dev.com', 'Website', FaGlobe],
  ['https://github.com/aakash4dev', 'GitHub', FaGithub],
  ['https://linkedin.com/in/aakash4dev', 'LinkedIn', FaLinkedin],
  ['https://twitter.com/aakash4dev', 'Twitter', FaTwitter],
  ['https://www.youtube.com/@aakash4dev', 'YouTube', FaYoutube],
  ['https://medium.com/@aakash4dev', 'Medium', FaMedium],
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <Container className="grid gap-8 py-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <FaEthereum className="text-primary" /> {config.chainName} Explorer
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted">
            An open-source, self-hostable block explorer and analytics platform for EVM chains.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Image src="/aakash_me.webp" alt="Aakash Singh Rajput" width={40} height={40} className="rounded-full border-2 border-primary object-cover" />
            <div className="text-sm">
              <div className="font-medium">Made by Aakash Singh Rajput</div>
              <a href="mailto:aakash4dev.me@gmail.com" className="flex items-center gap-1 text-xs text-muted hover:text-primary">
                <FaEnvelope /> aakash4dev.me@gmail.com
              </a>
            </div>
          </div>
          <div className="mt-3 flex gap-3 text-lg text-muted">
            {SOCIAL.map(([href, label, Icon]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label} className="hover:text-primary">
                <Icon />
              </a>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-sm font-semibold">{col.title}</div>
            <ul className="mt-2 space-y-1.5">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted md:flex-row">
          <span>© {new Date().getFullYear()} Aakash Singh Rajput · MIT License</span>
          <a href="https://github.com/aakash4dev/nextjs-ethereum-explorer" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
            <FaGithub /> Source code
          </a>
        </Container>
      </div>
    </footer>
  );
}
