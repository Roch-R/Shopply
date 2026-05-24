import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.160.98'],
  devIndicators: false,
  
  // Enable gzip/brotli compression for smaller response sizes
  compress: true,

  // HTTP caching headers for static assets and images
  async headers() {
    return [
      {
        // Product/avatar images from storage — cache for 1 hour, revalidate
        source: '/storage/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Public images (logo, icons) — cache for 1 week
        source: '/(.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Fonts — immutable with long cache
        source: '/(.*\\.(?:woff|woff2|ttf|otf|eot))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Service Worker — never cache the SW itself
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;