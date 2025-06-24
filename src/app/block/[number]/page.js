import Link from "next/link";

async function getBlockData(number) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/block/${number}`);
  if (!res.ok) throw new Error("Failed to fetch block data");
  return res.json();
}

export default async function BlockPage({ params }) {
  const { number } = params;
  let block, transactions, error;
  try {
    const data = await getBlockData(number);
    block = data.block;
    transactions = data.transactions;
  } catch (e) {
    error = e.message;
  }

  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!block) return <div className="p-8">Block not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold text-cyan-400 mb-4">Block #{block.number}</h1>
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div><span className="font-semibold">Hash:</span> <span className="font-mono">{block.hash}</span></div>
        <div><span className="font-semibold">Timestamp:</span> {new Date(block.timestamp).toLocaleString()}</div>
        <div><span className="font-semibold">Miner:</span> <span className="font-mono">{block.miner}</span></div>
        <div><span className="font-semibold">Gas Used:</span> {block.gasUsed}</div>
        <div><span className="font-semibold">Gas Limit:</span> {block.gasLimit}</div>
        <div><span className="font-semibold">Base Fee Per Gas:</span> {block.baseFeePerGas}</div>
        <div><span className="font-semibold">Transaction Count:</span> {block.transactionCount}</div>
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-cyan-300">Transactions</h2>
      <div className="bg-gray-800 rounded-lg p-4">
        {transactions.length === 0 ? (
          <div>No transactions in this block.</div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {transactions.map(tx => (
              <li key={tx.hash} className="py-2">
                <Link href={`/transaction/${tx.hash}`} className="text-cyan-400 font-mono hover:underline">{tx.hash}</Link>
                <span className="ml-2 text-gray-400">from</span> <span className="font-mono text-purple-400">{tx.from}</span>
                <span className="ml-2 text-gray-400">to</span> <span className="font-mono text-purple-400">{tx.to}</span>
                <span className="ml-2 text-gray-400">value</span> <span className="font-mono">{(Number(tx.value) / 1e18).toFixed(4)} ETH</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6">
        <Link href="/" className="text-cyan-300 hover:underline">← Back to Explorer</Link>
      </div>
    </div>
  );
} 