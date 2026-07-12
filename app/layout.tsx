import type { Metadata, Viewport } from "next";
import Script from "next/script";
import CookieBanner from "@/components/CookieBanner";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopply",
  description: "Premium E-Commerce Platform",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Viewport meta tag for mobile responsiveness */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preconnect to API server for faster data fetches */}
        <link rel="preconnect" href="http://127.0.0.1:8000" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Analytics />
        <CookieBanner />
        
        {/* Service Worker Registration */}
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // In development, unregister any active service worker to prevent stale caching
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.unregister().then(function() {
                      console.log('[Dev] Service Worker unregistered');
                    });
                  }
                });
                // Clear cache storage
                if (window.caches) {
                  caches.keys().then(function(keys) {
                    keys.forEach(function(key) {
                      caches.delete(key);
                    });
                  });
                }
              } else {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[App] Service Worker registered, scope:', reg.scope);
                      // Trim image cache periodically
                      if (reg.active) {
                        reg.active.postMessage({ type: 'TRIM_CACHES' });
                      }
                    })
                    .catch(function(err) {
                      console.log('[App] Service Worker registration failed:', err);
                    });
                });
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}
