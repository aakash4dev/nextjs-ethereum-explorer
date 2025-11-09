"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { FaSync, FaEthereum, FaCube, FaExchangeAlt, FaSearch, FaChartLine, FaUsers } from "react-icons/fa";
import { SiBlockchaindotcom } from "react-icons/si";
import Footer from "./components/Footer";

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
        if (!stats) {
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
        }
        setApiError(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
      setApiError(true);
      // Set default empty stats on error
      if (!stats) {
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
      }
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
        if (!syncStatus) {
          setSyncStatus({
            isSyncing: false,
            lastProcessedBlock: 0,
            totalBlocksIndexed: 0,
            totalTransactionsIndexed: 0,
            blocksBehind: 0,
            syncProgress: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching sync status:", error.message);
      // Set default sync status on error
      if (!syncStatus) {
        setSyncStatus({
          isSyncing: false,
          lastProcessedBlock: 0,
          totalBlocksIndexed: 0,
          totalTransactionsIndexed: 0,
          blocksBehind: 0,
          syncProgress: 0,
        });
      }
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
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 flex items-center justify-center gap-3">
            <FaEthereum className="inline text-cyan-300 mb-1" /> Ethereum Explorer
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Industrial-grade blockchain explorer with real-time indexing</p>
        </header>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row justify-center mb-8 gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full py-3 pl-12 pr-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg shadow-lg"
              placeholder="Search by block number, tx hash, or address..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          </div>
          <button 
            type="submit" 
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-3 rounded-lg transition duration-200 shadow-lg shadow-cyan-500/30"
          >
            Search
          </button>
        </form>
        {searchError && <div className="text-center text-red-400 mb-4">{searchError}</div>}

        {/* Blockchain Not Synced Warning */}
        {(apiError || !stats || (stats.overview?.totalBlocks === 0 && stats.overview?.totalTransactions === 0)) && !isLoading && (
          <div className={`bg-gradient-to-r ${apiError ? 'from-red-900/50 to-orange-900/50 border-red-600' : 'from-yellow-900/50 to-orange-900/50 border-yellow-600'} border-2 rounded-xl p-6 mb-8 shadow-lg`}>
            <div className="flex items-center gap-4">
              <FaSync className={`text-4xl ${apiError ? 'text-red-400' : 'text-yellow-400'} animate-pulse`} />
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${apiError ? 'text-red-300' : 'text-yellow-300'} mb-1`}>
                  Blockchain is Not Synced
                </h3>
                {apiError ? (
                  <>
                    <p className={`${apiError ? 'text-red-200/80' : 'text-yellow-200/80'} mb-2`}>
                      Unable to connect to the database. The blockchain sync service cannot run without a database connection.
                    </p>
                    <div className="mt-3 pt-3 border-t border-red-700/50">
                      <p className="text-sm text-red-200/70">
                        <strong>For local development:</strong> Make sure MongoDB is running and <code className="bg-red-900/50 px-2 py-1 rounded font-mono">MONGODB_URI</code> in your <code className="bg-red-900/50 px-2 py-1 rounded font-mono">.env</code> file is correct.
                      </p>
                      <p className="text-sm text-red-200/70 mt-2">
                        <strong>For Vercel:</strong> Check that environment variables are set correctly in Vercel dashboard (Settings → Environment Variables).
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-yellow-200/80 mb-2">
                      No blocks have been indexed yet. You need to start the sync service from the backend to begin indexing the blockchain.
                    </p>
                    <div className="mt-3 pt-3 border-t border-yellow-700/50">
                      <p className="text-sm text-yellow-200/70">
                        <strong>To start syncing:</strong> Run <code className="bg-yellow-900/50 px-2 py-1 rounded font-mono">npm run sync</code> in a separate terminal, or use the background sync service.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-cyan-500/20 transition-shadow">
              <FaCube className="text-4xl text-cyan-400" />
              <div>
                <div className="text-gray-400 text-sm">Latest Block</div>
                <div className="text-2xl font-bold text-cyan-200">{stats?.overview?.latestBlockNumber ? formatNumber(stats.overview.latestBlockNumber) : "-"}</div>
                {syncStatus && (
                  <div className="text-xs text-gray-500 mt-1">
                    {syncStatus.blocksBehind > 0 ? `${syncStatus.blocksBehind} behind` : "Synced"}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-purple-500/20 transition-shadow">
              <FaExchangeAlt className="text-4xl text-purple-400" />
              <div>
                <div className="text-gray-400 text-sm">Total Transactions</div>
                <div className="text-2xl font-bold text-purple-200">{stats?.overview?.totalTransactions ? formatNumber(stats.overview.totalTransactions) : "-"}</div>
                {stats?.activity && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatNumber(stats.activity.transactionsLast24h)} last 24h
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-green-500/20 transition-shadow">
              <SiBlockchaindotcom className="text-4xl text-green-400" />
              <div>
                <div className="text-gray-400 text-sm">Indexed Blocks</div>
                <div className="text-2xl font-bold text-green-200">{stats?.overview?.totalBlocks ? formatNumber(stats.overview.totalBlocks) : "-"}</div>
                {stats?.activity && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatNumber(stats.activity.blocksLast24h)} last 24h
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-lg hover:shadow-yellow-500/20 transition-shadow">
              <FaSync className={`text-4xl ${isSyncing ? "animate-spin text-yellow-400" : "text-yellow-400"}`} />
              <div>
                <div className="text-gray-400 text-sm">Sync Status</div>
                <div className="text-2xl font-bold text-yellow-200">{isSyncing ? "Syncing..." : syncStatus?.isSyncing ? "Syncing..." : "Up to date"}</div>
                {syncStatus && syncStatus.syncProgress > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {syncStatus.syncProgress}% complete
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-800/70 p-5 rounded-xl border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <FaUsers className="text-cyan-400" />
                <div className="text-gray-400 text-sm">Total Addresses</div>
              </div>
              <div className="text-xl font-bold text-cyan-200">{stats?.overview?.totalAddresses ? formatNumber(stats.overview.totalAddresses) : "-"}</div>
            </div>
            <div className="bg-gray-800/70 p-5 rounded-xl border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <FaChartLine className="text-purple-400" />
                <div className="text-gray-400 text-sm">Avg Gas Used</div>
              </div>
              <div className="text-xl font-bold text-purple-200">
                {stats?.gas?.avgGasUsed ? formatNumber(Math.round(stats.gas.avgGasUsed)) : "-"}
              </div>
            </div>
            <div className="bg-gray-800/70 p-5 rounded-xl border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <FaSync className="text-green-400" />
                <div className="text-gray-400 text-sm">Indexer Progress</div>
              </div>
              <div className="text-xl font-bold text-green-200">
                {syncStatus?.totalBlocksIndexed ? formatNumber(syncStatus.totalBlocksIndexed) : "-"} blocks
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Blocks Section */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-cyan-300">Latest Blocks</h2>
              <Link href="/blocks" className="text-cyan-400 hover:underline text-sm">View All</Link>
            </div>
            <div className="overflow-x-auto">
              {(isLoading && data.blocks.length === 0) ? (
                <div className="text-center py-8 text-gray-400">Loading blocks...</div>
              ) : (apiError || !stats || stats.overview?.totalBlocks === 0) ? (
                <div className="text-center py-12">
                  <FaCube className={`text-6xl ${apiError ? 'text-red-600' : 'text-gray-600'} mx-auto mb-4`} />
                  <p className={`${apiError ? 'text-red-400' : 'text-gray-400'} text-lg mb-2`}>
                    {apiError ? 'Blockchain Not Synced' : 'No blocks indexed yet'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {apiError 
                      ? 'Unable to connect to the database. Please check your MongoDB connection.'
                      : 'Start the sync service from the backend to begin indexing blocks.'
                    }
                    <br />
                    {apiError ? (
                      <span className="text-xs text-gray-600 mt-2 block">
                        Check your <code className="bg-gray-900/50 px-2 py-1 rounded">MONGODB_URI</code> in <code className="bg-gray-900/50 px-2 py-1 rounded">.env</code> file or Vercel environment variables.
                      </span>
                    ) : (
                      <code className="bg-gray-900/50 px-2 py-1 rounded text-xs mt-2 inline-block">npm run sync</code>
                    )}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2 text-sm text-gray-400">Block</th>
                      <th className="p-2 text-sm text-gray-400">Miner</th>
                      <th className="p-2 text-sm text-gray-400 text-right">Txs</th>
                      <th className="p-2 text-sm text-gray-400 text-right">Gas Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blocks && data.blocks.length > 0 ? (
                      data.blocks.map(block => (
                        <tr key={block.hash} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                          <td className="p-3 text-cyan-400 font-mono">
                            <Link href={`/block/${block.number}`} className="hover:underline">
                              {formatNumber(block.number)}
                            </Link>
                          </td>
                          <td className="p-3 font-mono text-purple-400 text-sm">{truncateHash(block.miner)}</td>
                          <td className="p-3 text-right">{block.transactionCount}</td>
                          <td className="p-3 text-right text-sm">{formatNumber(block.gasUsed)}</td>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-cyan-300">Latest Transactions</h2>
              <Link href="/transactions" className="text-cyan-400 hover:underline text-sm">View All</Link>
            </div>
            <div className="overflow-x-auto">
              {(isLoading && data.transactions.length === 0) ? (
                <div className="text-center py-8 text-gray-400">Loading transactions...</div>
              ) : (apiError || !stats || stats.overview?.totalTransactions === 0) ? (
                <div className="text-center py-12">
                  <FaExchangeAlt className={`text-6xl ${apiError ? 'text-red-600' : 'text-gray-600'} mx-auto mb-4`} />
                  <p className={`${apiError ? 'text-red-400' : 'text-gray-400'} text-lg mb-2`}>
                    {apiError ? 'Blockchain Not Synced' : 'No transactions indexed yet'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {apiError 
                      ? 'Unable to connect to the database. Please check your MongoDB connection.'
                      : 'Start the sync service from the backend to begin indexing transactions.'
                    }
                    <br />
                    {apiError ? (
                      <span className="text-xs text-gray-600 mt-2 block">
                        Check your <code className="bg-gray-900/50 px-2 py-1 rounded">MONGODB_URI</code> in <code className="bg-gray-900/50 px-2 py-1 rounded">.env</code> file or Vercel environment variables.
                      </span>
                    ) : (
                      <code className="bg-gray-900/50 px-2 py-1 rounded text-xs mt-2 inline-block">npm run sync</code>
                    )}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2 text-sm text-gray-400">Hash</th>
                      <th className="p-2 text-sm text-gray-400">From</th>
                      <th className="p-2 text-sm text-gray-400">To</th>
                      <th className="p-2 text-sm text-gray-400 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions && data.transactions.length > 0 ? (
                      data.transactions.map(tx => (
                        <tr key={tx.hash} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                          <td className="p-3 font-mono text-cyan-400 text-sm">
                            <Link href={`/transaction/${tx.hash}`} className="hover:underline">
                              {truncateHash(tx.hash)}
                            </Link>
                          </td>
                          <td className="p-3 font-mono text-purple-400 text-sm">{truncateHash(tx.from)}</td>
                          <td className="p-3 font-mono text-purple-400 text-sm">{truncateHash(tx.to || "Contract")}</td>
                          <td className="p-3 text-right text-sm">{formatEther(tx.value)} ETH</td>
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
