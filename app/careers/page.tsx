"use client";

import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const ROLES = [
  {
    dept: "Engineering",
    jobs: [
      { title: "Senior Full-Stack Engineer (Next.js / TypeScript)", meta: "Metro Manila or Remote (PH) · Full-time" },
      { title: "Platform & Payments Reliability Engineer", meta: "Remote (PH) · Full-time" },
    ],
  },
  {
    dept: "Operations & Merchant Success",
    jobs: [
      { title: "Merchant Onboarding Specialist", meta: "Makati / Cebu · Full-time" },
    ],
  },
];

export default function CareersPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/careers" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "60px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "10px" }}>
            Careers at Shopply
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "14px" }}>
            Help build practical tools for independent sellers.
          </h1>
          <p style={{ fontSize: "15.5px", color: "#4B5563", maxWidth: "600px", lineHeight: 1.65 }}>
            We are a product-focused team building reliable e-commerce software, messaging, and checkout infrastructure for local stores across the Philippines.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {ROLES.map((group) => (
            <div
              key={group.dept}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  background: "#F7F7F5",
                  borderBottom: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>{group.dept}</h2>
                <span
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    color: "#065F46",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {group.jobs.length} {group.jobs.length === 1 ? "Role" : "Roles"}
                </span>
              </div>

              {group.jobs.map((job, idx) => (
                <div
                  key={job.title}
                  style={{
                    padding: "20px 24px",
                    borderBottom: idx < group.jobs.length - 1 ? "1px solid #F3F4F6" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "15.5px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{job.title}</h3>
                    <p style={{ fontSize: "13.5px", color: "#6B7280", margin: 0 }}>{job.meta}</p>
                  </div>
                  <Link
                    href="/contact"
                    style={{
                      padding: "8px 16px",
                      background: "#111827",
                      color: "#FFFFFF",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Apply via Contact
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
