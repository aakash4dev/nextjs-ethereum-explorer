import Link from "next/link";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

async function getTransactionData(hash) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/transaction/${hash}`);
  if (!res.ok) {
    console.error("Failed to fetch transaction data:", await res.text());
    throw new Error("Failed to fetch transaction data");
  }
  return res.json();
}

export default async function TransactionPage({ params }) {
  const { hash } = params;
  let tx, error;
  try {
    const data = await getTransactionData(hash);
    tx = data.transaction;
  } catch (e) {
    error = e.message;
  }

  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!tx) return <div className="p-8">Transaction not found.</div>;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <main className="max-w-2xl mx-auto p-6 flex-1">
        <h1 className="text-3xl font-bold text-cyan-400 mb-4">Transaction</h1>
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div><span className="font-semibold">Hash:</span> <span className="font-mono">{tx.hash}</span></div>
          <div><span className="font-semibold">Block Number:</span> <Link href={`/block/${tx.blockNumber}`} className="text-cyan-300 hover:underline">{tx.blockNumber}</Link></div>
          <div><span className="font-semibold">From:</span> <span className="font-mono text-purple-400">{tx.from}</span></div>
          <div><span className="font-semibold">To:</span> <span className="font-mono text-purple-400">{tx.to}</span></div>
          <div><span className="font-semibold">Value:</span> {(Number(tx.value) / 1e18).toFixed(4)} ETH</div>
          <div><span className="font-semibold">Gas:</span> {tx.gas}</div>
          <div><span className="font-semibold">Gas Price:</span> {tx.gasPrice}</div>
          <div><span className="font-semibold">Nonce:</span> {tx.nonce}</div>
        </div>
        <div className="mt-6">
          <Link href="/" className="text-cyan-300 hover:underline">← Back to Explorer</Link>
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