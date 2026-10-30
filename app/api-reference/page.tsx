"use client";

import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function ApiReferencePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/api-reference" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "56px 24px" }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Developers
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "10px" }}>
            REST API Reference
          </h1>
          <p style={{ fontSize: "15px", color: "#4B5563", maxWidth: "580px", lineHeight: 1.6 }}>
            Sync inventory, retrieve published catalog items, and automate order fulfillment workflows using JSON endpoints.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "920px", margin: "0 auto", padding: "56px 24px 88px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            List Published Storefront Items
          </h2>
          <p style={{ fontSize: "14.5px", color: "#4B5563", lineHeight: 1.6 }}>
            Returns active published items with Philippine Peso pricing, variant availability, and verified seller metadata.
          </p>
        </div>

        <div
          style={{
            background: "#111827",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #1F2937",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#1F2937",
              padding: "12px 20px",
              fontSize: "12.5px",
              color: "#D1D5DB",
              fontFamily: "monospace",
            }}
          >
            <span>GET /api/shop/items</span>
            <span style={{ color: "#34D399" }}>200 OK · JSON</span>
          </div>
          <pre
            style={{
              padding: "24px 20px",
              margin: 0,
              color: "#F9FAFB",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "13.5px",
              lineHeight: 1.7,
              overflowX: "auto",
            }}
          >{`const res = await fetch("https://www.shop-ply.site/api/shop/items", {
  method: "GET",
  headers: {
    "Accept": "application/json"
  }
});

const { items } = await res.json();
// [
//   {
//     "id": 1,
//     "name": "AeroSwift Running Shoes",
//     "price": "1850.00",
//     "category": "Footwear",
//     "stock": 34,
//     "location": "Cebu City, Cebu"
//   }
// ]`}</pre>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
