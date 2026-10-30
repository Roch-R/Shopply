"use client";

import Link from "next/link";
import { blogPosts } from "../../lib/blogData";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

const EDITORIAL_COVERS = [
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80",
];

export default function BlogPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicHeader activePath="/blog" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "60px 24px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "10px" }}>
            Shopply Journal
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "12px" }}>
            Merchant stories &amp; platform updates
          </h1>
          <p style={{ fontSize: "15.5px", color: "#4B5563", maxWidth: "580px", lineHeight: 1.6 }}>
            Practical notes on running an online shop, product photography, fulfillment, and new releases from the Shopply team.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "24px" }}>
          {blogPosts.map((post, idx) => (
            <Link
              href={`/blog/${post.slug}`}
              key={post.slug}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ aspectRatio: "16 / 10", background: "#F3F4F6", overflow: "hidden" }}>
                <img
                  src={EDITORIAL_COVERS[idx % EDITORIAL_COVERS.length]}
                  alt={post.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: "22px", display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ color: "#6B7280", fontSize: "12.5px", marginBottom: "8px" }}>
                  {post.date} · {post.readTime}
                </span>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "10px", lineHeight: 1.35 }}>
                  {post.title}
                </h2>
                <p style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.6, marginBottom: "18px", flex: 1 }}>
                  {post.excerpt}
                </p>
                <span style={{ color: "#111827", fontSize: "13.5px", fontWeight: 600 }}>
                  Read article →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
