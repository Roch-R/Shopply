"use client";

import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const RELEASES = [
  {
    version: "v2.5.0",
    date: "October 2026",
    title: "Clean Storefront & Workspace Redesign",
    items: [
      "Redesigned public storefront, category browsing, and live arrivals with high-contrast editorial typography",
      "Unified buyer marketplace, cart, and seller dashboard around a distraction-free neutral palette",
      "Streamlined sign-in and account verification flows for faster page loads on mobile and desktop",
    ],
  },
  {
    version: "v2.4.0",
    date: "May 20, 2026",
    title: "Session Security & Variant Inventory Controls",
    items: [
      "Added per-size and per-color inventory tracking across storefront listings",
      "Strengthened session isolation between public pages and authenticated member routes",
      "Updated Terms of Service, Privacy Policy, and Cookie preferences",
    ],
  },
  {
    version: "v2.3.0",
    date: "May 10, 2026",
    title: "Real-Time Buyer & Seller Messaging",
    items: [
      "Direct messaging between shoppers and verified merchants with live unread indicators",
      "Support for sharing product photos and meetup pin locations inside conversations",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/changelog" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "56px 24px" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Release Notes
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "10px" }}>
            Changelog
          </h1>
          <p style={{ fontSize: "15px", color: "#4B5563" }}>
            Platform improvements, merchant tools, and reliability updates shipped on Shopply.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "820px", margin: "0 auto", padding: "56px 24px 88px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {RELEASES.map((log) => (
            <article
              key={log.version}
              style={{
                paddingBottom: "36px",
                borderBottom: "1px solid #E5E7EB",
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: "24px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: "15px", fontVariantNumeric: "tabular-nums" }}>
                  {log.version}
                </div>
                <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{log.date}</div>
              </div>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "19px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>
                  {log.title}
                </h2>
                <ul style={{ paddingLeft: "20px", margin: 0, color: "#374151", fontSize: "14.5px", lineHeight: 1.7 }}>
                  {log.items.map((item) => (
                    <li key={item} style={{ marginBottom: "8px" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
