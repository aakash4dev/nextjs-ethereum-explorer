"use client";
import Link from "next/link";
import { FaEthereum } from "react-icons/fa";

export default function Navbar() {
    return (
        <nav className="bg-white border-b border-gray-200 py-3 sticky top-0 z-50">
            <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[#212529] hover:text-[#0784c3] transition-colors">
                    <FaEthereum className="text-[#0784c3]" />
                    <span>Ethereum Explorer</span>
                </Link>
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-[#6c757d] hover:text-[#0784c3] font-medium transition-colors">
                        Home
                    </Link>
                    <Link href="/transactions" className="text-[#6c757d] hover:text-[#0784c3] font-medium transition-colors">
                        Transactions
                    </Link>
                    <Link href="/blocks" className="text-[#6c757d] hover:text-[#0784c3] font-medium transition-colors">
                        Blocks
                    </Link>
                </div>
            </div>
        </nav>
    );
}
