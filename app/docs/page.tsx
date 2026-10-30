"use client";

import { useState } from "react";
import { docsData } from "../../lib/docsData";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const SECTIONS = [
  {
    group: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "creating-an-account", label: "Creating an Account" },
      { id: "setting-up-your-store", label: "Setting up your Store" },
    ],
  },
  {
    group: "Store Management",
    items: [
      { id: "adding-products", label: "Adding Products" },
      { id: "managing-orders", label: "Managing Orders" },
      { id: "payments-and-payouts", label: "Payments & Payouts" },
    ],
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const activeDoc = docsData[activeSection];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .dc-layout {
          max-width: 1120px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 48px;
          align-items: start;
        }
        .dc-sidebar {
          background: #F7F7F5;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 18px;
          position: sticky;
          top: 92px;
        }
        .dc-group-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          padding: 0 8px;
        }
        .dc-btn {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 500;
          color: #4B5563;
          cursor: pointer;
          font-family: inherit;
          margin-bottom: 2px;
        }
        .dc-btn:hover {
          background: #FFFFFF;
          color: #111827;
        }
        .dc-btn.active {
          background: #111827;
          color: #FFFFFF;
          font-weight: 600;
        }
        .dc-prose {
          font-size: 15.5px;
          line-height: 1.75;
          color: #374151;
          max-width: 720px;
        }
        .dc-prose h3 {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 28px 0 10px;
        }
        .dc-prose p {
          margin-bottom: 16px;
        }
        .dc-prose ul, .dc-prose ol {
          margin-bottom: 16px;
          padding-left: 22px;
        }
        .dc-prose li {
          margin-bottom: 8px;
        }
        @media (max-width: 820px) {
          .dc-layout {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .dc-sidebar {
            position: static;
          }
        }
      `}</style>

      <PublicHeader activePath="/docs" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Documentation
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "8px" }}>
            Shopply Platform Documentation
          </h1>
          <p style={{ fontSize: "15px", color: "#4B5563", maxWidth: "560px" }}>
            Reference guides for account verification, catalog configuration, and order management.
          </p>
        </div>
      </section>

      <div className="dc-layout">
        <aside className="dc-sidebar">
          {SECTIONS.map((group, idx) => (
            <div key={group.group} style={{ marginTop: idx > 0 ? "20px" : 0 }}>
              <div className="dc-group-title">{group.group}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dc-btn${activeSection === item.id ? " active" : ""}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="dc-prose">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "20px", letterSpacing: "-0.02em" }}>
            {activeDoc.title}
          </h2>
          <div dangerouslySetInnerHTML={{ __html: activeDoc.content }} />
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
