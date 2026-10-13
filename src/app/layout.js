import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { themeInitScript } from '@/components/client/ThemeToggle';
import config from '@/lib/config';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const title = `${config.chainName} Explorer`;
const description = `Explore ${config.chainName} blocks, transactions, addresses, tokens and smart contracts. Verify contract source code, track gas prices and analyse on-chain activity.`;

export const metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: `${title} | Blockchain Explorer, Search and Analytics`, template: `%s | ${title}` },
  description,
  keywords: ['Ethereum', 'EVM', 'Blockchain Explorer', 'Block Explorer', 'Transactions', 'Smart Contracts', 'Contract Verification', 'Gas Tracker', 'ERC-20', 'NFT', 'Web3'],
  authors: [{ name: 'Aakash Singh Rajput' }],
  creator: 'Aakash Singh Rajput',
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  openGraph: { title, description, siteName: title, locale: 'en_US', type: 'website', images: [{ url: '/screenshots/home.png', width: 1200, height: 630, alt: title }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/screenshots/home.png'], creator: '@aakash4dev' },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
