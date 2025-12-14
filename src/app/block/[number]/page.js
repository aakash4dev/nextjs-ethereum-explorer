import Link from "next/link";
import { FaCube, FaUserSecret, FaGasPump, FaListOl, FaHashtag, FaClock, FaExchangeAlt, FaArrowLeft, FaEthereum, FaArrowRight, FaArrowLeft as FaArrowLeftIcon } from "react-icons/fa";
import dbConnect, { Block, Transaction } from "@/lib/mongodb";

async function getBlockData(number) {
  await dbConnect();
  const blockNumber = parseInt(number, 10);

  if (isNaN(blockNumber)) {
    throw new Error('Invalid block number');
  }

  const block = await Block.findOne({ number: blockNumber }).lean();

  if (!block) {
    return null;
  }

  // Get transactions for this block
  const transactions = await Transaction.find({ blockNumber })
    .sort({ transactionIndex: 1 })
    .lean();

  // Get previous and next block numbers
  const prevBlock = await Block.findOne({ number: { $lt: blockNumber } })
    .sort({ number: -1 })
    .select('number')
    .lean();

  const nextBlock = await Block.findOne({ number: { $gt: blockNumber } })
    .sort({ number: 1 })
    .select('number')
    .lean();

  return {
    block,
    transactions,
    navigation: {
      previous: prevBlock?.number || null,
      next: nextBlock?.number || null,
    },
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

export default async function BlockPage({ params }) {
  const { number } = await params;
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
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-red-500 text-center p-8">Error: {error}</div>
        </main>
      </div>
    );
  }

  if (!block) {
    return (
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8 text-gray-500">Block not found.</div>
        </main>
      </div>
    );
  }

  const gasUsedPercent = block.gasLimit ? ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2) : 0;

  return (
    <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <div className="flex items-center gap-4 mb-6 pt-2">
          <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2">
            Block <span className="text-gray-500 text-base font-normal">#{formatNumber(block.number)}</span>
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-sm text-gray-700">
            Overview
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaHashtag className="text-gray-400" /> Block Height:
              </div>
              <div className="md:col-span-3 text-sm font-medium">
                {formatNumber(block.number)}
                <span className="ml-4 text-xs text-gray-400 flex-inline items-center gap-2">
                  {navigation && navigation.previous && (
                    <Link href={`/block/${navigation.previous}`} className="bg-[#e9ecef] hover:bg-[#dee2e6] px-2 py-1 rounded text-[#0784c3]">
                      &lt;
                    </Link>
                  )}
                  {navigation && navigation.next && (
                    <Link href={`/block/${navigation.next}`} className="bg-[#e9ecef] hover:bg-[#dee2e6] px-2 py-1 rounded text-[#0784c3]">
                      &gt;
                    </Link>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaClock className="text-gray-400" /> Timestamp:
              </div>
              <div className="md:col-span-3 text-sm">
                {new Date(block.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaExchangeAlt className="text-gray-400" /> Transactions:
              </div>
              <div className="md:col-span-3 text-sm">
                <Link href={`/transactions?block=${block.number}`} className="text-[#0784c3] hover:underline">
                  {block.transactionCount} transactions
                </Link> in this block
              </div>
            </div>

            <div className="my-4 border-t border-gray-100"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaUserSecret className="text-gray-400" /> Miner:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all">
                <Link href={`/address/${block.miner}`} className="text-[#0784c3] hover:underline">
                  {block.miner}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaCube className="text-gray-400" /> Block Hash:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all text-gray-700">
                {block.hash}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaArrowLeftIcon className="text-gray-400" /> Parent Hash:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all text-[#0784c3]">
                <Link href={`/block/${block.parentHash}`} className="hover:underline">
                  {block.parentHash}
                </Link>
              </div>
            </div>

            <div className="my-4 border-t border-gray-100"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaGasPump className="text-gray-400" /> Gas Used:
              </div>
              <div className="md:col-span-3 text-sm">
                {formatNumber(block.gasUsed)} <span className="text-xs text-gray-500">({gasUsedPercent}%)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaGasPump className="text-gray-400" /> Gas Limit:
              </div>
              <div className="md:col-span-3 text-sm">
                {formatNumber(block.gasLimit)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaGasPump className="text-gray-400" /> Base Fee Per Gas:
              </div>
              <div className="md:col-span-3 text-sm">
                {block.baseFeePerGas ? `${(Number(block.baseFeePerGas) / 1e9).toFixed(9)} ETH ( ${(Number(block.baseFeePerGas) / 1e9).toFixed(2)} Gwei )` : "0 ETH"}
              </div>
            </div>
          </div>
        </div>

        {/* Extra Data / Collapsible could go here */}

      </main>
    </div>
  );
}
