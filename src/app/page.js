"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { FaSync } from "react-icons/fa";

const formatNumber = (num) => new Intl.NumberFormat("en-US").format(num);
const truncateHash = (hash, start = 6, end = 4) => hash ? `${hash.substring(0, start)}...${hash.substring(hash.length - end)}` : "";

export default function Home() {
  const [data, setData] = useState({ blocks: [], transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isMounted = useRef(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      if (res.ok) {
        const fetchedData = await res.json();
        setData(fetchedData);
      } else {
        console.error("Error fetching data:", await res.text());
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  };

  const syncLatestBlocks = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setIsLoading(true);

    try {
      // 1. Delete old data
      await fetch('/api/clear', { method: 'POST' });
      await fetchData(); // Fetch empty data to clear UI

      // 2. Start indexing and polling
      const indexerPromise = fetch('/api/indexer', { method: 'POST' });

      const poll = setInterval(async () => {
        await fetchData();
      }, 2000); // Poll every 2 seconds

      await indexerPromise; // Wait for indexer to finish
      clearInterval(poll); // Stop polling
      await fetchData(); // Final fetch

    } catch (error) {
      console.error("An error occurred during sync:", error.message);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      syncLatestBlocks();
    }
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400">Ethereum Explorer</h1>
          <p className="text-gray-400 mt-2">A simple block explorer powered by Next.js, MongoDB, and Web3.js</p>
        </header>
        <div className="text-center mb-8">
          <button
            onClick={syncLatestBlocks}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-cyan-500/30"
            title="Sync Latest Blocks"
          >
            <FaSync className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? "Syncing..." : "Sync Latest 10 Blocks"}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Blocks Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">Latest Blocks ({data.blocks?.length || 0})</h2>
            <div className="overflow-x-auto">
              {(isLoading && data.blocks.length === 0) ? <p>Syncing...</p> : (
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
                        <td colSpan="4" className="p-3 text-center text-gray-400">No blocks found.</td>
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
              {(isLoading && data.transactions.length === 0) ? <p>Syncing...</p> : (
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
                        <td colSpan="4" className="p-3 text-center text-gray-400">No transactions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-gray-800 text-gray-300 py-6 mt-8 border-t border-gray-700">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-4">
          <div className="text-center md:text-left">
            <div className="font-bold text-lg text-cyan-400">Aakash Singh Rajput</div>
            <a href="https://www.aakash4dev.com" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">www.aakash4dev.com</a>
          </div>
          <div className="flex gap-4 text-2xl justify-center">
            <a href="https://github.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="GitHub"><svg className="inline" width="24" height="24" fill="currentColor"><use href="#icon-github" /></svg></a>
            <a href="https://linkedin.com/in/aakash4dev" target="_blank" rel="noopener noreferrer" title="LinkedIn"><svg className="inline" width="24" height="24" fill="currentColor"><use href="#icon-linkedin" /></svg></a>
            <a href="https://twitter.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="Twitter"><svg className="inline" width="24" height="24" fill="currentColor"><use href="#icon-twitter" /></svg></a>
            <a href="https://www.youtube.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="YouTube"><svg className="inline" width="24" height="24" fill="currentColor"><use href="#icon-youtube" /></svg></a>
            <a href="https://medium.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="Medium"><svg className="inline" width="24" height="24" fill="currentColor"><use href="#icon-medium" /></svg></a>
          </div>
        </div>
        {/* SVG sprite for icons */}
        <svg style={{ display: 'none' }}>
          <symbol id="icon-github" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 1.6 2.7 2.2.2-.7.4-1.2.7-1.5-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.7.9 1.2 1.9 1.2 3.2 0 4.4-2.8 5.4-5.5 5.7.4.3.8 1 .8 2.1v3.1c0 .4.2.7.8.6A12 12 0 0 0 12 .3z" /></symbol>
          <symbol id="icon-linkedin" viewBox="0 0 24 24"><path d="M19 0h-14c-2.8 0-5 2.2-5 5v14c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5v-14c0-2.8-2.2-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.3c-1 0-1.7-.8-1.7-1.7s.8-1.7 1.7-1.7c1 0 1.7.8 1.7 1.7s-.7 1.7-1.7 1.7zm15.5 11.3h-3v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7h-3v-10h2.9v1.4h.1c.4-.7 1.3-1.4 2.7-1.4 2.9 0 3.4 1.9 3.4 4.3v5.7z" /></symbol>
          <symbol id="icon-twitter" viewBox="0 0 24 24"><path d="M24 4.6c-.9.4-1.8.7-2.8.8 1-0.6 1.7-1.5 2-2.6-1 .6-2 .9-3.1 1.2-1-1-2.3-1.6-3.7-1.6-2.8 0-5 2.2-5 5 0 .4 0 .8.1 1.2-4.1-.2-7.7-2.2-10.1-5.2-.4.7-.6 1.5-.6 2.3 0 1.6.8 3 2.1 3.8-.7 0-1.4-.2-2-.5v.1c0 2.2 1.6 4 3.7 4.4-.4.1-.8.2-1.2.2-.3 0-.6 0-.9-.1.6 1.9 2.4 3.3 4.5 3.3-1.6 1.2-3.6 2-5.7 2-.4 0-.8 0-.1.2 2 1.3 4.4 2.1 7 2.1 8.4 0 13-7 13-13v-.6c.9-.6 1.7-1.5 2.3-2.4z" /></symbol>
          <symbol id="icon-youtube" viewBox="0 0 24 24"><path d="M23.5 6.2c-.3-1.2-1.2-2.1-2.4-2.4-2.1-.6-10.6-.6-10.6-.6s-8.5 0-10.6.6c-1.2.3-2.1 1.2-2.4 2.4-.6 2.1-.6 6.5-.6 6.5s0 4.4.6 6.5c.3 1.2 1.2 2.1 2.4 2.4 2.1.6 10.6.6 10.6.6s8.5 0 10.6-.6c1.2-.3 2.1-1.2 2.4-2.4.6-2.1.6-6.5.6-6.5s0-4.4-.6-6.5zm-13.5 9.5v-7l7 3.5-7 3.5z" /></symbol>
          <symbol id="icon-medium" viewBox="0 0 24 24"><path d="M2.01 6.13c.02-.2-.06-.4-.22-.53l-1.7-2.04v-.3h5.34l4.13 9.05 3.63-9.05h5.12v.3l-1.45 1.39c-.13.1-.2.26-.17.42v10.7c-.03.16.04.32.17.42l1.42 1.39v.3h-7.24v-.3l1.47-1.43c.14-.14.14-.18.14-.42v-8.66l-4.06 10.81h-.55l-4.74-10.81v7.25c-.04.31.06.62.28.85l1.91 2.32v.3h-5.44v-.3l1.91-2.32c.22-.23.32-.54.28-.85v-8.84z" /></symbol>
        </svg>
      </footer>
    </div>
  );
}
