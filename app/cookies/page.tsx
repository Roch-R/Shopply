"use client";

import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function CookiePolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .legal-doc { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; color: #374151; line-height: 1.75; font-size: 15px; }
        .legal-doc h2 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 19px; font-weight: 700; color: #111827; margin: 36px 0 12px; letter-spacing: -0.015em; }
        .legal-doc p { margin-bottom: 16px; }
        .legal-doc ul { margin-bottom: 16px; padding-left: 22px; }
        .legal-doc li { margin-bottom: 8px; }
      `}</style>

      <PublicHeader activePath="/cookies" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Browser Storage &amp; Cookies
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#111827", marginBottom: "8px" }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>Last updated: May 23, 2026</p>
        </div>
      </section>

      <main className="legal-doc">
        <p>
          Shopply uses cookies and local browser storage to keep your sign-in session secure, remember your shopping cart preferences, and measure basic site reliability.
        </p>

        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files stored by your web browser when you visit a website. They help websites remember session state and user preferences across page loads.
        </p>

        <h2>2. Categories of Cookies We Use</h2>
        <ul>
          <li><strong>Essential Cookies:</strong> Required for authentication, session security, cart persistence, and cookie consent preferences.</li>
          <li><strong>Performance &amp; Reliability:</strong> Aggregate diagnostics (such as page load speed) used to keep Shopply fast across mobile and desktop browsers.</li>
          <li><strong>Functional Preferences:</strong> Remembering UI preferences and recently viewed categories.</li>
        </ul>

        <h2>3. Managing Cookies</h2>
        <p>
          You can choose &quot;Essential only&quot; on our cookie banner or clear/block cookies at any time in your browser settings. Blocking essential storage may sign you out of active sessions.
        </p>

        <h2>4. Contact</h2>
        <p>
          For questions regarding cookies and browser storage on Shopply, email <strong>privacy@shop-ply.site</strong>.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
