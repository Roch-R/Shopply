import type { Metadata, Viewport } from "next";
import Script from "next/script";
import CookieBanner from "@/components/CookieBanner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.shop-ply.site"),
  title: {
    default: "Shopply | Online Shopping & Marketplace Philippines",
    template: "%s | Shopply",
  },
  description: "Shop quality electronics, gadgets, clothes, shoes, household tools, and beauty essentials on Shopply (shop-ply.site). Fast shipping, secure checkout, and verified sellers across the Philippines.",
  keywords: [
    "Shopply",
    "shop-ply",
    "shop ply",
    "shop-ply.site",
    "shopply philippines",
    "online shopping philippines",
    "e-commerce marketplace",
    "tools and hardware",
    "electronics online shop",
    "buy clothes and shoes online"
  ],
  authors: [{ name: "Shopply" }],
  creator: "Shopply",
  publisher: "Shopply",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://shop-ply.site",
    title: "Shopply | Online Shopping & Marketplace Philippines",
    description: "Shop quality electronics, gadgets, tools, clothes, and home essentials on Shopply.",
    siteName: "Shopply",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Shopply Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopply | Online Shopping & Marketplace Philippines",
    description: "Shop quality electronics, gadgets, tools, clothes, and home essentials on Shopply.",
    images: ["/icon.png"],
  },
  icons: {
    icon: [
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: "ed3b42f783975a11",
    other: {
      "msvalidate.01": "D9584555342261FD80C421BF65B3B1E3",
    },
  },
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
        {/* Microsoft Bing Webmaster Verification */}
        <meta name="msvalidate.01" content="D9584555342261FD80C421BF65B3B1E3" />

        {/* Favicons & Brand Icons (Google Search guidelines: multiple of 48px square) */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48x48.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

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
        <SpeedInsights />
        <CookieBanner />
        
        {/* Service Worker Registration */}
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`
            // One-time automatic cache clearance to force update old cached client pages
            if (!localStorage.getItem('shopply_force_clear_v30')) {
              localStorage.setItem('shopply_force_clear_v30', 'true');
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                  }
                });
              }
              if (window.caches) {
                caches.keys().then(function(keys) {
                  keys.forEach(function(key) {
                    caches.delete(key);
                  });
                });
              }
              setTimeout(function() {
                window.location.reload();
              }, 400);
            }

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
