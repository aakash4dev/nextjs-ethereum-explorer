import Link from "next/link";
import { FaCube, FaArrowLeft, FaEthereum } from "react-icons/fa";
import dbConnect, { Block } from "@/lib/mongodb";

async function getBlocks(page = 1) {
  await dbConnect();
  const limit = 20;
  const skip = (page - 1) * limit;

  const total = await Block.countDocuments();
  const blocks = await Block.find({})
    .sort({ number: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    blocks: JSON.parse(JSON.stringify(blocks)), // Serialize for Next.js
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

function truncateHash(hash, start = 10, end = 8) {
  if (!hash) return "";
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

export default async function BlocksPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams?.page || '1', 10);
  let data, error;

  try {
    data = await getBlocks(page);
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
            Blocks
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Total blocks &gt; <span className="font-bold">{data?.total ? formatNumber(data.total) : "Unknown"}</span></p>
          </div>

          {data && data.blocks && data.blocks.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="p-2 font-semibold">Block</th>
                      <th className="p-2 font-semibold">Age</th>
                      <th className="p-2 font-semibold">Txn</th>
                      <th className="p-2 font-semibold">Miner</th>
                      <th className="p-2 font-semibold text-right">Gas Used</th>
                      <th className="p-2 font-semibold text-right">Gas Limit</th>
                      <th className="p-2 font-semibold text-right">Base Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blocks.map(block => (
                      <tr key={block.hash} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[#0784c3] font-mono font-medium">
                          <Link href={`/block/${block.number}`} className="hover:underline">
                            {formatNumber(block.number)}
                          </Link>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 text-sm">
                          <Link href={`/transactions?block=${block.number}`} className="text-[#0784c3] hover:underline">{block.transactionCount}</Link>
                        </td>
                        <td className="p-3 font-mono text-[#0784c3] text-sm break-all">
                          <Link href={`/address/${block.miner}`} className="hover:underline">
                            {truncateHash(block.miner)}
                          </Link>
                        </td>
                        <td className="p-3 text-right text-gray-700 text-sm">
                          {formatNumber(block.gasUsed)} <span className="text-xs text-gray-400">({((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%)</span>
                        </td>
                        <td className="p-3 text-right text-gray-700 text-sm">{formatNumber(block.gasLimit)}</td>
                        <td className="p-3 text-right text-gray-700 text-sm">
                          {block.baseFeePerGas ? (Number(block.baseFeePerGas) / 1e9).toFixed(2) : "0"} Gwei
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
                        href={`/blocks?page=${page - 1}`}
                        className="px-3 py-1 bg-[#e9ecef] hover:bg-[#dee2e6] rounded text-[#0784c3] font-medium transition-colors"
                      >
                        &lt; Previous
                      </Link>
                    )}
                    {page < data.pagination.totalPages && (
                      <Link
                        href={`/blocks?page=${page + 1}`}
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
            <div className="text-center text-gray-500 py-8">No blocks found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
