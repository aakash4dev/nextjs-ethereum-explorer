import Link from "next/link";
import { FaExchangeAlt, FaCube, FaUserSecret, FaGasPump, FaHashtag, FaArrowRight, FaListOl, FaArrowLeft, FaEthereum, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Footer from "../../components/Footer";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getTransactionData(hash) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/transaction/${hash}`, { next: { revalidate: 10 } });
  if (!res.ok) {
    throw new Error("Failed to fetch transaction data");
  }
  return res.json();
}

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatEther(wei) {
  return (Number(wei) / 1e18).toFixed(6);
}

function formatGwei(wei) {
  return (Number(wei) / 1e9).toFixed(2);
}

function truncateHash(hash, start = 10, end = 8) {
  if (!hash) return "";
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

export default async function TransactionPage({ params }) {
  const { hash } = params;
  let tx, block, navigation, error;
  
  try {
    const data = await getTransactionData(hash);
    tx = data.transaction;
    block = data.block;
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

  if (!tx) {
    return (
      <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8">Transaction not found.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const isSuccess = tx.status === 1;
  const gasUsed = tx.gasUsed || tx.gas;
  const gasPrice = tx.effectiveGasPrice || tx.gasPrice;
  const gasCost = gasUsed && gasPrice ? (Number(gasUsed) * Number(gasPrice)) / 1e18 : 0;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 flex items-center justify-center gap-3">
            <FaEthereum className="inline text-cyan-300 mb-1" /> Ethereum Explorer
          </h1>
        </header>

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700 font-semibold text-lg">
            <FaArrowLeft className="text-xl" /> Go Back to Explorer
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
          <FaExchangeAlt className="text-cyan-300" /> Transaction
        </h1>

        {/* Status Badge */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-600 rounded-lg">
              <FaCheckCircle className="text-green-400" />
              <span className="text-green-300 font-semibold">Success</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600 rounded-lg">
              <FaTimesCircle className="text-red-400" />
              <span className="text-red-300 font-semibold">Failed</span>
            </div>
          )}
        </div>

        {/* Transaction Overview */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Transaction Hash</div>
              <div className="font-mono break-all text-cyan-300">{tx.hash}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Block Number</div>
              <div>
                <Link href={`/block/${tx.blockNumber}`} className="text-cyan-300 hover:underline font-mono">
                  {formatNumber(tx.blockNumber)}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">From</div>
              <div className="font-mono text-purple-300 break-all">
                <Link href={`/address/${tx.from}`} className="hover:underline">
                  {tx.from}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">To</div>
              <div className="font-mono text-green-300 break-all">
                {tx.to ? (
                  <Link href={`/address/${tx.to}`} className="hover:underline">
                    {tx.to}
                  </Link>
                ) : (
                  <span className="text-gray-500">Contract Creation</span>
                )}
              </div>
            </div>
            {tx.contractAddress && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Contract Address</div>
                <div className="font-mono text-yellow-300 break-all">
                  <Link href={`/address/${tx.contractAddress}`} className="hover:underline">
                    {tx.contractAddress}
                  </Link>
                </div>
              </div>
            )}
            {block && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Block Timestamp</div>
                <div>{new Date(block.timestamp).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Value and Gas Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaExchangeAlt className="text-yellow-400" />
              <div className="text-gray-400 text-sm">Value</div>
            </div>
            <div className="text-xl font-bold text-yellow-300">{formatEther(tx.value)} ETH</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-blue-400" />
              <div className="text-gray-400 text-sm">Gas Used</div>
            </div>
            <div className="text-xl font-bold text-blue-300">{gasUsed ? formatNumber(gasUsed) : "N/A"}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-green-400" />
              <div className="text-gray-400 text-sm">Gas Price</div>
            </div>
            <div className="text-xl font-bold text-green-300">
              {gasPrice ? `${formatGwei(gasPrice)} Gwei` : "N/A"}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGasPump className="text-purple-400" />
              <div className="text-gray-400 text-sm">Transaction Fee</div>
            </div>
            <div className="text-xl font-bold text-purple-300">{formatEther(gasCost.toString())} ETH</div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-cyan-300">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Nonce</div>
              <div className="font-mono">{formatNumber(tx.nonce)}</div>
            </div>
            <div>
              <div className="text-gray-400">Transaction Index</div>
              <div>{tx.transactionIndex}</div>
            </div>
            <div>
              <div className="text-gray-400">Transaction Type</div>
              <div>
                {tx.type === 0 ? "Legacy" : tx.type === 2 ? "EIP-1559" : `Type ${tx.type}`}
              </div>
            </div>
            {tx.maxFeePerGas && (
              <div>
                <div className="text-gray-400">Max Fee Per Gas</div>
                <div>{formatGwei(tx.maxFeePerGas)} Gwei</div>
              </div>
            )}
            {tx.maxPriorityFeePerGas && (
              <div>
                <div className="text-gray-400">Max Priority Fee</div>
                <div>{formatGwei(tx.maxPriorityFeePerGas)} Gwei</div>
              </div>
            )}
            {tx.input && tx.input !== '0x' && (
              <div className="md:col-span-2">
                <div className="text-gray-400 mb-1">Input Data</div>
                <div className="font-mono break-all text-xs bg-gray-900 p-3 rounded border border-gray-700">
                  {tx.input}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {navigation && (navigation.previous || navigation.next) && (
          <div className="flex items-center justify-between gap-4">
            {navigation.previous && (
              <Link
                href={`/transaction/${navigation.previous}`}
                className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700"
              >
                <FaArrowLeft /> Previous Transaction
              </Link>
            )}
            {navigation.next && (
              <Link
                href={`/transaction/${navigation.next}`}
                className="inline-flex items-center gap-2 text-cyan-300 hover:underline bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700 ml-auto"
              >
                Next Transaction <FaArrowRight />
              </Link>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
