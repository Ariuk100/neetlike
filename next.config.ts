// /next.config.ts
import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Бусад PWA тохиргоог энд нэмж болно
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      { protocol: "https", hostname: "e7b9e46baf6a9b19fc668713a540639b.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "pub-e7b9e46baf6a9b19fc668713a540639b.r2.dev" },
      { protocol: "https", hostname: "09e2947bfcee4019a38b1b41cf1e353e.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "pub-09e2947bfcee4019a38b1b41cf1e353e.r2.dev" },
      { protocol: "https", hostname: "placehold.co" },
      // Firebase Storage
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      // Google Drive
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Бусад header тохиргоо хэвээрээ...
    ];
  }
};

export default withPWA(nextConfig);