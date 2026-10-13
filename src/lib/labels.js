/**
 * Public name tags. Chain-agnostic entries (precompiles, system contracts) are
 * always applied; the rest only on the matching chain. Extend at deploy time
 * with LABELS_JSON='{"0xabc...":"My Contract"}'.
 */

const COMMON = {
  '0x0000000000000000000000000000000000000000': 'Null Address',
  '0x000000000000000000000000000000000000dead': 'Burn Address',
  '0x0000000000000000000000000000000000000001': 'Precompile: ecRecover',
  '0x0000000000000000000000000000000000000002': 'Precompile: SHA256',
  '0x0000000000000000000000000000000000000003': 'Precompile: RIPEMD160',
  '0x0000000000000000000000000000000000000004': 'Precompile: Identity',
  '0x0000000000000000000000000000000000000005': 'Precompile: ModExp',
  '0x0000000000000000000000000000000000000006': 'Precompile: ecAdd',
  '0x0000000000000000000000000000000000000007': 'Precompile: ecMul',
  '0x0000000000000000000000000000000000000008': 'Precompile: ecPairing',
  '0x0000000000000000000000000000000000000009': 'Precompile: Blake2F',
  '0x000000000000000000000000000000000000000a': 'Precompile: KZG Point Evaluation',
  '0x000f3df6d732807ef1319fb7b8bb8522d0beac02': 'EIP-4788: Beacon Roots',
  '0x0000f90827f1c53a10cb7a02335b175320002935': 'EIP-2935: History Storage',
  '0xca11bde05977b3631167028862be2a173976ca11': 'Multicall3',
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Uniswap: Permit2',
  '0x4e59b44847b379578588920ca78fbf26c0b4956c': 'Deterministic Deployment Proxy',
};

const BY_CHAIN = {
  1: {
    '0x00000000219ab540356cbb839cbe05303d7705fa': 'Beacon Deposit Contract',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'Wrapped Ether (WETH)',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'Circle: USDC Token',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'Tether: USDT Stablecoin',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'Maker: Dai Stablecoin',
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'Wrapped BTC (WBTC)',
    '0x514910771af9ca656af840dff83e8264ecf986ca': 'Chainlink Token',
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'Uniswap Token',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2: Router 2',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3: Router',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3: Router 2',
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap: Universal Router',
    '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': 'Uniswap V4: Universal Router',
    '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch v5: Aggregation Router',
    '0x111111125421ca6dc452d289314280a0f8842a65': '1inch v6: Aggregation Router',
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x: Exchange Proxy',
    '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'OpenSea: Seaport 1.5',
    '0x0000000000000068f116a894984e2db1123eb395': 'OpenSea: Seaport 1.6',
    '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave: Pool V3',
    '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'Lido: stETH Token',
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 'Lido: wstETH Token',
    '0x388c818ca8b9251b393131c08a736a67ccb19297': 'Lido: Execution Layer Rewards Vault',
    '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5': 'beaverbuild',
    '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97': 'Titan Builder',
    '0x1f9090aae28b8a3dceadf281b0f12828e676c326': 'rsync-builder',
    '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5': 'Flashbots: Builder',
    '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419': 'Chainlink: ETH/USD Price Feed',
    '0xa6b71e26c5e0845f74c812102ca7114b6a896ab2': 'Safe: Proxy Factory 1.3.0',
  },
};

let extra;
function extraLabels() {
  if (extra) return extra;
  extra = {};
  const raw = typeof process !== 'undefined' ? process.env.LABELS_JSON || process.env.NEXT_PUBLIC_LABELS_JSON : null;
  if (raw) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(raw))) extra[k.toLowerCase()] = String(v);
    } catch {
      /* ignore malformed LABELS_JSON */
    }
  }
  return extra;
}

export function getLabel(address, chainId) {
  if (!address) return null;
  const a = address.toLowerCase();
  return extraLabels()[a] ?? BY_CHAIN[chainId]?.[a] ?? COMMON[a] ?? null;
}

export function searchLabels(query, chainId, limit = 5) {
  const q = query.toLowerCase();
  const all = { ...COMMON, ...(BY_CHAIN[chainId] ?? {}), ...extraLabels() };
  return Object.entries(all)
    .filter(([, name]) => name.toLowerCase().includes(q))
    .slice(0, limit)
    .map(([address, name]) => ({ address, name }));
}
