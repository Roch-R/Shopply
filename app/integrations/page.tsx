"use client";

import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const INTEGRATIONS = [
  { name: "GCash & Maya", category: "Payments", desc: "Accept local Philippine e-wallet payments alongside Cash on Delivery." },
  { name: "J&T & SPX Express", category: "Logistics", desc: "Coordinate nationwide doorstep parcel dispatch across Luzon, Visayas, and Mindanao." },
  { name: "Google Sign-In", category: "Authentication", desc: "One-click OAuth 2.0 account sign-in and merchant verification." },
  { name: "Google Analytics", category: "Reporting", desc: "Measure storefront visits, product views, and checkout conversion rates." },
  { name: "OpenStreetMap Pins", category: "Local Meetups", desc: "Share exact local meetup coordinates inside buyer-seller chat threads." },
  { name: "CSV Catalog Export", category: "Inventory", desc: "Keep clean records of your product SKUs, stock counts, and completed orders." },
];

export default function IntegrationsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/integrations" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "56px 24px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Ecosystem
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "10px" }}>
            Supported payments, couriers &amp; tools
          </h1>
          <p style={{ fontSize: "15.5px", color: "#4B5563", maxWidth: "600px", lineHeight: 1.6 }}>
            Built-in connections for local payments, courier tracking, meetup maps, and store operations.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "56px 24px 88px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {INTEGRATIONS.map((app) => (
            <div
              key={app.name}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#0D6847",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "8px",
                }}
              >
                {app.category}
              </span>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>{app.name}</h2>
              <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.6, marginBottom: "20px", flex: 1 }}>
                {app.desc}
              </p>
              <Link
                href="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "38px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#F9FAFB",
                  color: "#111827",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Available in seller dashboard
              </Link>
            </div>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
