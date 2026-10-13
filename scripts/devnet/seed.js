#!/usr/bin/env node
/**
 * Seed a local devnet (anvil / hardhat node) with realistic activity so every
 * explorer page has data: ETH transfers, ERC-20/721/1155 transfers, internal
 * value transfers, CREATE2 deployments and a reverted transaction.
 *
 *   anvil --block-time 2 &
 *   npm run devnet:seed            # uses ETHEREUM_RPC_URL (default http://127.0.0.1:8545)
 *
 * Writes scripts/devnet/out/deployments.json and the compiler standard-JSON
 * input (useful for trying contract verification).
 */
import '../load-env.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';
import { createPublicClient, createWalletClient, http, parseEther, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const here = dirname(fileURLToPath(import.meta.url));
const rpcUrl = (process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545').split(',')[0];

// Well-known anvil / hardhat development keys. Never use on a real network.
const KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
];
const accounts = KEYS.map((k) => privateKeyToAccount(k));
const [deployer, alice, bob, carol] = accounts;

const publicClient = createPublicClient({ transport: http(rpcUrl) });
const chainId = await publicClient.getChainId();
const chain = { id: chainId, name: 'devnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } };
const wallet = (account) => createWalletClient({ account, chain, transport: http(rpcUrl) });

const source = readFileSync(join(here, 'contracts/Samples.sol'), 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'contracts/Samples.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
console.log(`Compiling with solc ${solc.version()}...`);
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === 'error');
if (errors.length) {
  console.error(errors.map((e) => e.formattedMessage).join('\n'));
  process.exit(1);
}
const artifact = (name) => {
  const c = output.contracts['contracts/Samples.sol'][name];
  return { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` };
};

async function send(promise, label) {
  const hash = await promise;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ${receipt.status === 'success' ? 'ok ' : 'REVERTED'} ${label} ${hash}`);
  return receipt;
}

async function deploy(name, args = [], account = deployer) {
  const { abi, bytecode } = artifact(name);
  const receipt = await send(wallet(account).deployContract({ abi, bytecode, args }), `deploy ${name}`);
  return { address: receipt.contractAddress, abi };
}

const write = (account, c, functionName, args = [], extra = {}) =>
  send(wallet(account).writeContract({ address: c.address, abi: c.abi, functionName, args, ...extra }), `${functionName}()`);

console.log(`Seeding chain ${chainId} at ${rpcUrl}`);
const token = await deploy('SampleToken', ['Sample USD', 'SUSD', parseEther('1000000')]);
const token2 = await deploy('SampleToken', ['Governance Token', 'GOV', parseEther('21000000')]);
const nft = await deploy('SampleNFT');
const multi = await deploy('SampleMultiToken');
const splitter = await deploy('PaymentSplitter');
const factory = await deploy('VaultFactory');

for (let round = 0; round < 3; round++) {
  await send(wallet(deployer).sendTransaction({ to: alice.address, value: parseEther(String(1 + round)) }), 'ETH transfer');
  await write(deployer, token, 'transfer', [alice.address, parseEther(String(1000 * (round + 1)))]);
  await write(deployer, token2, 'transfer', [bob.address, parseEther(String(500 * (round + 1)))]);
  await write(alice, token, 'transfer', [bob.address, parseEther('125.5')]);
  await write(deployer, nft, 'mint', [alice.address]);
  await write(deployer, splitter, 'split', [[alice.address, bob.address, carol.address]], { value: parseEther('0.3') });
}
await write(alice, nft, 'transferFrom', [alice.address, carol.address, 1n]);
await write(deployer, multi, 'mintBatch', [alice.address, [1n, 2n, 3n], [100n, 50n, 1n]]);
await write(alice, multi, 'safeTransferFrom', [alice.address, bob.address, 1n, 25n, '0x']);
await write(bob, token, 'approve', [carol.address, parseEther('10')]);
await write(deployer, factory, 'create', [keccak256(toHex('vault-1'))], { value: parseEther('0.5') });
await write(deployer, token, 'burn', [parseEther('10')]);

// A reverted transaction (custom error): explicit gas skips the failing estimate.
await send(
  wallet(bob).writeContract({ address: token.address, abi: token.abi, functionName: 'mint', args: [bob.address, 1n], gas: 100_000n }),
  'mint() by non-owner (expected revert)',
);

const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const deployments = {
  chainId,
  compilerVersion: `v${solc.version().replace('.Emscripten.clang', '')}`,
  contracts: { SampleToken: token.address, GovernanceToken: token2.address, SampleNFT: nft.address, SampleMultiToken: multi.address, PaymentSplitter: splitter.address, VaultFactory: factory.address },
  accounts: accounts.map((a) => a.address),
};
writeFileSync(join(outDir, 'deployments.json'), JSON.stringify(deployments, null, 2));
const verifyInput = { ...input, settings: { ...input.settings, outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } } } };
writeFileSync(join(outDir, 'standard-input.json'), JSON.stringify(verifyInput, null, 2));
console.log('\nDeployments:', JSON.stringify(deployments.contracts, null, 2));
console.log(`Standard JSON input written to ${join('scripts/devnet/out', 'standard-input.json')}`);
