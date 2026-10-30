"use client";

import Link from "next/link";
import { guidesData } from "../../lib/guidesData";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function GuidesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/guides" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "60px 24px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "10px" }}>
            Help &amp; Guides
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "12px" }}>
            Seller &amp; shopper guides
          </h1>
          <p style={{ fontSize: "15.5px", color: "#4B5563", maxWidth: "580px", lineHeight: 1.6 }}>
            Step-by-step instructions on setting up your store, pricing products, managing stock, and fulfilling orders cleanly.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {guidesData.map((guide) => (
            <Link
              href={`/guides/${guide.slug}`}
              key={guide.slug}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
                minHeight: "190px",
              }}
            >
              <span
                style={{
                  color: "#0D6847",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "10px",
                }}
              >
                {guide.cat}
              </span>
              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "16px",
                  lineHeight: 1.35,
                }}
              >
                {guide.title}
              </h2>
              <span style={{ color: "#111827", fontSize: "13.5px", fontWeight: 600, marginTop: "auto" }}>
                Read guide →
              </span>
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
