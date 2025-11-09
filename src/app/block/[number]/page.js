import Link from "next/link";
import { FaCube, FaUserSecret, FaGasPump, FaListOl, FaHashtag, FaClock, FaExchangeAlt, FaArrowLeft, FaEthereum, FaArrowRight, FaArrowLeft as FaArrowLeftIcon } from "react-icons/fa";
import Footer from "../../components/Footer";

async function getBlockData(number) {
  const res = await fetch(`/api/block/${number}`, { next: { revalidate: 10 } });
  if (!res.ok) {
    throw new Error("Failed to fetch block data");
  }
  return res.json();
}

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatEther(wei) {
  return (Number(wei) / 1e18).toFixed(6);
}

function truncateHash(hash, start = 10, end = 8) {
  if (!hash) return "";
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

export default async function BlockPage({ params }) {
  const { number } = params;
  let block, transactions, navigation, error;
  
  try {
    const data = await getBlockData(number);
    block = data.block;
    transactions = data.transactions;
    navigation = data.navigation;
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-red-400 text-center p-8">Error: {error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8">Block not found.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const gasUsedPercent = block.gasLimit ? ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2) : 0;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 flex items-center justify-center gap-3">
            <FaEthereum className="inline text-cyan-300 mb-1" /> Ethereum Explorer
          </h1>
        </header>

        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700 font-semibold text-lg">
            <FaArrowLeft className="text-xl" /> Go Back to Explorer
          </Link>
          {navigation && (
            <div className="flex items-center gap-2">
              {navigation.previous && (
                <Link href={`/block/${navigation.previous}`} className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700">
                  <FaArrowLeftIcon /> Previous
                </Link>
              )}
              {navigation.next && (
                <Link href={`/block/${navigation.next}`} className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700">
                  Next <FaArrowRight />
                </Link>
              )}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
          <FaCube className="text-cyan-300" /> Block #{formatNumber(block.number)}
        </h1>

        {/* Block Overview */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Block Hash</div>
              <div className="font-mono break-all text-cyan-300">{block.hash}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Parent Hash</div>
              <div className="font-mono break-all text-purple-300">
                {block.parentHash ? (
                  <Link href={`/block/${block.number - 1}`} className="hover:underline">
                    {truncateHash(block.parentHash)}
                  </Link>
                ) : (
                  truncateHash(block.parentHash)
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Timestamp</div>
              <div>{new Date(block.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Miner</div>
              <div className="font-mono text-purple-300">
                <Link href={`/address/${block.miner}`} className="hover:underline">
                  {truncateHash(block.miner)}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Gas Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-green-400" />
              <div className="text-gray-400 text-sm">Gas Used</div>
            </div>
            <div className="text-xl font-bold text-green-300">{formatNumber(block.gasUsed)}</div>
            <div className="text-xs text-gray-500 mt-1">{gasUsedPercent}% of limit</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-blue-400" />
              <div className="text-gray-400 text-sm">Gas Limit</div>
            </div>
            <div className="text-xl font-bold text-blue-300">{formatNumber(block.gasLimit)}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaListOl className="text-pink-400" />
              <div className="text-gray-400 text-sm">Transactions</div>
            </div>
            <div className="text-xl font-bold text-pink-300">{block.transactionCount}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-yellow-400" />
              <div className="text-gray-400 text-sm">Base Fee</div>
            </div>
            <div className="text-xl font-bold text-yellow-300">
              {block.baseFeePerGas ? `${(Number(block.baseFeePerGas) / 1e9).toFixed(2)} Gwei` : "N/A"}
            </div>
          </div>
        </div>

        {/* Additional Block Details */}
        {block.difficulty && (
          <div className="bg-gray-800 rounded-xl p-4 mb-8 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-cyan-300">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Difficulty</div>
                <div className="font-mono">{formatNumber(block.difficulty)}</div>
              </div>
              {block.totalDifficulty && (
                <div>
                  <div className="text-gray-400">Total Difficulty</div>
                  <div className="font-mono">{formatNumber(block.totalDifficulty)}</div>
                </div>
              )}
              {block.size && (
                <div>
                  <div className="text-gray-400">Size</div>
                  <div>{formatNumber(block.size)} bytes</div>
                </div>
              )}
              {block.extraData && (
                <div>
                  <div className="text-gray-400">Extra Data</div>
                  <div className="font-mono break-all text-xs">{block.extraData}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transactions */}
        <h2 className="text-2xl font-semibold mb-4 text-cyan-300 flex items-center gap-2">
          <FaExchangeAlt className="text-cyan-300" /> Transactions ({transactions?.length || 0})
        </h2>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          {transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-sm">
                    <th className="p-2 font-semibold">Tx Hash</th>
                    <th className="p-2 font-semibold">From</th>
                    <th className="p-2 font-semibold">To</th>
                    <th className="p-2 font-semibold text-right">Value (ETH)</th>
                    <th className="p-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.hash} className="border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
                      <td className="p-2 font-mono text-cyan-300 break-all">
                        <Link href={`/transaction/${tx.hash}`} className="hover:underline">
                          {truncateHash(tx.hash)}
                        </Link>
                      </td>
                      <td className="p-2 font-mono text-purple-300 break-all">
                        <Link href={`/address/${tx.from}`} className="hover:underline">
                          {truncateHash(tx.from)}
                        </Link>
                      </td>
                      <td className="p-2 font-mono text-green-300 break-all">
                        {tx.to ? (
                          <Link href={`/address/${tx.to}`} className="hover:underline">
                            {truncateHash(tx.to)}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Contract Creation</span>
                        )}
                      </td>
                      <td className="p-2 text-right">{formatEther(tx.value)}</td>
                      <td className="p-2 text-center">
                        {tx.status === 1 ? (
                          <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">Success</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-600 text-white rounded text-xs">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">No transactions in this block.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
