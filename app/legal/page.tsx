"use client";

import { useState, useEffect } from "react";
import { policies } from "../../lib/legalData";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function LegalPage() {
  const [activePolicy, setActivePolicy] = useState<keyof typeof policies>("terms");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activePolicy]);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .lg-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          max-width: 1120px;
          margin: 0 auto;
          padding: 56px 24px 80px;
          gap: 48px;
          align-items: start;
        }
        .lg-sidebar {
          position: sticky;
          top: 92px;
          background: #F7F7F5;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }
        .lg-sidebar h3 {
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6B7280;
          font-weight: 700;
          margin-bottom: 10px;
          padding: 0 8px;
        }
        .lg-item {
          display: block;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 9px 12px;
          font-size: 13.5px;
          font-weight: 500;
          color: #4B5563;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 2px;
          font-family: inherit;
        }
        .lg-item:hover {
          background: #FFFFFF;
          color: #111827;
        }
        .lg-item.active {
          background: #111827;
          color: #FFFFFF;
          font-weight: 600;
        }
        .lg-content {
          max-width: 720px;
        }
        .lg-content h1 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(28px, 3.8vw, 36px);
          font-weight: 700;
          color: #111827;
          margin-bottom: 28px;
          letter-spacing: -0.025em;
        }
        .lg-html {
          font-size: 15px;
          line-height: 1.75;
          color: #374151;
        }
        .lg-html h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 19px;
          color: #111827;
          margin: 32px 0 12px;
          font-weight: 700;
        }
        .lg-html p {
          margin-bottom: 16px;
        }
        @media (max-width: 820px) {
          .lg-layout {
            grid-template-columns: 1fr;
            gap: 28px;
          }
          .lg-sidebar {
            position: static;
          }
        }
      `}</style>

      <PublicHeader activePath="/legal" />

      <div className="lg-layout">
        <aside className="lg-sidebar">
          <h3>Legal Documents</h3>
          {Object.entries(policies).map(([key, policy]) => (
            <button
              key={key}
              type="button"
              className={`lg-item ${activePolicy === key ? "active" : ""}`}
              onClick={() => setActivePolicy(key as keyof typeof policies)}
            >
              {policy.title}
            </button>
          ))}
        </aside>

        <main className="lg-content">
          <h1>{policies[activePolicy].title}</h1>
          <div
            className="lg-html"
            dangerouslySetInnerHTML={{ __html: policies[activePolicy].content }}
          />
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
