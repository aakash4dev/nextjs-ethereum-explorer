import Link from "next/link";

async function getTransactionData(hash) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/transaction/${hash}`);
  if (!res.ok) throw new Error("Failed to fetch transaction data");
  return res.json();
}

export default async function TransactionPage({ params }) {
  const { hash } = params;
  let tx, error;
  try {
    const data = await getTransactionData(hash);
    tx = data.transaction;
  } catch (e) {
    error = e.message;
  }

  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!tx) return <div className="p-8">Transaction not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold text-cyan-400 mb-4">Transaction</h1>
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div><span className="font-semibold">Hash:</span> <span className="font-mono">{tx.hash}</span></div>
        <div><span className="font-semibold">Block Number:</span> <Link href={`/block/${tx.blockNumber}`} className="text-cyan-300 hover:underline">{tx.blockNumber}</Link></div>
        <div><span className="font-semibold">From:</span> <span className="font-mono text-purple-400">{tx.from}</span></div>
        <div><span className="font-semibold">To:</span> <span className="font-mono text-purple-400">{tx.to}</span></div>
        <div><span className="font-semibold">Value:</span> {(Number(tx.value) / 1e18).toFixed(4)} ETH</div>
        <div><span className="font-semibold">Gas:</span> {tx.gas}</div>
        <div><span className="font-semibold">Gas Price:</span> {tx.gasPrice}</div>
        <div><span className="font-semibold">Nonce:</span> {tx.nonce}</div>
      </div>
      <div className="mt-6">
        <Link href="/" className="text-cyan-300 hover:underline">← Back to Explorer</Link>
      </div>
    </div>
  );
} 