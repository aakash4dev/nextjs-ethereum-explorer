"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { FaSync, FaEthereum, FaCube, FaExchangeAlt, FaSearch } from "react-icons/fa";
import { SiBlockchaindotcom } from "react-icons/si";
import Footer from "./components/Footer";

const formatNumber = (num) => new Intl.NumberFormat("en-US").format(num);
const truncateHash = (hash, start = 6, end = 4) => hash ? `${hash.substring(0, start)}...${hash.substring(hash.length - end)}` : "";

export default function Home() {
  const [data, setData] = useState({ blocks: [], transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isMounted = useRef(false);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");

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
      // Only re-index, never delete
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

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchError("");
    const value = search.trim();
    if (!value) return;
    // Simple detection: block number (all digits), tx hash (0x...), or address (0x...)
    if (/^\d+$/.test(value)) {
      window.location.href = `/block/${value}`;
    } else if (/^0x([A-Fa-f0-9]{64})$/.test(value)) {
      window.location.href = `/transaction/${value}`;
    } else if (/^0x([A-Fa-f0-9]{40})$/.test(value)) {
      window.location.href = `https://etherscan.io/address/${value}`;
    } else {
      setSearchError("Not a valid block number, transaction hash, or address.");
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
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 flex items-center justify-center gap-3">
            <FaEthereum className="inline text-cyan-300 mb-1" /> Ethereum Explorer
          </h1>
          <p className="text-gray-400 mt-2">A simple block explorer powered by Next.js, MongoDB, and Web3.js</p>
          <p className="text-gray-300 mt-3 flex items-center justify-center gap-2">🚀 Need a custom blockchain explorer for your project? <span className="text-cyan-400">👉</span> Reach out on <a href="https://linkedin.com/in/aakash4dev" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-semibold">LinkedIn</a> for tailored solutions! <span className="text-yellow-300">��</span></p>
        </header>
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex justify-center mb-8 gap-2">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              className="w-full py-3 pl-12 pr-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg shadow"
              placeholder="Search by block number, tx hash, or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          </div>
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-6 py-3 rounded-lg transition duration-200 shadow-lg shadow-cyan-500/30">
            Search
          </button>
        </form>
        {searchError && <div className="text-center text-red-400 mb-4">{searchError}</div>}
        {/* Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="flex items-center gap-4 bg-gray-800/70 p-5 rounded-xl border border-gray-700 shadow-lg">
            <FaCube className="text-3xl text-cyan-400" />
            <div>
              <div className="text-gray-400 text-sm">Latest Block</div>
              <div className="text-xl font-bold text-cyan-200">{data.blocks[0] ? formatNumber(data.blocks[0].number) : "-"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-800/70 p-5 rounded-xl border border-gray-700 shadow-lg">
            <FaExchangeAlt className="text-3xl text-purple-400" />
            <div>
              <div className="text-gray-400 text-sm">Latest Transactions :limit 10</div>
              <div className="text-xl font-bold text-purple-200">{data.transactions.length ? formatNumber(data.transactions.length) : "-"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-800/70 p-5 rounded-xl border border-gray-700 shadow-lg">
            <SiBlockchaindotcom className="text-3xl text-green-400" />
            <div>
              <div className="text-gray-400 text-sm">Indexed Blocks :limit 10</div>
              <div className="text-xl font-bold text-green-200">{data.blocks.length ? formatNumber(data.blocks.length) : "-"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-gray-800/70 p-5 rounded-xl border border-gray-700 shadow-lg">
            <FaSync className={"text-3xl " + (isSyncing ? "animate-spin text-yellow-400" : "text-yellow-400")} />
            <div>
              <div className="text-gray-400 text-sm">Sync Status</div>
              <div className="text-xl font-bold text-yellow-200">{isSyncing ? "Syncing..." : "Up to date"}</div>
            </div>
          </div>
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
      <Footer />
    </div>
  );
}
