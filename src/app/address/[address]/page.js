import Link from "next/link";
import { FaUserSecret, FaExchangeAlt, FaCube, FaArrowLeft, FaEthereum, FaCopy, FaCheck } from "react-icons/fa";
import Footer from "../../components/Footer";
import { Suspense } from "react";

async function getAddressData(address) {
  const res = await fetch(`/api/address/${address}`, { next: { revalidate: 10 } });
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
  const { address } = await params;
  let data, error;

  try {
    data = await getAddressData(address);
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-red-500 text-center p-8">Error: {error}</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data || !data.address) {
    return (
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8 text-gray-500">Address not found.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const addr = data.address;
  const stats = data.stats || {};

  return (
    <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <div className="flex items-center gap-4 mb-6 pt-2">
          <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2">
            Address <span className="text-gray-500 text-base font-normal break-all">{addr.address}</span>
          </h1>
          <button className="text-gray-400 hover:text-gray-600 transition-colors"><FaCopy /></button>
        </div>

        {/* Address Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-sm text-gray-700">
            Overview
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaEthereum className="text-gray-400" /> ETH Balance:
              </div>
              <div className="md:col-span-3 text-sm font-medium">
                {formatEther(addr.balance)} ETH
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                ETH Value:
              </div>
              <div className="md:col-span-3 text-sm">
                $0.00 <span className="text-gray-400 text-xs">(@ $3,094.84/ETH)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                Token Holdings:
              </div>
              <div className="md:col-span-3 text-sm">
                {/* Placeholder for token holdings */}
                <div className="relative inline-block text-left">
                  <span className="text-gray-700">$0.00 <span className="text-xs text-gray-500">(0 Tokens)</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* More Info / Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-sm text-gray-700">
            More Info
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-500 text-sm mb-1">Last Transaction Sent</div>
              <div className="text-sm font-medium">
                {stats.sentCount ? formatNumber(stats.sentCount) : "0"} txn
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">First Transaction Sent</div>
              <div className="text-sm font-medium">
                -
              </div>
            </div>
          </div>
        </div>


        {/* Transaction History Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-700 text-sm">Transactions</h2>
            {/* Tabs could go here */}
          </div>
          <div className="p-4">
            {data.transactions && data.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="p-2 font-semibold">Tx Hash</th>
                      <th className="p-2 font-semibold">Block</th>
                      <th className="p-2 font-semibold">Age</th>
                      <th className="p-2 font-semibold">From</th>
                      <th className="p-2 font-semibold">To</th>
                      <th className="p-2 font-semibold text-right">Value</th>
                      <th className="p-2 font-semibold text-right">Txn Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.hash} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-2 font-mono text-sm text-[#0784c3]">
                          <Link href={`/transaction/${tx.hash}`} className="hover:underline">
                            {truncateHash(tx.hash)}
                          </Link>
                        </td>
                        <td className="p-2 text-sm">
                          <Link href={`/block/${tx.blockNumber}`} className="text-[#0784c3] hover:underline">
                            {formatNumber(tx.blockNumber)}
                          </Link>
                        </td>
                        <td className="p-2 text-sm text-gray-500">
                          -
                        </td>
                        <td className="p-2 font-mono text-sm text-[#0784c3] break-all">
                          {tx.from.toLowerCase() === addr.address.toLowerCase() ? (
                            <span className="text-gray-700 font-normal">
                              {truncateHash(tx.from)}
                            </span>
                          ) : (
                            <Link href={`/address/${tx.from}`} className="hover:underline">
                              {truncateHash(tx.from)}
                            </Link>
                          )}
                        </td>
                        <td className="p-2 font-mono text-sm break-all pt-3">
                          <span className={`inline-flex items-center justify-center p-1 rounded-full text-[10px] w-12 border ${tx.from.toLowerCase() === addr.address.toLowerCase() ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'} mr-2 font-bold uppercase`}>
                            {tx.from.toLowerCase() === addr.address.toLowerCase() ? 'OUT' : 'IN'}
                          </span>
                          {tx.to && tx.to.toLowerCase() === addr.address.toLowerCase() ? (
                            <span className="text-gray-700">{truncateHash(tx.to)}</span>
                          ) : (
                            <Link href={`/address/${tx.to}`} className="text-[#0784c3] hover:underline">
                              {tx.to ? truncateHash(tx.to) : "Contract Creation"}
                            </Link>
                          )}
                        </td>
                        <td className="p-2 text-right text-gray-700 text-sm">
                          {formatEther(tx.value)} ETH
                        </td>
                        <td className="p-2 text-right text-gray-500 text-xs">
                          {tx.gasUsed && tx.effectiveGasPrice ? formatEther(BigInt(tx.gasUsed) * BigInt(tx.effectiveGasPrice)) : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No transactions found.</div>
            )}

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
                <div>Page {data.pagination.page || 1} of {data.pagination.totalPages}</div>
                <div className="flex gap-2">
                  {(data.pagination.page || 1) > 1 && (
                    <Link
                      href={`/address/${address}?page=${(data.pagination.page || 1) - 1}`}
                      className="px-3 py-1 bg-[#e9ecef] hover:bg-[#dee2e6] rounded text-[#0784c3] font-medium transition-colors"
                    >
                      &lt; Previous
                    </Link>
                  )}
                  {(data.pagination.page || 1) < data.pagination.totalPages && (
                    <Link
                      href={`/address/${address}?page=${(data.pagination.page || 1) + 1}`}
                      className="px-3 py-1 bg-[#e9ecef] hover:bg-[#dee2e6] rounded text-[#0784c3] font-medium transition-colors"
                    >
                      Next &gt;
                    </Link>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}

