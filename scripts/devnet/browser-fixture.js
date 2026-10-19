#!/usr/bin/env node
/** Small, unverified contract and signed inputs for browser acceptance tests. */
import './load-env.js';
import solc from 'solc';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, encodeFunctionData, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const source = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract BrowserCounter { uint256 public count; function setCount(uint256 value) external { count = value; } }';
const rpcUrl = process.env.ETHEREUM_RPC_URL;
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(rpcUrl).hostname)) throw new Error('Browser fixtures require a loopback RPC');
const publicClient = createPublicClient({ transport: http(rpcUrl), pollingInterval: 100 });
if (await publicClient.getChainId() !== 31337) throw new Error('Browser fixtures require chain 31337');
const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const wallet = createWalletClient({ account, transport: http(rpcUrl) });
const input = { language: 'Solidity', sources: { 'BrowserCounter.sol': { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } };
const artifact = JSON.parse(solc.compile(JSON.stringify(input))).contracts['BrowserCounter.sol'].BrowserCounter;
const receipt = await publicClient.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}`, chain: null }) });
await publicClient.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: receipt.contractAddress, abi: artifact.abi, functionName: 'setCount', args: [7n], chain: null }) });
const prepared = await wallet.prepareTransactionRequest({ to: receipt.contractAddress, data: encodeFunctionData({ abi: artifact.abi, functionName: 'setCount', args: [9n] }), chain: null });
const fixture = { address: receipt.contractAddress, source, compilerVersion: `v${solc.version().replace('.Emscripten.clang', '')}`, calldata: encodeFunctionData({ abi: artifact.abi, functionName: 'setCount', args: [7n] }), signedTransaction: await wallet.signTransaction(prepared), signer: account.address, message: 'Explorer browser acceptance test', signature: await account.signMessage({ message: 'Explorer browser acceptance test' }) };
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/browser-fixture.json', import.meta.url), JSON.stringify(fixture, null, 2));
console.log(JSON.stringify(fixture, null, 2));
