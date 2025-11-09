import Web3 from 'web3';
import dbConnect, { Block, Transaction, Address, IndexerState } from '@/lib/mongodb';

const web3 = new Web3(process.env.ETHEREUM_RPC_URL);
const BATCH_SIZE = parseInt(process.env.INDEXER_BATCH_SIZE || '10', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry with exponential backoff
async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(RETRY_DELAY * Math.pow(2, i));
    }
  }
}

// Get or create indexer state
async function getIndexerState() {
  let state = await IndexerState.findOne({ key: 'sync_state' });
  if (!state) {
    const startBlock = parseInt(process.env.START_BLOCK || '0', 10);
    state = await IndexerState.create({
      key: 'sync_state',
      lastProcessedBlock: startBlock - 1,
      isSyncing: false,
      totalBlocksIndexed: 0,
      totalTransactionsIndexed: 0,
    });
  }
  return state;
}

// Update indexer state
async function updateIndexerState(updates) {
  await IndexerState.updateOne(
    { key: 'sync_state' },
    { $set: { ...updates, lastSyncedAt: new Date() } },
    { upsert: true }
  );
}

// Process a single block
async function processBlock(blockNumber) {
  try {
    const block = await retryWithBackoff(() => 
      web3.eth.getBlock(Number(blockNumber), true)
    );

    if (!block) {
      console.log(`Block ${blockNumber} not found, skipping.`);
      return null;
    }

    // Get transaction receipts for status and gas used
    const receipts = await Promise.all(
      block.transactions.map(tx => 
        retryWithBackoff(() => web3.eth.getTransactionReceipt(tx.hash))
      )
    );

    // Prepare block data
    const blockData = {
      number: Number(block.number),
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: new Date(Number(block.timestamp) * 1000),
      miner: block.miner,
      gasUsed: block.gasUsed?.toString() || '0',
      gasLimit: block.gasLimit?.toString() || '0',
      baseFeePerGas: block.baseFeePerGas ? block.baseFeePerGas.toString() : null,
      extraData: block.extraData,
      difficulty: block.difficulty?.toString(),
      totalDifficulty: block.totalDifficulty?.toString(),
      size: block.size,
      transactionCount: block.transactions.length,
      transactionsRoot: block.transactionsRoot,
      stateRoot: block.stateRoot,
      receiptsRoot: block.receiptsRoot,
      sha3Uncles: block.sha3Uncles,
      nonce: block.nonce,
      mixHash: block.mixHash,
      logsBloom: block.logsBloom,
    };

    // Save or update block
    await Block.updateOne(
      { number: Number(block.number) },
      { $set: blockData },
      { upsert: true }
    );

    // Process transactions
    let transactionCount = 0;
    const addressUpdates = new Map();

    if (block.transactions && block.transactions.length > 0) {
      const transactionPromises = block.transactions.map(async (tx, index) => {
        const receipt = receipts[index];
        
        const txData = {
          hash: tx.hash,
          blockNumber: Number(tx.blockNumber),
          blockHash: tx.blockHash || block.hash,
          transactionIndex: Number(tx.transactionIndex),
          from: tx.from,
          to: tx.to || null,
          value: tx.value?.toString() || '0',
          gas: tx.gas?.toString() || '0',
          gasPrice: tx.gasPrice?.toString() || '0',
          maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toString() : null,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? tx.maxPriorityFeePerGas.toString() : null,
          nonce: typeof tx.nonce === 'bigint' ? Number(tx.nonce) : tx.nonce,
          input: tx.input || '0x',
          status: receipt?.status !== undefined ? Number(receipt.status) : 1,
          contractAddress: receipt?.contractAddress || null,
          cumulativeGasUsed: receipt?.cumulativeGasUsed?.toString() || null,
          effectiveGasPrice: receipt?.effectiveGasPrice?.toString() || null,
          gasUsed: receipt?.gasUsed?.toString() || null,
          logsBloom: receipt?.logsBloom || null,
          type: tx.type !== undefined ? Number(tx.type) : 0,
          chainId: tx.chainId ? Number(tx.chainId) : null,
          v: tx.v,
          r: tx.r,
          s: tx.s,
        };

        await Transaction.updateOne(
          { hash: tx.hash },
          { $set: txData },
          { upsert: true }
        );

        transactionCount++;

        // Track addresses
        if (tx.from) {
          const fromAddr = addressUpdates.get(tx.from) || { address: tx.from, transactionCount: 0 };
          fromAddr.transactionCount++;
          addressUpdates.set(tx.from, fromAddr);
        }

        if (tx.to) {
          const toAddr = addressUpdates.get(tx.to) || { address: tx.to, transactionCount: 0 };
          toAddr.transactionCount++;
          addressUpdates.set(tx.to, toAddr);
        }

        // Check if contract creation
        if (receipt?.contractAddress) {
          const contractAddr = addressUpdates.get(receipt.contractAddress) || {
            address: receipt.contractAddress,
            transactionCount: 0,
            isContract: true,
          };
          contractAddr.isContract = true;
          addressUpdates.set(receipt.contractAddress, contractAddr);
        }
      });

      await Promise.all(transactionPromises);
    }

    // Update addresses in batch
    for (const [address, data] of addressUpdates) {
      await Address.updateOne(
        { address },
        {
          $set: {
            lastSeen: new Date(),
            isContract: data.isContract || false,
          },
          $inc: { transactionCount: data.transactionCount },
          $setOnInsert: {
            firstSeen: new Date(),
            balance: '0',
          },
        },
        { upsert: true }
      );
    }

    return { blockNumber, transactionCount };
  } catch (error) {
    console.error(`Error processing block ${blockNumber}:`, error.message);
    throw error;
  }
}

// Main indexer function
export async function runIndexer() {
  let state = null;
  try {
    await dbConnect();
    console.log('Connected to MongoDB');

    state = await getIndexerState();
    
    // Check if already syncing
    if (state.isSyncing) {
      console.log('Indexer is already running');
      return { message: 'Indexer is already running', state };
    }

    // Mark as syncing
    await updateIndexerState({ isSyncing: true, syncError: null });

    const latestBlockNumber = await retryWithBackoff(() => web3.eth.getBlockNumber());
    const currentBlock = state.lastProcessedBlock + 1;
    const endBlock = Math.min(Number(latestBlockNumber), currentBlock + BATCH_SIZE - 1);

    console.log(`Syncing from block ${currentBlock} to ${endBlock} (latest: ${latestBlockNumber})`);

    if (currentBlock > Number(latestBlockNumber)) {
      await updateIndexerState({ isSyncing: false });
      return { message: 'Already synced to latest block', state };
    }

    let indexedCount = 0;
    let totalTransactions = 0;

    // Process blocks in batch
    for (let blockNumber = currentBlock; blockNumber <= endBlock; blockNumber++) {
      try {
        const result = await processBlock(blockNumber);
        if (result) {
          indexedCount++;
          totalTransactions += result.transactionCount;
          
          // Update state periodically
          if (indexedCount % 5 === 0) {
            await updateIndexerState({
              lastProcessedBlock: blockNumber,
              totalBlocksIndexed: state.totalBlocksIndexed + indexedCount,
              totalTransactionsIndexed: state.totalTransactionsIndexed + totalTransactions,
            });
            state = await getIndexerState();
          }
        }
      } catch (error) {
        console.error(`Failed to process block ${blockNumber}:`, error.message);
        // Continue with next block
      }
    }

    // Final state update
    await updateIndexerState({
      lastProcessedBlock: endBlock,
      isSyncing: false,
      totalBlocksIndexed: state.totalBlocksIndexed + indexedCount,
      totalTransactionsIndexed: state.totalTransactionsIndexed + totalTransactions,
    });

    console.log(`Indexing complete. Indexed ${indexedCount} blocks with ${totalTransactions} transactions.`);
    
    return {
      message: `Successfully indexed ${indexedCount} blocks with ${totalTransactions} transactions.`,
      indexedCount,
      totalTransactions,
      lastProcessedBlock: endBlock,
    };
  } catch (error) {
    console.error('Indexer error:', error);
    if (state) {
      await updateIndexerState({
        isSyncing: false,
        syncError: error.message,
      });
    }
    throw error;
  }
}

// Continuous sync function (for background service)
export async function startContinuousSync() {
  console.log('Starting continuous sync service...');
  
  while (true) {
    try {
      await runIndexer();
      // Wait before next sync cycle
      await sleep(parseInt(process.env.SYNC_INTERVAL || '5000', 10));
    } catch (error) {
      console.error('Continuous sync error:', error);
      await sleep(10000); // Wait longer on error
    }
  }
}

// Get sync status
export async function getSyncStatus() {
  await dbConnect();
  const state = await getIndexerState();
  const latestBlock = await web3.eth.getBlockNumber();
  
  return {
    ...state.toObject(),
    latestBlockNumber: Number(latestBlock),
    blocksBehind: Number(latestBlock) - state.lastProcessedBlock,
    syncProgress: state.lastProcessedBlock > 0 
      ? ((state.lastProcessedBlock / Number(latestBlock)) * 100).toFixed(2)
      : 0,
  };
}
