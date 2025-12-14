import Link from "next/link";
import { FaExchangeAlt, FaArrowLeft, FaEthereum } from "react-icons/fa";
import dbConnect, { Transaction, Block } from "@/lib/mongodb";

async function getTransactions(page = 1) {
  await dbConnect();
  const limit = 20;
  const skip = (page - 1) * limit;

  const total = await Transaction.countDocuments();
  const transactions = await Transaction.find({})
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // We need block timestamps, but Transaction doesn't have it directly usually unless denormalized.
  // The original API might have joined it or just omitted it.
  // Check the UI: it displays "Age" for blocks, but for transactions?
  // Table columns: Tx Hash, Block, From, To, Value, Status.
  // It doesn't show timestamp in the table rows in the previous code.
  // Wait, the previous code had:
  // <td className="p-3 text-sm">{/* No timestamp shown? */}</td>
  // Actually line 86 of previous code showed Block number link.
  // Line 83 showed hash.
  // Line 93 showed From.
  // Line 105 showed Value.
  // Line 110 showed Status.
  // So we don't need to join with Block for timestamp in the list view necessarily, unless "Age" column exists?
  // Table headers: Tx Hash, Block, From, To, Value, Status. No "Age".

  return {
    transactions: JSON.parse(JSON.stringify(transactions)), // Serialize for Next.js
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    }
  };
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

export default async function TransactionsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page || '1', 10);
  let data, error;

  try {
    data = await getTransactions(page);
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-red-500 text-center p-8">Error: {error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2">
            Transactions
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">More than &gt; <span className="font-bold">{data?.total ? formatNumber(data.total) : "0"}</span> transactions found</p>
          </div>

          {data && data.transactions && data.transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="p-2 font-semibold">Tx Hash</th>
                      <th className="p-2 font-semibold">Block</th>
                      <th className="p-2 font-semibold">From</th>
                      <th className="p-2 font-semibold">To</th>
                      <th className="p-2 font-semibold text-right">Value</th>
                      <th className="p-2 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map(tx => (
                      <tr key={tx.hash} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-mono text-[#0784c3] text-sm break-all">
                          <Link href={`/transaction/${tx.hash}`} className="hover:underline">
                            {truncateHash(tx.hash)}
                          </Link>
                        </td>
                        <td className="p-3 text-sm">
                          <Link href={`/block/${tx.blockNumber}`} className="text-[#0784c3] hover:underline">
                            {formatNumber(tx.blockNumber)}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-[#0784c3] text-sm break-all">
                          <Link href={`/address/${tx.from}`} className="hover:underline">
                            {truncateHash(tx.from)}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-[#0784c3] text-sm break-all">
                          {tx.to ? (
                            <Link href={`/address/${tx.to}`} className="hover:underline">
                              {truncateHash(tx.to)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">Contract Creation</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-700 text-sm">{formatEther(tx.value)} ETH</td>
                        <td className="p-3 text-center">
                          {tx.status === 1 ? (
                            <span className="px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded text-xs font-medium uppercase">Success</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium uppercase">Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
                  <div>Page {page} of {data.pagination.totalPages}</div>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/transactions?page=${page - 1}`}
                        className="px-3 py-1 bg-[#e9ecef] hover:bg-[#dee2e6] rounded text-[#0784c3] font-medium transition-colors"
                      >
                        &lt; Previous
                      </Link>
                    )}
                    {page < data.pagination.totalPages && (
                      <Link
                        href={`/transactions?page=${page + 1}`}
                        className="px-3 py-1 bg-[#e9ecef] hover:bg-[#dee2e6] rounded text-[#0784c3] font-medium transition-colors"
                      >
                        Next &gt;
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">No transactions found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
