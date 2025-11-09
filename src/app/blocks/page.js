import Link from "next/link";
import { FaCube, FaArrowLeft, FaEthereum } from "react-icons/fa";
import Footer from "../components/Footer";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getBlocks(page = 1) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/blocks?page=${page}&limit=20`, { next: { revalidate: 10 } });
  if (!res.ok) {
    throw new Error("Failed to fetch blocks");
  }
  return res.json();
}

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function truncateHash(hash, start = 10, end = 8) {
  if (!hash) return "";
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

export default async function BlocksPage({ searchParams }) {
  const page = parseInt(searchParams?.page || '1', 10);
  let data, error;

  try {
    data = await getBlocks(page);
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
          <FaCube className="text-cyan-300" /> All Blocks
        </h1>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          {data && data.blocks && data.blocks.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-sm">
                      <th className="p-2 font-semibold">Block</th>
                      <th className="p-2 font-semibold">Hash</th>
                      <th className="p-2 font-semibold">Miner</th>
                      <th className="p-2 font-semibold text-right">Transactions</th>
                      <th className="p-2 font-semibold text-right">Gas Used</th>
                      <th className="p-2 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blocks.map(block => (
                      <tr key={block.hash} className="border-b border-gray-700 hover:bg-gray-700/40 transition-colors">
                        <td className="p-3 text-cyan-400 font-mono">
                          <Link href={`/block/${block.number}`} className="hover:underline">
                            {formatNumber(block.number)}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-purple-300 break-all">
                          <Link href={`/block/${block.number}`} className="hover:underline">
                            {truncateHash(block.hash)}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-purple-300 break-all">
                          <Link href={`/address/${block.miner}`} className="hover:underline">
                            {truncateHash(block.miner)}
                          </Link>
                        </td>
                        <td className="p-3 text-right">{block.transactionCount}</td>
                        <td className="p-3 text-right">{formatNumber(block.gasUsed)}</td>
                        <td className="p-3 text-sm">{new Date(block.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/blocks?page=${page - 1}`}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600"
                    >
                      Previous
                    </Link>
                  )}
                  {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(data.pagination.totalPages - 4, page - 2)) + i;
                    if (pageNum > data.pagination.totalPages) return null;
                    return (
                      <Link
                        key={pageNum}
                        href={`/blocks?page=${pageNum}`}
                        className={`px-4 py-2 rounded-lg border ${
                          pageNum === page
                            ? 'bg-cyan-600 border-cyan-500'
                            : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                  {page < data.pagination.totalPages && (
                    <Link
                      href={`/blocks?page=${page + 1}`}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 py-8">No blocks found.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

