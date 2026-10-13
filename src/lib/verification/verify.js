/**
 * Source code verification (Solidity).
 *
 * Supports the same inputs as Etherscan: single-file source with compiler
 * settings, or a full standard-JSON input (multi-file projects, Hardhat /
 * Foundry). Runtime bytecode is compared with immutables masked and libraries
 * linked/auto-detected; constructor arguments are recovered from the creation
 * transaction when it is indexed.
 */
import { randomUUID } from 'node:crypto';
import { dbConnect } from '../db.js';
import { getClient } from '../rpc.js';
import { Address, Contract, Transaction, VerificationJob } from '../models.js';
import { learnSignaturesFromAbi } from '../signatures.js';
import { createLogger } from '../logger.js';
import { compareRuntime, extractConstructorArgs, splitMetadata } from './bytecode.js';
import { compileStandardJson, parseVersion } from './compiler.js';

const log = createLogger('verify');

export class VerificationError extends Error {}

const OUTPUT_SELECTION = {
  '*': {
    '*': ['abi', 'evm.bytecode.object', 'evm.bytecode.linkReferences', 'evm.deployedBytecode.object', 'evm.deployedBytecode.linkReferences', 'evm.deployedBytecode.immutableReferences', 'metadata'],
  },
};

const isTrue = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';

/** Normalise request fields (UI form or Etherscan API names). */
export function normalizeRequest(raw) {
  const libraries = {};
  for (let i = 1; i <= 10; i++) {
    const name = raw[`libraryname${i}`];
    const addr = raw[`libraryaddress${i}`];
    if (name && addr) libraries[name] = addr;
  }
  Object.assign(libraries, raw.libraries ?? {});
  return {
    address: String(raw.address ?? raw.contractaddress ?? '').trim().toLowerCase(),
    codeFormat: raw.codeFormat ?? raw.codeformat ?? 'solidity-single-file',
    sourceCode: raw.sourceCode ?? raw.sourcecode ?? '',
    contractName: String(raw.contractName ?? raw.contractname ?? '').trim(),
    compilerVersion: String(raw.compilerVersion ?? raw.compilerversion ?? '').trim(),
    optimizationUsed: isTrue(raw.optimizationUsed ?? raw.optimizationused),
    runs: Number.parseInt(raw.runs ?? '200', 10) || 200,
    evmVersion: (raw.evmVersion ?? raw.evmversion ?? 'default') || 'default',
    viaIR: isTrue(raw.viaIR ?? raw.viair),
    constructorArguments: String(raw.constructorArguments ?? raw.constructorArguements ?? raw.constructorarguments ?? '').trim().replace(/^0x/, ''),
    licenseType: String(raw.licenseType ?? raw.licensetype ?? ''),
    libraries,
  };
}

function buildInput(req) {
  if (req.codeFormat === 'solidity-standard-json-input') {
    let input;
    try {
      input = typeof req.sourceCode === 'string' ? JSON.parse(req.sourceCode) : req.sourceCode;
    } catch {
      throw new VerificationError('sourceCode is not valid standard JSON input');
    }
    if (input?.language && input.language !== 'Solidity') throw new VerificationError(`Unsupported language ${input.language}`);
    if (!input?.sources || !Object.keys(input.sources).length) throw new VerificationError('Standard JSON input has no sources');
    input.language = 'Solidity';
    input.settings = { ...(input.settings ?? {}), outputSelection: OUTPUT_SELECTION };
    return input;
  }
  if (req.codeFormat !== 'solidity-single-file') throw new VerificationError(`Unsupported code format ${req.codeFormat}`);
  if (!req.sourceCode.trim()) throw new VerificationError('Source code is empty');
  const name = req.contractName.includes(':') ? req.contractName.split(':')[0] : `${req.contractName || 'Contract'}.sol`;
  const libraries = {};
  for (const [k, v] of Object.entries(req.libraries)) {
    const [file, lib] = k.includes(':') ? k.split(':') : [name, k];
    libraries[file] = { ...(libraries[file] ?? {}), [lib]: v };
  }
  return {
    language: 'Solidity',
    sources: { [name]: { content: req.sourceCode } },
    settings: {
      optimizer: { enabled: req.optimizationUsed, runs: req.runs },
      ...(req.evmVersion && req.evmVersion !== 'default' ? { evmVersion: req.evmVersion } : {}),
      ...(req.viaIR ? { viaIR: true } : {}),
      ...(Object.keys(libraries).length ? { libraries } : {}),
      outputSelection: OUTPUT_SELECTION,
    },
  };
}

function candidates(output, contractName) {
  const list = [];
  for (const [file, contracts] of Object.entries(output.contracts ?? {})) {
    for (const [name, c] of Object.entries(contracts)) {
      if (!c.evm?.deployedBytecode?.object) continue;
      const fq = `${file}:${name}`;
      if (contractName && contractName !== name && contractName !== fq) continue;
      list.push({ file, name, fq, contract: c });
    }
  }
  return list;
}

async function findCreationInput(address) {
  const rec = await Address.findOne({ address }).select({ creationTxHash: 1 }).lean();
  if (!rec?.creationTxHash) return null;
  const tx = await Transaction.findOne({ hash: rec.creationTxHash }).select({ input: 1, contractAddress: 1 }).lean();
  // Only top-level CREATE transactions carry the creation code as input.
  if (tx?.contractAddress === address) return tx.input;
  return null;
}

/**
 * Verify and persist. Resolves to { matchType, name, alreadyVerified }.
 * Throws VerificationError for user-facing failures.
 */
export async function verifyContract(rawRequest) {
  const req = normalizeRequest(rawRequest);
  if (!/^0x[0-9a-f]{40}$/.test(req.address)) throw new VerificationError('Invalid contract address');
  if (!parseVersion(req.compilerVersion)) throw new VerificationError('Invalid or missing compiler version');
  await dbConnect();

  const existing = await Contract.findOne({ address: req.address }).select({ matchType: 1, name: 1 }).lean();
  if (existing?.matchType === 'full') {
    return { matchType: 'full', name: existing.name, alreadyVerified: true };
  }

  const onchain = await getClient().getCode({ address: req.address });
  if (!onchain || onchain === '0x') throw new VerificationError('No contract bytecode found at this address');

  const input = buildInput(req);
  let compiled;
  try {
    compiled = await compileStandardJson(input, req.compilerVersion);
  } catch (err) {
    throw new VerificationError(`Compilation failed: ${err.message}`);
  }
  const errors = (compiled.output.errors ?? []).filter((e) => e.severity === 'error');
  if (errors.length) {
    throw new VerificationError(`Compiler error: ${errors.map((e) => e.formattedMessage ?? e.message).join('\n').slice(0, 2000)}`);
  }

  const list = candidates(compiled.output, req.contractName);
  if (!list.length) {
    throw new VerificationError(req.contractName ? `Contract "${req.contractName}" not found in compiler output` : 'No deployable contracts in compiler output');
  }

  let found = null;
  for (const cand of list) {
    const evm = cand.contract.evm;
    const res = compareRuntime(onchain, {
      deployedBytecode: evm.deployedBytecode.object,
      linkReferences: evm.deployedBytecode.linkReferences,
      immutableReferences: evm.deployedBytecode.immutableReferences,
      libraries: req.libraries,
    });
    if (res.match) {
      found = { ...cand, match: res.match, libraries: res.libraries };
      if (res.match === 'full') break;
    }
  }
  if (!found) {
    const [onchainExec] = splitMetadata(onchain);
    throw new VerificationError(
      `Bytecode mismatch: the compiled ${req.contractName || 'contracts'} do not match the deployed code (${onchainExec.length / 2} bytes). Check the compiler version, optimizer settings, EVM version and contract name.`,
    );
  }

  // Constructor arguments: prefer recovering them from the creation tx.
  let constructorArguments = req.constructorArguments;
  const creationInput = await findCreationInput(req.address);
  if (creationInput) {
    const extracted = extractConstructorArgs(creationInput, found.contract.evm.bytecode.object);
    if (extracted !== null) constructorArguments = extracted;
  }

  const metadata = (() => {
    try {
      return JSON.parse(found.contract.metadata ?? '{}');
    } catch {
      return {};
    }
  })();
  const settings = input.settings;
  const doc = {
    address: req.address,
    name: found.name,
    compilerType: 'solidity',
    compilerVersion: `v${compiled.version.replace(/\.Emscripten\.clang$/, '')}`,
    optimizationUsed: Boolean(settings.optimizer?.enabled ?? metadata.settings?.optimizer?.enabled),
    runs: settings.optimizer?.runs ?? metadata.settings?.optimizer?.runs ?? 200,
    evmVersion: settings.evmVersion ?? metadata.settings?.evmVersion ?? 'default',
    licenseType: req.licenseType || null,
    sourceFiles: Object.entries(input.sources).map(([p, s]) => ({ path: p, content: s.content ?? '' })),
    compilationTarget: found.fq,
    settings: { ...settings, outputSelection: undefined },
    abi: found.contract.abi,
    constructorArguments,
    libraries: found.libraries,
    matchType: found.match,
    verifiedAt: new Date(),
  };
  await Contract.updateOne({ address: req.address }, { $set: doc }, { upsert: true });
  await Address.updateOne({ address: req.address }, { $set: { isContract: true, codeChecked: true }, $setOnInsert: { address: req.address } }, { upsert: true });
  learnSignaturesFromAbi(found.contract.abi).catch((err) => log.warn('signature learning failed', { err }));
  log.info('contract verified', { address: req.address, name: found.name, match: found.match });
  return { matchType: found.match, name: found.name, alreadyVerified: false };
}

/** Etherscan-style asynchronous verification: returns a GUID immediately. */
export async function submitVerificationJob(rawRequest) {
  await dbConnect();
  const req = normalizeRequest(rawRequest);
  const guid = randomUUID().replace(/-/g, '') + Date.now().toString(36);
  await VerificationJob.create({ guid, address: req.address, status: 'pending', request: { ...req, sourceCode: undefined } });
  // Run in the background of this server process.
  verifyContract(rawRequest)
    .then((res) => VerificationJob.updateOne({ guid }, { $set: { status: 'pass', message: res.alreadyVerified ? 'Already Verified' : `Pass - Verified (${res.matchType} match)`, finishedAt: new Date() } }))
    .catch((err) => {
      if (!(err instanceof VerificationError)) log.error('verification job crashed', { guid, err });
      return VerificationJob.updateOne({ guid }, { $set: { status: 'fail', message: `Fail - Unable to verify. ${err.message}`, finishedAt: new Date() } });
    });
  return guid;
}

export async function getVerificationJob(guid) {
  await dbConnect();
  const job = await VerificationJob.findOne({ guid: String(guid) }).lean();
  if (!job) return null;
  // A job left pending by a restarted process is reported as failed.
  if (job.status === 'pending' && Date.now() - new Date(job.createdAt).getTime() > 10 * 60_000) {
    return { ...job, status: 'fail', message: 'Fail - Verification timed out' };
  }
  return job;
}

export const SUPPORTED_LICENSES = [
  'None', 'Unlicense', 'MIT', 'GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'BSD-2-Clause', 'BSD-3-Clause',
  'MPL-2.0', 'OSL-3.0', 'Apache-2.0', 'AGPL-3.0', 'BUSL-1.1',
];

