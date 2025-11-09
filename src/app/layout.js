import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ethereum Explorer - Industrial Grade Blockchain Explorer",
  description: "Comprehensive Ethereum blockchain explorer with real-time indexing, transaction tracking, and address analytics",
  keywords: [
    "Ethereum",
    "Blockchain Explorer",
    "Ethereum Explorer",
    "Blockchain Indexer",
    "Transaction Tracker",
    "Address Analytics",
    "Ethereum Transactions",
    "Block Explorer",
    "Web3",
    "Cryptocurrency"
  ],
  authors: [{ name: "Aakash Singh Rajput" }],
  creator: "Aakash Singh Rajput",
  publisher: "Aakash Singh Rajput",
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'android-chrome-512x512', url: '/favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: "Ethereum Explorer - Industrial Grade Blockchain Explorer",
    description: "Comprehensive Ethereum blockchain explorer with real-time indexing, transaction tracking, and address analytics",
    siteName: "Ethereum Explorer",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/homepage.png",
        width: 1200,
        height: 630,
        alt: "Ethereum Explorer - Blockchain Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ethereum Explorer - Industrial Grade Blockchain Explorer",
    description: "Comprehensive Ethereum blockchain explorer with real-time indexing, transaction tracking, and address analytics",
    images: ["/homepage.png"],
    creator: "@aakash4dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here if needed
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
