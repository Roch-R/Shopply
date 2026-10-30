"use client";

import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const FEATURES = [
  {
    title: "Clean Storefront & Product Matrix",
    description: "Publish items with multi-size and color stock tracking, clear Philippine Peso pricing, and promotional markdowns.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: "Order & Fulfillment Workflow",
    description: "Accept incoming orders, mark shipments dispatched, and track buyer receipt confirmations from one organized view.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: "Real-Time Buyer & Seller Chat",
    description: "Answer customer questions, share product photos, and coordinate local meetup locations with built-in map pins.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Time-Limited Flash Deals",
    description: "Run scheduled markdowns on selected inventory with automatic expiration so prices revert cleanly when a sale ends.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Sales & Inventory Analytics",
    description: "Review completed revenue, order volume, low-stock alerts, and verified buyer ratings without external spreadsheets.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: "Account & Checkout Security",
    description: "Email OTP verification, 256-bit SSL encryption, and session-scoped marketplace access keep accounts protected.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function FeaturesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/features" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "64px 24px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "12px" }}>
            Platform Capabilities
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.12, marginBottom: "16px", maxWidth: "680px" }}>
            Practical tools built for everyday sellers and shoppers.
          </h1>
          <p style={{ fontSize: "16px", color: "#4B5563", lineHeight: 1.65, maxWidth: "620px" }}>
            Everything you need to list products, manage variant stock, chat with customers, and fulfill nationwide orders from one clean workspace.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "20px", marginBottom: "64px" }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "28px 24px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "#F7F7F5",
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: "16.5px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#F7F7F5",
            border: "1px solid #E5E7EB",
            borderRadius: "14px",
            padding: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
              Ready to try Shopply?
            </h2>
            <p style={{ fontSize: "14px", color: "#4B5563" }}>
              Create an account for free and set up your first product listing in minutes.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/register"
              style={{
                background: "#111827",
                color: "#FFFFFF",
                padding: "11px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Create free account
            </Link>
            <Link
              href="/login"
              style={{
                background: "#FFFFFF",
                color: "#111827",
                border: "1px solid #D1D5DB",
                padding: "11px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
