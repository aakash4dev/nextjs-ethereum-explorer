import Web3 from 'web3';
import dbConnect, { Block, Transaction } from '@/lib/mongodb';

const web3 = new Web3(process.env.ETHEREUM_RPC_URL);

export async function runIndexer() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');
    
    const latestBlockNumber = await web3.eth.getBlockNumber();
    console.log(`Latest block number: ${latestBlockNumber}`);
    
    const blocksToIndex = 10;
    let indexedCount = 0;
    
    for (let i = 0; i < blocksToIndex; i++) {
      const blockNumber = latestBlockNumber - BigInt(i);
      console.log(`Processing block ${blockNumber.toString()} (${i + 1}/${blocksToIndex})`);
      
      try {
        const block = await web3.eth.getBlock(Number(blockNumber), true);
        if (!block) {
          console.log(`Block ${blockNumber} not found, skipping.`);
          continue;
        }
        
        // Save block to database
        await Block.updateOne(
          { number: Number(block.number) },
          {
            $set: {
              hash: block.hash,
              timestamp: new Date(Number(block.timestamp) * 1000),
              miner: block.miner,
              gasUsed: block.gasUsed?.toString(),
              gasLimit: block.gasLimit?.toString(),
              baseFeePerGas: block.baseFeePerGas ? block.baseFeePerGas.toString() : '0',
              transactionCount: block.transactions.length,
            },
          },
          { upsert: true }
        );
        
        console.log(`Block ${blockNumber} saved with ${block.transactions.length} transactions`);
        
        // Save transactions to database
        if (block.transactions && block.transactions.length > 0) {
          const transactionPromises = block.transactions.map((tx) =>
            Transaction.updateOne(
              { hash: tx.hash },
              {
                $set: {
                  blockNumber: Number(tx.blockNumber),
                  from: tx.from,
                  to: tx.to,
                  value: tx.value?.toString(),
                  gas: tx.gas?.toString(),
                  gasPrice: tx.gasPrice?.toString(),
                  nonce: typeof tx.nonce === 'bigint' ? Number(tx.nonce) : tx.nonce,
                },
              },
              { upsert: true }
            )
          );
          await Promise.all(transactionPromises);
          console.log(`Saved ${block.transactions.length} transactions for block ${blockNumber}`);
        }
        
        indexedCount++;
        
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
        continue;
      }
    }
    
    console.log(`Indexing complete. Indexed ${indexedCount} blocks.`);
    return { message: `Successfully indexed ${indexedCount} blocks.` };
    
  } catch (error) {
    console.error('Indexer error:', error);
    throw error;
  }
} 