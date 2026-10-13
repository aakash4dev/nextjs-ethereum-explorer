/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Native-ish / heavy server packages stay external to the bundle.
  serverExternalPackages: ['solc', 'mongoose'],
  // The solc worker is loaded by path at runtime; make sure it ships.
  outputFileTracingIncludes: {
    '/api/**': ['./workers/**', './node_modules/solc/**'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Public, read-only API: allow cross-origin use (wallets, dashboards, scripts).
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/transaction/:hash', destination: '/tx/:hash', permanent: true },
      { source: '/transactions', destination: '/txs', permanent: true },
      { source: '/gas', destination: '/gastracker', permanent: true },
    ];
  },
};

export default nextConfig;
