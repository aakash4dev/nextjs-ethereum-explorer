"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { FaSync, FaEthereum, FaCube, FaExchangeAlt, FaSearch, FaChartLine, FaUsers, FaGasPump, FaListOl } from "react-icons/fa";
import { SiBlockchaindotcom } from "react-icons/si";

const formatNumber = (num) => new Intl.NumberFormat("en-US").format(num);
const truncateHash = (hash, start = 6, end = 4) => hash ? `${hash.substring(0, start)}...${hash.substring(hash.length - end)}` : "";
const formatEther = (wei) => (Number(wei) / 1e18).toFixed(6);

export default function Home() {
  const [data, setData] = useState({ blocks: [], transactions: [] });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [apiError, setApiError] = useState(false);
  const isMounted = useRef(false);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState("");

  const fetchData = async () => {
    try {
      setApiError(false);
      const [dataRes, statsRes] = await Promise.all([
        fetch("/api/data?limit=10"),
        fetch("/api/stats"),
      ]);

      if (dataRes.ok) {
        const fetchedData = await dataRes.json();
        setData(fetchedData);
      } else {
        setApiError(true);
      }

      if (statsRes.ok) {
        const fetchedStats = await statsRes.json();
        setStats(fetchedStats);
      } else {
        // If stats API fails, set default empty stats
        setStats({
          overview: {
            totalBlocks: 0,
            totalTransactions: 0,
            totalAddresses: 0,
            latestBlockNumber: 0,
          },
          indexer: {
            lastProcessedBlock: 0,
            isSyncing: false,
            totalBlocksIndexed: 0,
            totalTransactionsIndexed: 0,
          },
          activity: {
            blocksLast24h: 0,
            transactionsLast24h: 0,
          },
          gas: {
            avgGasUsed: 0,
            avgGasLimit: 0,
            totalGasUsed: 0,
          },
        });
        setApiError(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
      setApiError(true);
      // Set default empty stats on error
      setStats({
        overview: {
          totalBlocks: 0,
          totalTransactions: 0,
          totalAddresses: 0,
          latestBlockNumber: 0,
        },
        indexer: {
          lastProcessedBlock: 0,
          isSyncing: false,
          totalBlocksIndexed: 0,
          totalTransactionsIndexed: 0,
        },
        activity: {
          blocksLast24h: 0,
          transactionsLast24h: 0,
        },
        gas: {
          avgGasUsed: 0,
          avgGasLimit: 0,
          totalGasUsed: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch("/api/indexer");
      if (res.ok) {
        const status = await res.json();
        setSyncStatus(status);
      } else {
        // Set default sync status if API fails
        setSyncStatus({
          isSyncing: false,
          lastProcessedBlock: 0,
          totalBlocksIndexed: 0,
          totalTransactionsIndexed: 0,
          blocksBehind: 0,
          syncProgress: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching sync status:", error.message);
      // Set default sync status on error
      setSyncStatus({
        isSyncing: false,
        lastProcessedBlock: 0,
        totalBlocksIndexed: 0,
        totalTransactionsIndexed: 0,
        blocksBehind: 0,
        syncProgress: 0,
      });
    }
  };

  const syncLatestBlocks = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setIsLoading(true);

    try {
      const indexerPromise = fetch('/api/indexer', { method: 'POST' });
      const poll = setInterval(async () => {
        await fetchData();
        await fetchSyncStatus();
      }, 2000);

      await indexerPromise;
      clearInterval(poll);
      await fetchData();
      await fetchSyncStatus();
    } catch (error) {
      console.error("An error occurred during sync:", error.message);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchError("");
    const value = search.trim();
    if (!value) return;

    // Block number
    if (/^\d+$/.test(value)) {
      window.location.href = `/block/${value}`;
    }
    // Transaction hash (64 hex chars after 0x)
    else if (/^0x[A-Fa-f0-9]{64}$/i.test(value)) {
      window.location.href = `/transaction/${value}`;
    }
    // Address (40 hex chars after 0x)
    else if (/^0x[A-Fa-f0-9]{40}$/i.test(value)) {
      window.location.href = `/address/${value}`;
    }
    else {
      setSearchError("Invalid format. Enter a block number, transaction hash, or address.");
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      fetchData();
      fetchSyncStatus();
    }

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchData();
      fetchSyncStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#f8f9fa] text-[#212529] min-h-screen font-sans flex flex-col">
      {/* Hero Section */}
      <section className="bg-[#111b36] py-12 pb-16 relative">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-left md:text-center mb-8">
            <h1 className="text-xl md:text-2xl text-white font-medium mb-4">The Ethereum Blockchain Explorer</h1>
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full">
              <div className="flex bg-white rounded p-1">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">All Filters</span>
                    <span className="mx-2 text-gray-300">|</span>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-24 pr-4 py-2 text-gray-700 focus:outline-none"
                    placeholder="Search by Address / Txn Hash / Block / Token / Domain Name"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button type="submit" className="bg-[#0784c3] text-white rounded px-4 py-2 hover:bg-[#0670a6] transition-colors">
                  <FaSearch />
                </button>
              </div>
              {searchError && <div className="absolute top-full left-0 mt-1 text-red-400 text-sm bg-black/50 px-2 py-1 rounded">{searchError}</div>}
            </form>
          </div>
        </div>
        {/* Background Waves/Pattern - Simplified representation */}
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#f8f9fa] to-transparent opacity-10"></div>
      </section>

      <main className="container mx-auto p-4 md:p-8 flex-1 -mt-10 relative z-20">
        {/* Stats Dashboard */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* ETHER PRICE / MARKET CAP */}
            <div className="px-4">
              <div className="flex items-start gap-3 mb-4">
                <FaEthereum className="text-3xl text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">ETHER PRICE</div>
                  <div className="font-medium">
                    {stats?.market?.usd ? `$${formatNumber(stats.market.usd)}` : "$0.00"}
                    <span className={`text-sm ml-1 ${stats?.market?.usd_24h_change >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ({stats?.market?.usd_24h_change ? stats.market.usd_24h_change.toFixed(2) : "0.00"}%)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <SiBlockchaindotcom className="text-3xl text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">MARKET CAP</div>
                  <div className="font-medium">
                    {stats?.market?.usd_market_cap ? `$${formatNumber(stats.market.usd_market_cap)}` : "$0.00"}
                  </div>
                </div>
              </div>
            </div>

            {/* TRANSACTIONS / FINALIZED BLOCK */}
            <div className="px-4">
              <div className="flex items-start gap-3 mb-4">
                <FaExchangeAlt className="text-3xl text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">TRANSACTIONS</div>
                  <div className="font-medium">{stats?.overview?.totalTransactions ? formatNumber(stats.overview.totalTransactions) : "-"} <span className="text-gray-400 text-sm">({stats?.activity ? (stats.activity.transactionsLast24h / 86400).toFixed(1) : "-"} TPS)</span></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <FaCube className="text-3xl text-gray-400" />
                  {isSyncing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>}
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">LAST FINALIZED BLOCK</div>
                  <div className="font-medium">{stats?.overview?.latestBlockNumber ? formatNumber(stats.overview.latestBlockNumber) : "-"}</div>
                </div>
              </div>
            </div>

            {/* GAS / HISTORY */}
            <div className="px-4">
              <div className="flex items-start gap-3 mb-4">
                <FaGasPump className="text-3xl text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">MED GAS PRICE</div>
                  <div className="font-medium">0.036 Gwei <span className="text-gray-400 text-sm">($0.01)</span></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaChartLine className="text-3xl text-gray-400" />
                <div className="w-full">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">TRANSACTION HISTORY IN 14 DAYS</div>
                  {/* Placeholder Graph */}
                  <div className="h-10 w-full bg-gray-50 rounded border border-gray-100 relative overflow-hidden">
                    <svg viewBox="0 0 100 20" className="w-full h-full text-gray-300 fill-current opacity-50">
                      <path d="M0,10 Q25,20 50,10 T100,10 V20 H0 Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sync Warning */}
        {(apiError || (stats?.overview?.totalBlocks === 0 && !isLoading)) && (
          <div className="bg-orange-50 border border-orange-200 rounded p-4 mb-8 flex items-center gap-3">
            <FaSync className="text-orange-500" />
            <div className="text-sm text-orange-800">
              {apiError ? 'Cannot connect to Database.' : 'Blockchain sync is starting...'} Please check your backend connection.
            </div>
          </div>
        )}

        {/* Two Column Layout: Latest Blocks & Latest Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Latest Blocks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa]">
              <h2 className="font-bold text-[#212529] text-base">Latest Blocks</h2>
              <Link href="/blocks" className="bg-white border border-gray-200 text-[#0784c3] text-xs px-2 py-1 rounded hover:bg-[#0784c3] hover:text-white transition-colors uppercase font-medium">Customize</Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              {data.blocks && data.blocks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.blocks.map(block => (
                    <div key={block.hash} className="p-4 flex flex-col md:flex-row gap-4 items-center">
                      <div className="hidden md:flex items-center justify-center w-10 h-10 bg-gray-100 rounded text-gray-500 shrink-0">
                        <FaCube />
                      </div>
                      <div className="flex-1 flex flex-col md:flex-row justify-between w-full gap-2">
                        <div className="min-w-0">
                          <div className="text-[#0784c3] font-medium truncate">
                            <Link href={`/block/${block.number}`}>{formatNumber(block.number)}</Link>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(block.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="min-w-0 md:text-right">
                          <div className="text-sm text-gray-700 truncate">
                            Miner <Link href={`/address/${block.miner}`} className="text-[#0784c3] truncate">{truncateHash(block.miner)}</Link>
                          </div>
                          <div className="text-xs text-gray-500">
                            <Link href={`/blocks`} className="text-[#0784c3]">{block.transactionCount} txns</Link> in 12 secs
                          </div>
                        </div>
                        <div className="min-w-0 md:text-right shrink-0">
                          <div className="text-xs font-medium bg-gray-100 text-gray-600 rounded px-2 py-0.5 inline-block">{formatEther(block.gasUsed)} Eth</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No blocks found</div>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 bg-[#f8f9fa] text-center">
              <Link href="/blocks" className="text-[#0784c3] text-xs uppercase font-bold hover:text-[#0670a6]">View all blocks</Link>
            </div>
          </div>

          {/* Latest Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa]">
              <h2 className="font-bold text-[#212529] text-base">Latest Transactions</h2>
              <Link href="/transactions" className="bg-white border border-gray-200 text-[#0784c3] text-xs px-2 py-1 rounded hover:bg-[#0784c3] hover:text-white transition-colors uppercase font-medium">Customize</Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              {data.transactions && data.transactions.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.transactions.map(tx => (
                    <div key={tx.hash} className="p-4 flex flex-col md:flex-row gap-4 items-center">
                      <div className="hidden md:flex items-center justify-center w-10 h-10 bg-gray-100 rounded text-gray-500 shrink-0">
                        <FaListOl />
                      </div>
                      <div className="flex-1 flex flex-col md:flex-row justify-between w-full gap-2">
                        <div className="min-w-0">
                          <div className="text-[#0784c3] font-medium truncate">
                            <Link href={`/transaction/${tx.hash}`}>{truncateHash(tx.hash)}</Link>
                          </div>
                          <div className="text-xs text-gray-500">
                            Just now
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-gray-700 truncate">
                            From <Link href={`/address/${tx.from}`} className="text-[#0784c3] truncate">{truncateHash(tx.from)}</Link>
                          </div>
                          <div className="text-sm text-gray-700 truncate">
                            To <Link href={`/address/${tx.to}`} className="text-[#0784c3] truncate">{truncateHash(tx.to || "Contract")}</Link>
                          </div>
                        </div>
                        <div className="min-w-0 md:text-right shrink-0">
                          <div className="text-xs font-medium bg-gray-100 text-gray-600 rounded px-2 py-0.5 inline-block">{formatEther(tx.value)} Eth</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">No transactions found</div>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 bg-[#f8f9fa] text-center">
              <Link href="/transactions" className="text-[#0784c3] text-xs uppercase font-bold hover:text-[#0670a6]">View all transactions</Link>
            </div>
          </div>

        </div>
      </main>
    </div >
  );
}
