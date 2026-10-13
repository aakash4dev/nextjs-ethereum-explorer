import TokenList from '../tokens/TokenList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'NFT Collections (ERC-721 / ERC-1155)' };

export default function NftTokensPage({ searchParams }) {
  return <TokenList searchParams={searchParams} type="NFT" title="NFT Collections (ERC-721 / ERC-1155)" base="/nft-tokens" />;
}
