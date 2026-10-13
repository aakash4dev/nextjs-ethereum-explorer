import { parseAbi, toEventSelector } from 'viem';

export const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

// Some early tokens (MKR, SAI...) return bytes32 instead of string.
export const BYTES32_METADATA_ABI = parseAbi([
  'function name() view returns (bytes32)',
  'function symbol() view returns (bytes32)',
]);

export const ERC721_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]);

export const ERC1155_ABI = parseAbi([
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
]);

export const TOPICS = {
  TRANSFER: toEventSelector('Transfer(address,address,uint256)'),
  TRANSFER_SINGLE: toEventSelector('TransferSingle(address,address,address,uint256,uint256)'),
  TRANSFER_BATCH: toEventSelector('TransferBatch(address,address,address,uint256[],uint256[])'),
  WETH_DEPOSIT: toEventSelector('Deposit(address,uint256)'),
  WETH_WITHDRAWAL: toEventSelector('Withdrawal(address,uint256)'),
};

// EIP-1967 / EIP-1822 / OpenZeppelin legacy proxy implementation slots.
export const PROXY_SLOTS = {
  eip1967: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  eip1967Beacon: '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50',
  eip1822: '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7',
  ozLegacy: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
};

export const BEACON_ABI = parseAbi(['function implementation() view returns (address)']);

export const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
