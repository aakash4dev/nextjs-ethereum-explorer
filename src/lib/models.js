/**
 * MongoDB schemas.
 *
 * Conventions
 *  - Addresses and hashes are stored lowercase.
 *  - Wei / token amounts are decimal strings (uint256 does not fit a double).
 *    Where we need to sort or chart an amount, a `*Num` double approximation is
 *    stored next to the exact string.
 *  - Gas quantities fit comfortably in a double and are stored as Number.
 *  - Every write performed by the indexer is an idempotent upsert keyed by a
 *    natural key, so re-processing a block (crash recovery, reorgs) is safe.
 */
import mongoose from 'mongoose';

const { Schema } = mongoose;
const opts = { versionKey: false, timestamps: false };

const blockSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    hash: { type: String, required: true, unique: true },
    parentHash: { type: String, required: true },
    timestamp: { type: Date, required: true, index: true },
    miner: { type: String, required: true, index: true },
    gasUsed: { type: Number, required: true },
    gasLimit: { type: Number, required: true },
    baseFeePerGas: { type: String, default: null },
    burntFees: { type: String, default: '0' },
    priorityFees: { type: String, default: '0' },
    transactionCount: { type: Number, default: 0 },
    internalTxCount: { type: Number, default: 0 },
    size: { type: Number, default: null },
    extraData: String,
    difficulty: String,
    totalDifficulty: String,
    nonce: String,
    mixHash: String,
    sha3Uncles: String,
    uncles: [String],
    stateRoot: String,
    transactionsRoot: String,
    receiptsRoot: String,
    logsBloom: String,
    withdrawalsRoot: { type: String, default: null },
    withdrawalCount: { type: Number, default: 0 },
    blobGasUsed: { type: Number, default: null },
    excessBlobGas: { type: Number, default: null },
    parentBeaconBlockRoot: { type: String, default: null },
    requestsHash: { type: String, default: null },
    indexedAt: { type: Date, default: Date.now },
  },
  opts,
);

const transactionSchema = new Schema(
  {
    hash: { type: String, required: true, unique: true },
    blockNumber: { type: Number, required: true },
    blockHash: { type: String, required: true },
    timestamp: { type: Date, required: true },
    transactionIndex: { type: Number, required: true },
    from: { type: String, required: true },
    to: { type: String, default: null },
    value: { type: String, required: true },
    valueNum: { type: Number, default: 0 },
    gas: { type: Number, required: true },
    gasPrice: { type: String, default: null },
    maxFeePerGas: { type: String, default: null },
    maxPriorityFeePerGas: { type: String, default: null },
    maxFeePerBlobGas: { type: String, default: null },
    blobVersionedHashes: { type: [String], default: undefined },
    nonce: { type: Number, required: true },
    input: { type: String, default: '0x' },
    methodId: { type: String, default: null },
    status: { type: Number, default: null }, // 1 success, 0 failure, null pre-Byzantium
    contractAddress: { type: String, default: null },
    cumulativeGasUsed: { type: Number, default: null },
    gasUsed: { type: Number, default: null },
    effectiveGasPrice: { type: String, default: null },
    fee: { type: String, default: '0' },
    burntFee: { type: String, default: '0' },
    blobGasUsed: { type: Number, default: null },
    blobGasPrice: { type: String, default: null },
    type: { type: Number, default: 0 },
    chainId: { type: Number, default: null },
    v: String,
    r: String,
    s: String,
    yParity: { type: Number, default: null },
    accessList: { type: Schema.Types.Mixed, default: undefined },
    authorizationList: { type: Schema.Types.Mixed, default: undefined },
    logsCount: { type: Number, default: 0 },
  },
  opts,
);
transactionSchema.index({ blockNumber: -1, transactionIndex: -1 });
transactionSchema.index({ from: 1, blockNumber: -1, transactionIndex: -1 });
transactionSchema.index({ to: 1, blockNumber: -1, transactionIndex: -1 });
transactionSchema.index({ contractAddress: 1 }, { sparse: true });
transactionSchema.index({ timestamp: -1 });

const logSchema = new Schema(
  {
    txHash: { type: String, required: true, index: true },
    blockNumber: { type: Number, required: true },
    blockHash: String,
    transactionIndex: Number,
    logIndex: { type: Number, required: true },
    address: { type: String, required: true },
    topic0: { type: String, default: null },
    topic1: { type: String, default: null },
    topic2: { type: String, default: null },
    topic3: { type: String, default: null },
    data: { type: String, default: '0x' },
    timestamp: Date,
  },
  opts,
);
logSchema.index({ blockNumber: 1, logIndex: 1 }, { unique: true });
logSchema.index({ address: 1, blockNumber: -1, logIndex: -1 });
logSchema.index({ topic0: 1, blockNumber: -1 });

const tokenTransferSchema = new Schema(
  {
    txHash: { type: String, required: true, index: true },
    blockNumber: { type: Number, required: true },
    logIndex: { type: Number, required: true },
    batchIndex: { type: Number, default: 0 },
    timestamp: Date,
    token: { type: String, required: true },
    tokenType: { type: String, enum: ['ERC20', 'ERC721', 'ERC1155'], required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    value: { type: String, default: '1' },
    tokenId: { type: String, default: null },
    operator: { type: String, default: null },
  },
  opts,
);
tokenTransferSchema.index({ blockNumber: 1, logIndex: 1, batchIndex: 1 }, { unique: true });
tokenTransferSchema.index({ token: 1, blockNumber: -1, logIndex: -1 });
tokenTransferSchema.index({ from: 1, tokenType: 1, blockNumber: -1 });
tokenTransferSchema.index({ to: 1, tokenType: 1, blockNumber: -1 });
tokenTransferSchema.index({ tokenType: 1, blockNumber: -1, logIndex: -1 });
tokenTransferSchema.index({ token: 1, tokenId: 1, blockNumber: -1 }, { sparse: true });
tokenTransferSchema.index({ timestamp: -1 });

const tokenSchema = new Schema(
  {
    address: { type: String, required: true, unique: true },
    type: { type: String, enum: ['ERC20', 'ERC721', 'ERC1155'], required: true, index: true },
    name: { type: String, default: null },
    symbol: { type: String, default: null },
    decimals: { type: Number, default: null },
    totalSupply: { type: String, default: null },
    totalSupplyNum: { type: Number, default: 0 },
    holdersCount: { type: Number, default: 0, index: true },
    firstSeenBlock: Number,
    lastTransferBlock: Number,
    metadataFetchedAt: Date,
  },
  opts,
);
tokenSchema.index({ name: 'text', symbol: 'text' });
tokenSchema.index({ symbol: 1 });

const tokenBalanceSchema = new Schema(
  {
    token: { type: String, required: true },
    holder: { type: String, required: true },
    tokenId: { type: String, default: '' }, // ERC-1155 only
    tokenType: { type: String, required: true },
    balance: { type: String, default: '0' },
    balanceNum: { type: Number, default: 0 },
    blockNumber: Number,
  },
  opts,
);
tokenBalanceSchema.index({ token: 1, holder: 1, tokenId: 1 }, { unique: true });
tokenBalanceSchema.index({ holder: 1, balanceNum: -1 });
tokenBalanceSchema.index({ token: 1, balanceNum: -1 });

const nftInstanceSchema = new Schema(
  {
    token: { type: String, required: true },
    tokenId: { type: String, required: true },
    tokenType: String,
    owner: { type: String, default: null, index: true },
    lastSeq: { type: Number, default: -1 }, // blockNumber * 1e6 + logIndex
  },
  opts,
);
nftInstanceSchema.index({ token: 1, tokenId: 1 }, { unique: true });

const internalTxSchema = new Schema(
  {
    txHash: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    timestamp: Date,
    traceAddress: { type: String, required: true }, // "0.2.1", "" for the root call
    type: String, // call | create | create2 | selfdestruct
    callType: String, // call | delegatecall | staticcall | callcode
    from: String,
    to: String,
    value: { type: String, default: '0' },
    gas: Number,
    gasUsed: Number,
    input: String, // truncated to the selector
    error: { type: String, default: null },
  },
  opts,
);
internalTxSchema.index({ txHash: 1, traceAddress: 1 }, { unique: true });
internalTxSchema.index({ from: 1, blockNumber: -1 });
internalTxSchema.index({ to: 1, blockNumber: -1 });
internalTxSchema.index({ blockNumber: -1 });

const withdrawalSchema = new Schema(
  {
    index: { type: Number, required: true, unique: true },
    blockNumber: { type: Number, required: true, index: true },
    validatorIndex: Number,
    address: { type: String, required: true },
    amount: String, // wei
    timestamp: Date,
  },
  opts,
);
withdrawalSchema.index({ address: 1, blockNumber: -1 });

const addressSchema = new Schema(
  {
    address: { type: String, required: true, unique: true },
    balance: { type: String, default: null },
    balanceNum: { type: Number, default: 0 },
    balanceBlock: { type: Number, default: null },
    isContract: { type: Boolean, default: false },
    codeChecked: { type: Boolean, default: false },
    creator: { type: String, default: null },
    creationTxHash: { type: String, default: null },
    creationBlock: { type: Number, default: null },
    firstSeenBlock: Number,
    lastSeenBlock: Number,
  },
  opts,
);
addressSchema.index({ balanceNum: -1 });
addressSchema.index({ creator: 1 }, { sparse: true });

const contractSchema = new Schema(
  {
    address: { type: String, required: true, unique: true },
    name: String,
    compilerType: { type: String, default: 'solidity' },
    compilerVersion: String,
    optimizationUsed: Boolean,
    runs: Number,
    evmVersion: String,
    licenseType: String,
    sourceFiles: [{ _id: false, path: String, content: String }],
    compilationTarget: String,
    settings: Schema.Types.Mixed,
    abi: Schema.Types.Mixed,
    constructorArguments: { type: String, default: '' },
    libraries: Schema.Types.Mixed,
    matchType: { type: String, enum: ['full', 'partial'] },
    verifiedAt: { type: Date, default: Date.now, index: true },
  },
  opts,
);
contractSchema.index({ name: 1 });

const verificationJobSchema = new Schema(
  {
    guid: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    status: { type: String, enum: ['pending', 'pass', 'fail'], default: 'pending' },
    message: String,
    request: Schema.Types.Mixed,
    leaseOwner: String,
    leaseExpiresAt: Date,
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
    finishedAt: Date,
  },
  opts,
);
verificationJobSchema.index({ status: 1, leaseExpiresAt: 1, createdAt: 1 });

const signatureSchema = new Schema(
  {
    hash: { type: String, required: true }, // 4-byte selector or 32-byte topic
    signature: { type: String, required: true },
    type: { type: String, enum: ['function', 'event', 'error'], required: true },
    source: { type: String, default: 'verified' },
  },
  opts,
);
signatureSchema.index({ hash: 1, signature: 1 }, { unique: true });

const dailyStatSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
    blockCount: Number,
    txCount: Number,
    failedTxCount: Number,
    gasUsed: Number,
    avgGasLimit: Number,
    avgGasPrice: Number, // wei
    avgBlockTime: Number, // seconds
    avgBlockSize: Number, // bytes
    totalFees: Number, // ether (approximate)
    burntFees: Number, // ether (approximate)
    activeAddresses: Number,
    contractsDeployed: Number,
    tokenTransfers: Number,
    avgBaseFee: Number, // wei
    updatedAt: Date,
  },
  opts,
);

const indexerStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    lastProcessedBlock: { type: Number, default: -1 },
    headBlock: { type: Number, default: null },
    lastSyncedAt: Date,
    lastBatchMs: Number,
    syncError: { type: String, default: null },
    lockOwner: { type: String, default: null },
    lockExpiresAt: { type: Date, default: null },
    traceMode: { type: String, default: null },
    reorgCount: { type: Number, default: 0 },
    lastReorgAt: Date,
    lastStatsAt: Date,
    schemaVersion: { type: Number, default: 2 },
  },
  opts,
);

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const Block = model('Block', blockSchema);
export const Transaction = model('Transaction', transactionSchema);
export const Log = model('Log', logSchema);
export const TokenTransfer = model('TokenTransfer', tokenTransferSchema);
export const Token = model('Token', tokenSchema);
export const TokenBalance = model('TokenBalance', tokenBalanceSchema);
export const NftInstance = model('NftInstance', nftInstanceSchema);
export const InternalTx = model('InternalTx', internalTxSchema);
export const Withdrawal = model('Withdrawal', withdrawalSchema);
export const Address = model('Address', addressSchema);
export const Contract = model('Contract', contractSchema);
export const VerificationJob = model('VerificationJob', verificationJobSchema);
export const Signature = model('Signature', signatureSchema);
export const DailyStat = model('DailyStat', dailyStatSchema);
export const IndexerState = model('IndexerState', indexerStateSchema);

export const ALL_MODELS = [
  Block,
  Transaction,
  Log,
  TokenTransfer,
  Token,
  TokenBalance,
  NftInstance,
  InternalTx,
  Withdrawal,
  Address,
  Contract,
  VerificationJob,
  Signature,
  DailyStat,
  IndexerState,
];

export const SCHEMA_VERSION = 2;
