import { Card, CodeBlock, Container, PageHeader, Table, Td, Th, Notice } from '@/components/ui';
import config from '@/lib/config';

export const metadata = { title: 'API Documentation', description: 'REST and Etherscan-compatible APIs for blocks, transactions, accounts, tokens, contracts, logs and gas.' };

const REST = [
  ['GET', '/api/stats', 'Network overview: totals, TPS, price, gas, 14-day history, indexer status'],
  ['GET', '/api/blocks?page=&limit=', 'Latest blocks'],
  ['GET', '/api/block/{number|hash}', 'Block detail with transactions and withdrawals'],
  ['GET', '/api/transactions?address=&block=&page=&limit=', 'Transactions (optionally filtered)'],
  ['GET', '/api/transaction/{hash}', 'Transaction detail: decoded input, logs, token transfers, internal txs'],
  ['GET', '/api/transaction/{hash}/trace', 'Full call tree from the node (debug/trace API)'],
  ['GET', '/api/address/{address}', 'Address overview (balance, nonce, contract, proxy, holdings) + transactions'],
  ['GET', '/api/address/{address}/transactions?type=normal|internal|erc20|nft|logs|withdrawals|mined', 'Address activity by type'],
  ['GET', '/api/address/{address}/export?kind=transactions|internal|tokens', 'CSV export (max 5,000 rows)'],
  ['GET', '/api/tokens?type=ERC20|ERC721|ERC1155|NFT&sort=&q=', 'Token list'],
  ['GET', '/api/token/{address}', 'Token metadata, holders and transfer counts'],
  ['GET', '/api/token/{address}/holders', 'Token holders with share of supply'],
  ['GET', '/api/token/{address}/transfers?a=&tokenId=', 'Token transfers'],
  ['GET', '/api/token/{address}/inventory', 'NFT inventory'],
  ['GET', '/api/token-transfers?type=', 'Latest token transfers'],
  ['GET', '/api/internal-transactions?block=', 'Latest internal transactions'],
  ['GET', '/api/gas', 'Gas oracle tiers, base-fee history, cost estimates, guzzlers'],
  ['GET', '/api/charts/{metric}?days=', 'Daily chart series (tx, gas-used, gas-price, base-fee, fees, burnt, active-addresses, …)'],
  ['GET', '/api/search?q=&resolve=1', 'Search suggestions / resolve to a page'],
  ['GET', '/api/contract/{address}', 'Verified source, ABI and proxy implementation'],
  ['POST', '/api/contract/{address}/read', 'Call a view function of a verified contract'],
  ['POST', '/api/contract/verify', 'Verify contract source (synchronous)'],
  ['GET', '/api/compilers', 'Available Solidity compiler versions'],
  ['POST', '/api/decode', 'Decode calldata with an ABI or the signature database'],
  ['POST', '/api/broadcast', 'Broadcast a signed raw transaction'],
  ['GET', '/api/pending', 'Pending transactions from the node mempool'],
  ['GET', '/api/accounts', 'Top accounts by balance'],
  ['GET', '/api/verified-contracts', 'Verified contracts'],
  ['GET', '/api/indexer', 'Indexer sync status (POST runs a batch; requires ADMIN_API_KEY)'],
  ['GET', '/api/health', 'Health check (DB, RPC, indexer lag) → 200 / 503'],
];

const ETHERSCAN = [
  ['account', 'balance, balancemulti, txlist, txlistinternal, tokentx, tokennfttx, token1155tx, getminedblocks, txsBeaconWithdrawal, tokenbalance'],
  ['contract', 'getabi, getsourcecode, getcontractcreation, verifysourcecode (POST), checkverifystatus'],
  ['transaction', 'getstatus, gettxreceiptstatus'],
  ['block', 'getblockreward, getblocknobytime'],
  ['logs', 'getLogs (address, fromBlock/toBlock, topic0..3, topicX_Y_opr)'],
  ['proxy', 'eth_blockNumber, eth_getBlockByNumber, eth_getTransactionByHash, eth_getTransactionReceipt, eth_call, eth_getCode, eth_getStorageAt, eth_gasPrice, eth_estimateGas, eth_getTransactionCount, eth_sendRawTransaction, eth_chainId'],
  ['gastracker', 'gasoracle, gasestimate'],
  ['stats', 'ethprice'],
  ['token', 'tokeninfo, tokenholderlist'],
];

export default function ApisPage() {
  const base = config.siteUrl;
  return (
    <Container>
      <PageHeader title="API Documentation" subtitle="Free, public JSON APIs. Rate limited per IP; see the X-RateLimit-* response headers." />
      <Notice tone="info" className="mt-4">
        Amounts are returned as decimal strings in wei (or raw token units) to avoid precision loss. Addresses and hashes are lowercase. Pagination uses <code className="hash">page</code> and <code className="hash">limit</code> (max {config.maxPageSize}), with a {config.maxResultWindow.toLocaleString('en-US')} record result window.
      </Notice>

      <Card className="mt-4" title="REST API">
        <Table>
          <thead><tr><Th>Method</Th><Th>Endpoint</Th><Th>Description</Th></tr></thead>
          <tbody>
            {REST.map(([m, p, d]) => (
              <tr key={p + m}>
                <Td><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${m === 'GET' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{m}</span></Td>
                <Td className="hash text-xs">{p}</Td>
                <Td className="whitespace-normal text-muted">{d}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="p-4">
          <CodeBlock>{`curl ${base}/api/transaction/0x<hash>
curl "${base}/api/address/0x<address>/transactions?type=erc20&page=1&limit=25"`}</CodeBlock>
        </div>
      </Card>

      <Card className="mt-4" title="Etherscan-compatible API">
        <div className="space-y-3 p-4 text-sm">
          <p>
            <code className="hash">{base}/api?module=…&amp;action=…</code> mirrors the Etherscan API request and response format (<code className="hash">{'{ status, message, result }'}</code>), so existing tooling works unchanged.
          </p>
          <Table>
            <thead><tr><Th>Module</Th><Th>Actions</Th></tr></thead>
            <tbody>{ETHERSCAN.map(([m, a]) => <tr key={m}><Td className="font-medium">{m}</Td><Td className="whitespace-normal text-muted">{a}</Td></tr>)}</tbody>
          </Table>
          <CodeBlock>{`curl "${base}/api?module=account&action=txlist&address=0x<address>&startblock=0&endblock=99999999&page=1&offset=10&sort=desc"
curl "${base}/api?module=contract&action=getabi&address=0x<contract>"
curl "${base}/api?module=logs&action=getLogs&address=0x<contract>&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"`}</CodeBlock>
        </div>
      </Card>

      <Card className="mt-4" title="Verify contracts from Hardhat / Foundry">
        <div className="space-y-3 p-4 text-sm">
          <p className="font-medium">Hardhat (hardhat.config.js)</p>
          <CodeBlock>{`etherscan: {
  apiKey: { explorer: "any-non-empty-string" },
  customChains: [{
    network: "explorer",
    chainId: <chain id>,
    urls: { apiURL: "${base}/api", browserURL: "${base}" },
  }],
},
// npx hardhat verify --network explorer <address> <constructor args...>`}</CodeBlock>
          <p className="font-medium">Foundry</p>
          <CodeBlock>{`forge verify-contract <address> src/Token.sol:Token \\
  --verifier etherscan --verifier-url ${base}/api --etherscan-api-key any \\
  --compiler-version <version> --watch`}</CodeBlock>
        </div>
      </Card>
    </Container>
  );
}
