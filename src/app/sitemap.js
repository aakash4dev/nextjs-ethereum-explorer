import config from '@/lib/config';

const STATIC = ['', '/blocks', '/txs', '/txsInternal', '/tokens', '/nft-tokens', '/tokentxns', '/nft-transfers', '/accounts', '/contractsVerified', '/verifyContract', '/gastracker', '/charts', '/apis', '/unitconverter', '/inputdatadecoder', '/pushTx', '/verifySignature', '/withdrawals', '/status'];

export default function sitemap() {
  const now = new Date();
  return STATIC.map((p) => ({ url: `${config.siteUrl}${p}`, lastModified: now, changeFrequency: p === '' ? 'always' : 'hourly', priority: p === '' ? 1 : 0.6 }));
}
