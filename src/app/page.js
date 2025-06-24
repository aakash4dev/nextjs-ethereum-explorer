"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const formatNumber = (num) => new Intl.NumberFormat("en-US").format(num);
const truncateHash = (hash, start = 6, end = 4) => hash ? `${hash.substring(0, start)}...${hash.substring(hash.length - end)}` : "";

export default function Home() {
  const [data, setData] = useState({ blocks: [], transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching data from /api/data...');
      const res = await fetch("/api/data");
      console.log('Response status:', res.status);
      
      const fetchedData = await res.json();
      console.log('Fetched data:', fetchedData);
      
      if (res.ok) {
        setData(fetchedData);
        console.log('Data set successfully:', fetchedData);
      } else {
        setMessage(`Error fetching data: ${fetchedData.message}`);
        console.error('API error:', fetchedData);
      }
    } catch (error) {
      setMessage(`Error fetching data: ${error.message}`);
      console.error('Fetch error:', error);
    }
    setIsLoading(false);
  };

  const runIndexer = async () => {
    setIsIndexing(true);
    setMessage("Indexer running... this may take a moment.");
    try {
      console.log('Starting indexer...');
      const res = await fetch("/api/indexer", { method: "POST" });
      const result = await res.json();
      console.log('Indexer result:', result);
      setMessage(result.message || 'Indexer run complete.');
      await fetchData(); // Refresh data after indexing
    } catch (error) {
      setMessage(`Indexer failed: ${error.message}`);
      console.error('Indexer error:', error);
    }
    setIsIndexing(false);
  };

  useEffect(() => { 
    console.log('Component mounted, fetching initial data...');
    fetchData(); 
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400">Ethereum Indexer MVP</h1>
          <p className="text-gray-400 mt-2">A simple block explorer powered by Next.js, MongoDB, and Web3.js</p>
        </header>
        <div className="text-center mb-8">
          <button
            onClick={runIndexer}
            disabled={isIndexing}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-cyan-500/30"
          >
            {isIndexing ? "Indexing..." : "Run Indexer (Fetch Latest 100 Blocks)"}
          </button>
          {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Blocks Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Latest Blocks ({data.blocks?.length || 0})</h2>
            <div className="overflow-x-auto">
              {isLoading ? <p>Loading blocks...</p> : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2">Block</th>
                      <th className="p-2">Miner</th>
                      <th className="p-2 text-right">Txs</th>
                      <th className="p-2 text-right">Gas Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blocks && data.blocks.length > 0 ? (
                      data.blocks.map(block => (
                        <tr key={block.hash} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                          <td className="p-3 text-cyan-400 font-mono">
                            <Link href={`/block/${block.number}`}>{formatNumber(block.number)}</Link>
                          </td>
                          <td className="p-3 font-mono text-purple-400">{truncateHash(block.miner)}</td>
                          <td className="p-3 text-right">{block.transactionCount}</td>
                          <td className="p-3 text-right">{formatNumber(block.gasUsed)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-3 text-center text-gray-400">No blocks found. Run the indexer first.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {/* Latest Transactions Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Latest Transactions ({data.transactions?.length || 0})</h2>
            <div className="overflow-x-auto">
              {isLoading ? <p>Loading transactions...</p> : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2">Hash</th>
                      <th className="p-2">From</th>
                      <th className="p-2">To</th>
                      <th className="p-2 text-right">Value (ETH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions && data.transactions.length > 0 ? (
                      data.transactions.map(tx => (
                        <tr key={tx.hash} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                          <td className="p-3 font-mono text-cyan-400">
                            <Link href={`/transaction/${tx.hash}`}>{truncateHash(tx.hash)}</Link>
                          </td>
                          <td className="p-3 font-mono text-purple-400">{truncateHash(tx.from)}</td>
                          <td className="p-3 font-mono text-purple-400">{truncateHash(tx.to)}</td>
                          <td className="p-3 text-right">{(Number(tx.value) / 1e18).toFixed(4)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-3 text-center text-gray-400">No transactions found. Run the indexer first.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
