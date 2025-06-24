import Link from "next/link";
import { FaExchangeAlt, FaCube, FaUserSecret, FaGasPump, FaHashtag, FaArrowRight, FaListOl, FaArrowLeft, FaEthereum } from "react-icons/fa";
import Footer from "../../components/Footer";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getTransactionData(hash) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/transaction/${hash}`);
  if (!res.ok) {
    console.error("Failed to fetch transaction data:", await res.text());
    throw new Error("Failed to fetch transaction data");
  }
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
        <h1 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-2"><FaExchangeAlt className="text-cyan-300" /> Transaction</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaHashtag className="text-cyan-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Tx Hash</div>
              <div className="font-mono break-all text-sm">{tx.hash}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaCube className="text-yellow-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Block Number</div>
              <div><Link href={`/block/${tx.blockNumber}`} className="text-cyan-300 hover:underline">{tx.blockNumber}</Link></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaUserSecret className="text-purple-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">From</div>
              <div className="font-mono text-purple-300 text-sm break-all">{tx.from}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaArrowRight className="text-green-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">To</div>
              <div className="font-mono text-purple-300 text-sm break-all">{tx.to}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaListOl className="text-pink-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Nonce</div>
              <div>{tx.nonce}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaGasPump className="text-blue-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Gas / Gas Price</div>
              <div>{tx.gas} / {tx.gasPrice}</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3 border border-gray-700">
            <FaExchangeAlt className="text-yellow-400 text-xl" />
            <div>
              <div className="text-gray-400 text-xs">Value</div>
              <div>{(Number(tx.value) / 1e18).toFixed(4)} ETH</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 