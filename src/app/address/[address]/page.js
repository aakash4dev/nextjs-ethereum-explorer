import Link from "next/link";
import { FaUserSecret, FaExchangeAlt, FaCube, FaArrowLeft, FaEthereum, FaCopy, FaCheck } from "react-icons/fa";
import Footer from "../../components/Footer";
import { Suspense } from "react";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getAddressData(address) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/address/${address}`, { next: { revalidate: 10 } });
  if (!res.ok) {
    throw new Error("Failed to fetch address data");
  }
  return res.json();
}

function formatEther(wei) {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function truncateHash(hash, start = 6, end = 4) {
  if (!hash) return "";
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

export default async function AddressPage({ params }) {
  const { address } = params;
  let data, error;

  try {
    data = await getAddressData(address);
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

  if (!data || !data.address) {
    return (
      <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8">Address not found.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const addr = data.address;
  const stats = data.stats || {};

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
          <FaUserSecret className="text-cyan-300" /> Address
        </h1>

        {/* Address Info Card */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="text-gray-400 text-sm mb-2">Address</div>
              <div className="font-mono text-lg break-all text-cyan-300">{addr.address}</div>
            </div>
            <div className="flex items-center gap-2">
              {addr.isContract && (
                <span className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-semibold">
                  Contract
                </span>
              )}
              <span className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm">
                {addr.isContract ? "Smart Contract" : "EOA"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Balance</div>
            <div className="text-2xl font-bold text-cyan-300">{formatEther(addr.balance)} ETH</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-purple-300">{formatNumber(stats.totalTransactions || 0)}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Sent</div>
            <div className="text-2xl font-bold text-red-300">{formatNumber(stats.sentCount || 0)}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Received</div>
            <div className="text-2xl font-bold text-green-300">{formatNumber(stats.receivedCount || 0)}</div>
          </div>
        </div>

        {/* Transaction History */}
        <h2 className="text-2xl font-semibold mb-4 text-cyan-300 flex items-center gap-2">
          <FaExchangeAlt className="text-cyan-300" /> Transaction History
        </h2>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          {data.transactions && data.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-sm">
                    <th className="p-2 font-semibold">Tx Hash</th>
                    <th className="p-2 font-semibold">Block</th>
                    <th className="p-2 font-semibold">From</th>
                    <th className="p-2 font-semibold">To</th>
                    <th className="p-2 font-semibold text-right">Value (ETH)</th>
                    <th className="p-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.hash} className="border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
                      <td className="p-2 font-mono text-cyan-300 break-all">
                        <Link href={`/transaction/${tx.hash}`} className="hover:underline">
                          {truncateHash(tx.hash)}
                        </Link>
                      </td>
                      <td className="p-2">
                        <Link href={`/block/${tx.blockNumber}`} className="text-cyan-400 hover:underline">
                          {formatNumber(tx.blockNumber)}
                        </Link>
                      </td>
                      <td className="p-2 font-mono text-purple-300 break-all">
                        {tx.from.toLowerCase() === addr.address.toLowerCase() ? (
                          <span className="text-red-300">You</span>
                        ) : (
                          truncateHash(tx.from)
                        )}
                      </td>
                      <td className="p-2 font-mono text-green-300 break-all">
                        {tx.to && tx.to.toLowerCase() === addr.address.toLowerCase() ? (
                          <span className="text-green-300">You</span>
                        ) : (
                          tx.to ? truncateHash(tx.to) : "Contract Creation"
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <span className={tx.from.toLowerCase() === addr.address.toLowerCase() ? "text-red-300" : "text-green-300"}>
                          {tx.from.toLowerCase() === addr.address.toLowerCase() ? "-" : "+"}
                          {formatEther(tx.value)}
                        </span>
                      </td>
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
            <div className="text-center text-gray-400 py-8">No transactions found.</div>
          )}
        </div>

        {/* Pagination */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Link
                  key={page}
                  href={`/address/${address}?page=${page}`}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700"
                >
                  {page}
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

