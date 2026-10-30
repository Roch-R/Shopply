"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { guidesData } from "../../../lib/guidesData";
import { useEffect, useState } from "react";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function GuidePage() {
  const params = useParams();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : "";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const guide = guidesData.find((g) => g.slug === slug);

  if (mounted && !guide) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
        <PublicHeader activePath="/guides" />
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#111827", marginBottom: "10px" }}>Guide not found</h1>
          <p style={{ color: "#6B7280", marginBottom: "24px", fontSize: "15px" }}>
            We couldn&apos;t find the guide you were looking for.
          </p>
          <Link href="/guides" style={{ color: "#111827", fontWeight: 600, textDecoration: "underline" }}>
            ← Back to Guides
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!guide) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .gd-prose { font-size: 16px; line-height: 1.8; color: #374151; }
        .gd-prose h2 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 24px; color: #111827; margin: 40px 0 16px; font-weight: 700; letter-spacing: -0.02em; }
        .gd-prose h3 { font-size: 18px; color: #111827; margin: 28px 0 12px; font-weight: 700; }
        .gd-prose p { margin-bottom: 18px; }
        .gd-prose ul, .gd-prose ol { margin-bottom: 18px; padding-left: 24px; }
        .gd-prose li { margin-bottom: 10px; }
        .gd-prose strong { color: #111827; font-weight: 600; }
      `}</style>

      <PublicHeader activePath="/guides" />

      <header style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "740px", margin: "0 auto" }}>
          <Link
            href="/guides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: "#4B5563",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "13.5px",
              marginBottom: "20px",
            }}
          >
            ← Back to Guides
          </Link>
          <div style={{ color: "#0D6847", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
            {guide.cat}
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 700, color: "#111827", lineHeight: 1.18, letterSpacing: "-0.025em" }}>
            {guide.title}
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "48px 24px 88px" }}>
        <div className="gd-prose" dangerouslySetInnerHTML={{ __html: guide.content }} />
      </main>

      <PublicFooter />
    </div>
  );
}
