import Link from "next/link";
import { FaCube, FaUserSecret, FaGasPump, FaListOl, FaHashtag, FaClock, FaExchangeAlt, FaArrowLeft, FaEthereum } from "react-icons/fa";
import Footer from "../../components/Footer";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getBlockData(number) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/block/${number}`);
  if (!res.ok) {
    console.error("Failed to fetch block data:", await res.text());
    throw new Error("Failed to fetch block data");
  }
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
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 flex items-center justify-center gap-3">
            <FaEthereum className="inline text-cyan-300 mb-1" /> Ethereum Explorer
          </h1>
          <p className="text-gray-400 mt-2">A simple block explorer powered by Next.js, MongoDB, and Web3.js</p>
          <p className="text-gray-300 mt-3 flex items-center justify-center gap-2">🚀 Need a custom blockchain explorer for your project? <span className="text-cyan-400">👉</span> Reach out on <a href="https://linkedin.com/in/aakash4dev" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-semibold">LinkedIn</a> for tailored solutions! <span className="text-yellow-300">��</span></p>
        </header>
        {/* Back to Explorer button at the top */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700 font-semibold text-lg">
            <FaArrowLeft className="text-xl" /> Go Back to Explorer
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-2"><FaCube className="text-cyan-300" /> Block #{block.number}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaHashtag className="text-cyan-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Block Hash</div>
              <div className="font-mono break-all text-sm">{block.hash}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaClock className="text-yellow-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Timestamp</div>
              <div>{new Date(block.timestamp).toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaUserSecret className="text-purple-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Miner</div>
              <div className="font-mono text-purple-300 text-sm">{block.miner}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaGasPump className="text-green-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Gas Used / Limit</div>
              <div>{block.gasUsed} / {block.gasLimit}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaListOl className="text-pink-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Tx Count</div>
              <div>{block.transactionCount}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaGasPump className="text-blue-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Base Fee Per Gas</div>
              <div>{block.baseFeePerGas}</div>
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-cyan-300 flex items-center gap-2"><FaExchangeAlt className="text-cyan-300" /> Transactions</h2>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          {transactions.length === 0 ? (
            <div>No transactions in this block.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-sm">
                    <th className="p-2 font-semibold"><FaHashtag className="inline mr-1 text-cyan-400" /> Tx Hash</th>
                    <th className="p-2 font-semibold"><FaUserSecret className="inline mr-1 text-purple-400" /> From</th>
                    <th className="p-2 font-semibold"><FaUserSecret className="inline mr-1 text-green-400" /> To</th>
                    <th className="p-2 font-semibold text-right"><FaExchangeAlt className="inline mr-1 text-yellow-400" /> Value (ETH)</th>
                    <th className="p-2 font-semibold text-center">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.hash} className="border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
                      <td className="p-2 font-mono text-cyan-300 break-all">
                        <Link href={`/transaction/${tx.hash}`} className="hover:underline">{tx.hash}</Link>
                      </td>
                      <td className="p-2 font-mono text-purple-300 break-all">{tx.from}</td>
                      <td className="p-2 font-mono text-green-300 break-all">{tx.to}</td>
                      <td className="p-2 text-right">{(Number(tx.value) / 1e18).toFixed(4)}</td>
                      <td className="p-2 text-center">
                        <Link href={`/transaction/${tx.hash}`} className="text-cyan-400 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
} 