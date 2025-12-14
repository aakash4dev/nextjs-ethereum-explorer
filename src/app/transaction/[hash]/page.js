import Link from "next/link";
import { FaExchangeAlt, FaCube, FaUserSecret, FaGasPump, FaHashtag, FaArrowRight, FaListOl, FaArrowLeft, FaEthereum, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";

import dbConnect, { Transaction, Block } from "@/lib/mongodb";


async function getTransactionData(hash) {
  await dbConnect();

  const transaction = await Transaction.findOne({ hash }).lean();

  if (!transaction) {
    return null;
  }

  // Get block details
  const block = await Block.findOne({ number: transaction.blockNumber }).lean();

  // Get previous and next transactions in the same block
  const prevTx = await Transaction.findOne({
    blockNumber: transaction.blockNumber,
    transactionIndex: { $lt: transaction.transactionIndex },
  })
    .sort({ transactionIndex: -1 })
    .select('hash')
    .lean();

  const nextTx = await Transaction.findOne({
    blockNumber: transaction.blockNumber,
    transactionIndex: { $gt: transaction.transactionIndex },
  })
    .sort({ transactionIndex: 1 })
    .select('hash')
    .lean();

  return {
    transaction,
    block,
    navigation: {
      previous: prevTx?.hash || null,
      next: nextTx?.hash || null,
    },
  };
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
  const { hash } = await params;
  let tx, block, navigation, error;

  try {
    const data = await getTransactionData(hash);
    if (!data) {
      // Handle not found
    } else {
      tx = data.transaction;
      block = data.block;
      navigation = data.navigation;
    }
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

  if (!tx) {
    return (
      <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
        <main className="container mx-auto p-4 md:p-8 flex-1">
          <div className="text-center p-8 text-gray-500">Transaction not found.</div>
        </main>
      </div>
    );
  }

  const isSuccess = tx.status === 1;
  const gasUsed = tx.gasUsed || tx.gas;
  const gasPrice = tx.effectiveGasPrice || tx.gasPrice;
  const gasCost = gasUsed && gasPrice ? (Number(gasUsed) * Number(gasPrice)) / 1e18 : 0;

  return (
    <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <div className="flex items-center gap-4 mb-6 pt-2">
          <h1 className="text-xl font-bold text-[#212529] flex items-center gap-2">
            Transaction Details
          </h1>
          {navigation && (navigation.previous || navigation.next) && (
            <div className="flex gap-2 ml-auto">
              {navigation.previous && (
                <Link href={`/transaction/${navigation.previous}`} className="bg-[#e9ecef] hover:bg-[#dee2e6] px-3 py-1 rounded text-[#0784c3] text-sm">
                  &lt;
                </Link>
              )}
              {navigation.next && (
                <Link href={`/transaction/${navigation.next}`} className="bg-[#e9ecef] hover:bg-[#dee2e6] px-3 py-1 rounded text-[#0784c3] text-sm">
                  &gt;
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-sm text-gray-700">
            Overview
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaHashtag className="text-gray-400" /> Transaction Hash:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all font-medium text-[#212529]">
                {tx.hash}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaCheckCircle className="text-gray-400" /> Status:
              </div>
              <div className="md:col-span-3 text-sm">
                {isSuccess ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold uppercase">
                    <FaCheckCircle className="text-green-500 text-xs" /> Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-semibold uppercase">
                    <FaTimesCircle className="text-red-500 text-xs" /> Failed
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaCube className="text-gray-400" /> Block:
              </div>
              <div className="md:col-span-3 text-sm">
                <Link href={`/block/${tx.blockNumber}`} className="text-[#0784c3] hover:underline">
                  {formatNumber(tx.blockNumber)}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaClock className="text-gray-400" /> Timestamp:
              </div>
              <div className="md:col-span-3 text-sm text-gray-700">
                {block ? new Date(block.timestamp).toLocaleString() : "-"}
              </div>
            </div>

            <div className="my-4 border-t border-gray-100"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                From:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all">
                <Link href={`/address/${tx.from}`} className="text-[#0784c3] hover:underline">
                  {tx.from}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                To:
              </div>
              <div className="md:col-span-3 text-sm font-mono break-all">
                {tx.to ? (
                  <Link href={`/address/${tx.to}`} className="text-[#0784c3] hover:underline">
                    {tx.to}
                  </Link>
                ) : (
                  <span className="text-gray-500">Contract Creation</span>
                )}
                {tx.contractAddress && (
                  <div className="mt-1">
                    <span className="text-gray-500 mr-1">Created Contract:</span>
                    <Link href={`/address/${tx.contractAddress}`} className="text-[#0784c3] hover:underline">
                      {tx.contractAddress}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="my-4 border-t border-gray-100"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaExchangeAlt className="text-gray-400" /> Value:
              </div>
              <div className="md:col-span-3 text-sm font-medium text-gray-700">
                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                  {formatEther(tx.value)} ETH
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                <FaGasPump className="text-gray-400" /> Transaction Fee:
              </div>
              <div className="md:col-span-3 text-sm text-gray-700">
                {formatEther(gasCost.toString())} ETH
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1 flex items-center gap-1">
                Gas Price:
              </div>
              <div className="md:col-span-3 text-sm text-gray-700">
                {gasPrice ? `${formatGwei(gasPrice)} Gwei` : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* More Details Collapsible or Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-700 font-semibold cursor-pointer">
            Click to see more details
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1">Pool Info:</div>
              <div className="md:col-span-3 text-sm text-gray-700">-</div> {/* Placeholder */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1">Gas Limit & Used by Transaction:</div>
              <div className="md:col-span-3 text-sm text-gray-700">
                {tx.gasLimit ? formatNumber(tx.gasLimit) : "N/A"} <span className="text-gray-400 mx-2">|</span> {gasUsed ? formatNumber(gasUsed) : "N/A"} ({((Number(gasUsed) / Number(tx.gasLimit)) * 100).toFixed(2)}%)
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-gray-500 text-sm md:col-span-1">Nonce:</div>
              <div className="md:col-span-3 text-sm text-gray-700">{tx.nonce} <span className="text-gray-400 text-xs">(in the position)</span></div>
            </div>
            {tx.input && tx.input !== '0x' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-gray-500 text-sm md:col-span-1">Input Data:</div>
                <div className="md:col-span-3 text-sm">
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 font-mono break-all text-xs h-32 overflow-y-auto">
                    {tx.input}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
