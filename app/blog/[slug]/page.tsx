"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getBlogPostBySlug } from "../../../lib/blogData";
import { useEffect, useState } from "react";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function BlogPostPage() {
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

  const post = getBlogPostBySlug(slug);

  if (mounted && !post) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
        <PublicHeader activePath="/blog" />
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#111827", marginBottom: "10px" }}>Article not found</h1>
          <p style={{ color: "#6B7280", marginBottom: "24px", fontSize: "15px" }}>
            The article you requested may have been moved or removed.
          </p>
          <Link href="/blog" style={{ color: "#111827", fontWeight: 600, textDecoration: "underline" }}>
            ← Back to Journal
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .art-prose {
          font-size: 16.5px;
          line-height: 1.8;
          color: #374151;
        }
        .art-prose h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 40px 0 16px;
          letter-spacing: -0.02em;
        }
        .art-prose h3 {
          font-size: 19px;
          font-weight: 700;
          color: #111827;
          margin: 28px 0 12px;
        }
        .art-prose p {
          margin-bottom: 20px;
        }
        .art-prose ul {
          margin-bottom: 20px;
          padding-left: 24px;
        }
        .art-prose li {
          margin-bottom: 10px;
        }
        .art-prose strong {
          color: #111827;
          font-weight: 600;
        }
        .art-prose em {
          color: #0D6847;
          font-style: normal;
          font-weight: 600;
        }
      `}</style>

      <PublicHeader activePath="/blog" />

      <header style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "740px", margin: "0 auto" }}>
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#4B5563",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: 500,
              marginBottom: "24px",
            }}
          >
            ← Back to Journal
          </Link>
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.18,
              letterSpacing: "-0.025em",
              marginBottom: "20px",
            }}
          >
            {post.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13.5px", color: "#4B5563" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#111827",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {post.author.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827" }}>{post.author}</div>
              <div style={{ color: "#6B7280", fontSize: "12.5px" }}>
                {post.date} · {post.readTime}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "48px 24px 88px" }}>
        <div className="art-prose" dangerouslySetInnerHTML={{ __html: post.content }} />
      </main>

      <PublicFooter />
    </div>
  );
}
