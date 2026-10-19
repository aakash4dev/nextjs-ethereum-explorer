#!/usr/bin/env node
/** Integration checks against a running, seeded local explorer. Never targets a public chain. */
import './load-env.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import solc from 'solc';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const rpcUrl = process.env.ETHEREUM_RPC_URL;
const local = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
assert(local(base) && local(rpcUrl), 'Devnet tests require loopback web and RPC URLs');
const publicClient = createPublicClient({ transport: http(rpcUrl), pollingInterval: 100 });
assert.equal(await publicClient.getChainId(), 31337, 'Devnet tests require chain 31337');
const deployment = JSON.parse(readFileSync(new URL('./out/deployments.json', import.meta.url), 'utf8'));
const sourceCode = readFileSync(new URL('./out/standard-input.json', import.meta.url), 'utf8');
const contracts = deployment.contracts;
const [owner, alice, bob, carol] = deployment.accounts.map((a) => a.toLowerCase());
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function request(path, { body, status = 200, method } = {}) {
  const response = await fetch(`${base}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(180_000),
    cache: 'no-store',
  });
  const text = await response.text();
  assert([status].flat().includes(response.status), `${path}: HTTP ${response.status}: ${text.slice(0, 300)}`);
  return response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text;
}
const etherscan = (module, action, params = {}) => request(`/api?${new URLSearchParams({ module, action, ...params })}`);
async function waitIndexed(block) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const health = await request('/api/health', { status: [200, 503] });
    if (health.checks.indexer?.ok && health.checks.indexer.lastProcessedBlock >= block) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Indexer did not reach block ${block}`);
}

await waitIndexed(Number(await publicClient.getBlockNumber()));
let transactions = [];
await check('health: database, RPC and indexer ready', async () => {
  const health = await request('/api/health');
  assert.equal(health.status, 'ok');
  assert.equal(health.checks.indexer.lag, 0);
});
await check('transactions include deployments, transfers and deliberate revert', async () => {
  transactions = (await request('/api/transactions?limit=100')).transactions;
  assert(transactions.length >= 31);
  assert(transactions.some((t) => t.status === 0));
  assert(transactions.filter((t) => t.contractAddress).length >= 6);
});
await check('all token standards discovered with correct supply and holders', async () => {
  const erc20 = (await request('/api/tokens?type=ERC20')).tokens;
  assert.equal(erc20.length, 2);
  assert.equal(erc20.find((t) => t.symbol === 'SUSD').totalSupply, parseEther('999990').toString());
  assert.equal(erc20.find((t) => t.symbol === 'SUSD').holdersCount, 3);
  assert.equal((await request('/api/tokens?type=ERC721')).tokens.length, 1);
  assert.equal((await request('/api/tokens?type=ERC1155')).tokens.length, 1);
});
await check('ERC20 holder balances are exact', async () => {
  const { holders } = await request(`/api/token/${contracts.SampleToken}/holders`);
  const byAddress = Object.fromEntries(holders.map((h) => [h.holder, h.balance]));
  assert.equal(byAddress[owner], parseEther('993990').toString());
  assert.equal(byAddress[alice], parseEther('5623.5').toString());
  assert.equal(byAddress[bob], parseEther('376.5').toString());
});
await check('ERC721 inventory tracks all current owners', async () => {
  const { items } = await request(`/api/token/${contracts.SampleNFT}/inventory`);
  assert.equal(items.length, 3);
  assert.equal(items.find((i) => i.tokenId === '1').owner, carol);
  assert.equal(items.find((i) => i.tokenId === '2').owner, alice);
});
await check('ERC1155 batch and single transfers, balances and inventory', async () => {
  const transfers = (await request('/api/token-transfers?type=ERC1155')).transfers;
  assert.equal(transfers.length, 4);
  assert.equal((await request(`/api/token/${contracts.SampleMultiToken}/inventory`)).items.length, 3);
  const holders = (await request(`/api/token/${contracts.SampleMultiToken}/holders`)).holders;
  assert.equal(holders.find((h) => h.holder === alice).balance, '126');
  assert.equal(holders.find((h) => h.holder === bob).balance, '25');
});
await check('internal value transfers and CREATE2 deployment indexed', async () => {
  const { internalTransactions } = await request('/api/internal-transactions?limit=100');
  assert(internalTransactions.filter((t) => t.value === parseEther('0.1').toString()).length >= 9);
  assert(internalTransactions.some((t) => t.type?.startsWith('create')));
});
let freshContract;
await check('verification rejects a bytecode mismatch', async () => {
  const compiled = JSON.parse(solc.compile(sourceCode));
  const artifact = compiled.contracts['contracts/Samples.sol'].PaymentSplitter;
  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const wallet = createWalletClient({ account, transport: http(rpcUrl) });
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}`, chain: null });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  freshContract = receipt.contractAddress;
  await waitIndexed(Number(receipt.blockNumber));
  const result = await request('/api/contract/verify', { status: 422, body: {
    address: receipt.contractAddress, compilerVersion: deployment.compilerVersion,
    codeFormat: 'solidity-standard-json-input', contractName: 'contracts/Samples.sol:SampleNFT', sourceCode,
  } });
  assert.match(result.error, /mismatch/i);
});
await check('fresh deployment verifies successfully without cached verification', async () => {
  assert(freshContract, 'Fresh contract was not deployed');
  const result = await request('/api/contract/verify', { body: {
    address: freshContract, compilerVersion: deployment.compilerVersion, sourceCode,
    codeFormat: 'solidity-standard-json-input', contractName: 'contracts/Samples.sol:PaymentSplitter',
  } });
  assert.equal(result.ok, true);
  assert.equal(result.matchType, 'full');
  assert.equal(result.alreadyVerified, false);
});
for (const [name, address] of Object.entries(contracts)) {
  await check(`verify ${name} using the deployed compiler and source`, async () => {
    const result = await request('/api/contract/verify', { body: {
      address, compilerVersion: deployment.compilerVersion, sourceCode,
      codeFormat: 'solidity-standard-json-input', contractName: `contracts/Samples.sol:${name === 'GovernanceToken' ? 'SampleToken' : name}`, licenseType: 'MIT',
    } });
    assert.equal(result.ok, true);
    assert.equal(result.matchType, 'full');
  });
}
await check('verified contract getters and parameter reads', async () => {
  const read = (functionName, args = []) => request(`/api/contract/${contracts.SampleToken}/read`, { body: { functionName, args } });
  assert.equal((await read('name')).outputs[0].value, 'Sample USD');
  assert.equal((await read('balanceOf', [alice])).outputs[0].value, parseEther('5623.5').toString());
  assert.equal((await read('totalSupply')).outputs[0].value, parseEther('999990').toString());
});
await check('contract read validates malformed arguments', async () => {
  await request(`/api/contract/${contracts.SampleToken}/read`, { status: 400, body: { functionName: 'balanceOf', args: ['invalid'] } });
});
await check('contract read rejects a write function', async () => {
  await request(`/api/contract/${contracts.SampleToken}/read`, { status: 400, body: { functionName: 'transfer', args: [alice, '1'] } });
});
await check('failed transaction exposes decoded custom revert and call trace', async () => {
  const failed = transactions.find((t) => t.status === 0);
  const result = await request(`/api/transaction/${failed.hash}/trace`);
  assert(result.flat.length > 0);
  assert.match(result.revertReason, /NotOwner/);
});
await check('calldata decoder uses a verified ABI', async () => {
  const data = encodeFunctionData({ abi: [{ type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }], functionName: 'transfer', args: [alice, 123n] });
  const { decoded } = await request('/api/decode', { body: { data, address: contracts.SampleToken } });
  assert.equal(decoded.name, 'transfer');
  assert.equal(decoded.args[1].value, '123');
});
await check('Etherscan API supports all three token transfer standards', async () => {
  for (const action of ['tokentx', 'tokennfttx', 'token1155tx']) {
    const result = await etherscan('account', action, { address: alice });
    assert.equal(result.status, '1');
    assert(result.result.length > 0);
  }
});
await check('Etherscan ABI, source, balance and receipt APIs', async () => {
  assert.equal((await etherscan('contract', 'getabi', { address: contracts.SampleToken })).status, '1');
  assert.equal((await etherscan('contract', 'getsourcecode', { address: contracts.SampleToken })).result[0].ContractName, 'SampleToken');
  assert.equal((await etherscan('account', 'tokenbalance', { address: alice, contractaddress: contracts.SampleToken })).result, parseEther('5623.5').toString());
  const failed = transactions.find((t) => t.status === 0);
  assert.equal((await etherscan('transaction', 'gettxreceiptstatus', { txhash: failed.hash })).result.status, '0');
});
await check('asynchronous Etherscan verification returns a completed job', async () => {
  const submission = await request('/api', { body: { module: 'contract', action: 'verifysourcecode', contractaddress: contracts.SampleToken, codeformat: 'solidity-standard-json-input', sourceCode, contractname: 'contracts/Samples.sol:SampleToken', compilerversion: deployment.compilerVersion } });
  assert.equal(submission.status, '1');
  let result;
  const deadline = Date.now() + 30_000;
  do {
    result = await etherscan('contract', 'checkverifystatus', { guid: submission.result });
    if (result.status === '1') break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  } while (Date.now() < deadline);
  assert.equal(result.status, '1', result.result);
});
await check('verification worker recovers a job abandoned by a restarted process', async () => {
  const uri = new URL(process.env.MONGODB_URI);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname));
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const guid = `recovery-${randomUUID()}`;
    await client.db().collection('verificationjobs').insertOne({ guid, address: contracts.SampleToken, status: 'pending', createdAt: new Date(), leaseOwner: 'terminated-test-process', leaseExpiresAt: new Date(0), attempts: 1, request: { address: contracts.SampleToken, codeFormat: 'solidity-standard-json-input', sourceCode, compilerVersion: deployment.compilerVersion, contractName: 'contracts/Samples.sol:SampleToken' } });
    const deadline = Date.now() + 20_000;
    let job;
    do {
      job = await client.db().collection('verificationjobs').findOne({ guid });
      if (job.status !== 'pending') break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } while (Date.now() < deadline);
    assert.equal(job.status, 'pass');
    assert.equal(job.request, undefined, 'Completed jobs must discard source request payloads');
  } finally { await client.close(); }
});
await check('search filters restrict suggestions and direct resolution', async () => {
  const token = contracts.SampleToken;
  assert.equal((await request(`/api/search?resolve=1&f=address&q=${token}`)).result.type, 'address');
  assert.equal((await request(`/api/search?resolve=1&f=token&q=${token}`)).result.type, 'token');
  assert.equal((await request('/api/search?q=Sample&f=block')).results.length, 0);
});
await check('signed transaction broadcast and continued indexing', async () => {
  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const wallet = createWalletClient({ account, transport: http(rpcUrl) });
  const prepared = await wallet.prepareTransactionRequest({ account, to: carol, value: 1n, chain: null });
  const signedTransaction = await wallet.signTransaction(prepared);
  const result = await request('/api/broadcast', { body: { signedTransaction } });
  assert.equal(result.ok, true);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: result.hash });
  assert.equal(receipt.status, 'success');
  await waitIndexed(Number(receipt.blockNumber));
  assert.equal((await request(`/api/transaction/${result.hash}`)).transaction.hash, result.hash);
});
await check('pending transaction API exposes the mempool', async () => {
  await publicClient.request({ method: 'evm_setAutomine', params: [false] });
  try {
    const hash = await publicClient.request({ method: 'eth_sendTransaction', params: [{ from: owner, to: carol, value: '0x2' }] });
    const { transactions: pending } = await request('/api/pending');
    assert(pending.some((t) => t.hash === hash));
  } finally {
    await publicClient.request({ method: 'evm_setAutomine', params: [true] });
    await publicClient.request({ method: 'evm_mine', params: [] });
  }
});
await check('same-height reorg removes orphaned transactions and restores token state', async () => {
  await waitIndexed(Number(await publicClient.getBlockNumber()));
  const originalSupply = (await request(`/api/token/${contracts.SampleToken}`)).totalSupply;
  const snapshot = await publicClient.request({ method: 'evm_snapshot', params: [] });
  let needsRevert = true;
  try {
    const data = encodeFunctionData({ abi: [{ type: 'function', name: 'burn', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }], functionName: 'burn', args: [parseEther('1')] });
    const orphanHash = await publicClient.request({ method: 'eth_sendTransaction', params: [{ from: owner, to: contracts.SampleToken, data }] });
    const orphan = await publicClient.waitForTransactionReceipt({ hash: orphanHash });
    await waitIndexed(Number(orphan.blockNumber));
    assert.equal(await publicClient.request({ method: 'evm_revert', params: [snapshot] }), true);
    needsRevert = false;
    const replacementHash = await publicClient.request({ method: 'eth_sendTransaction', params: [{ from: owner, to: carol, value: '0x3' }] });
    const replacement = await publicClient.waitForTransactionReceipt({ hash: replacementHash });
    assert.equal(replacement.blockNumber, orphan.blockNumber);
    const deadline = Date.now() + 30_000;
    let block;
    while (Date.now() < deadline) {
      block = await request(`/api/block/${Number(replacement.blockNumber)}`);
      if (block.source === 'db' && block.block.hash === replacement.blockHash) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    assert.equal(block.source, 'db', 'Canonical replacement must be persisted, not served by RPC fallback');
    assert.equal(block.block.hash, replacement.blockHash);
    assert.equal((await request(`/api/token/${contracts.SampleToken}`)).totalSupply, originalSupply);
    assert.equal((await request('/api/transactions?limit=100')).transactions.some((t) => t.hash === orphanHash), false);
  } finally {
    if (needsRevert) await publicClient.request({ method: 'evm_revert', params: [snapshot] });
  }
});
await check('invalid API inputs return client errors', async () => {
  await request('/api/address/not-an-address', { status: 400 });
  await request('/api/transaction/0x123', { status: 400 });
  await request('/api/broadcast', { status: 400, body: { signedTransaction: 'invalid' } });
  await request('/api/indexer', { status: 401, body: {} });
});
await check('address CSV export includes seeded transaction history', async () => {
  const csv = await request(`/api/address/${alice}/export`);
  assert.match(csv, /hash/i);
  assert.match(csv, new RegExp(alice));
});
for (const path of [
  '/api/stats', '/api/gas', '/api/ticker', '/api/accounts', '/api/verified-contracts', '/api/charts/tx',
  `/api/address/${alice}`, `/api/address/${alice}/transactions`, `/api/contract/${contracts.SampleToken}`,
  '/api/search?q=Sample', '/api/search?resolve=1&q=1',
]) await check(`REST ${path}`, () => request(path));

const failed = transactions.find((t) => t.status === 0);
const pages = [
  '/', '/blocks', '/blocks?p=2', '/txs', '/txs?p=2', '/txs?block=1', '/txsPending', '/txsInternal', '/withdrawals', '/accounts',
  '/tokens', '/tokens?q=SUSD', '/nft-tokens', '/tokentxns', '/nft-transfers', '/contractsVerified', '/gastracker', '/status', '/charts', '/chart/tx', '/apis',
  '/verifyContract', '/unitconverter', '/inputdatadecoder', '/pushTx', '/verifySignature', '/search?q=Sample', '/block/1', '/block/1?tab=consensus', '/chart/block-time',
  `/tx/${failed?.hash}`, `/tx/${failed?.hash}?tab=trace`, `/tx/${failed?.hash}?tab=logs`, `/address/${alice}`, `/address/${alice}?tab=erc20`, `/address/${alice}?tab=nft`,
  ...['code', 'read', 'write'].map((sub) => `/address/${contracts.SampleToken}?tab=contract&sub=${sub}`),
  ...Object.values(contracts).map((address) => `/address/${address}`),
  ...[contracts.SampleToken, contracts.SampleNFT, contracts.SampleMultiToken].flatMap((address) => [`/token/${address}`, `/token/${address}?tab=holders`]),
  `/token/${contracts.SampleNFT}?tab=inventory`, `/token/${contracts.SampleNFT}?tab=inventory&id=1`, `/token/${contracts.SampleMultiToken}?tab=inventory`,
];
for (const path of pages) await check(`page ${path}`, async () => {
  const html = await request(path);
  assert(!html.includes('Something went wrong'), 'Page rendered an error boundary');
  assert(!html.includes('NEXT_HTTP_ERROR_FALLBACK;404'), 'Page rendered a not-found boundary');
});
const failures = results.filter((r) => !r.ok);
writeFileSync(new URL('./out/smoke-results.json', import.meta.url), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failures.length, failed: failures.length, results }, null, 2));
console.log(`\n${results.length - failures.length}/${results.length} checks passed.`);
process.exitCode = failures.length ? 1 : 0;
