"use client";

import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .legal-doc { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; color: #374151; line-height: 1.75; font-size: 15px; }
        .legal-doc h2 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 19px; font-weight: 700; color: #111827; margin: 36px 0 12px; letter-spacing: -0.015em; }
        .legal-doc p { margin-bottom: 16px; }
        .legal-doc ul { margin-bottom: 16px; padding-left: 22px; }
        .legal-doc li { margin-bottom: 8px; }
      `}</style>

      <PublicHeader activePath="/privacy" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Data Protection
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#111827", marginBottom: "8px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>Last updated: May 23, 2026</p>
        </div>
      </section>

      <main className="legal-doc">
        <p>
          At Shopply, we respect your privacy and handle personal and store data transparently. This Privacy Policy explains what information we collect, why we collect it, and how we keep it secure when you shop or sell on our platform.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Account Information:</strong> Username, email address, phone number, and delivery address provided during registration or checkout.</li>
          <li><strong>Store &amp; Order Data:</strong> Product listings, order history, buyer-seller chat messages, and fulfillment records.</li>
          <li><strong>Technical &amp; Security Data:</strong> Browser user agent, IP address, and authentication session tokens required to prevent unauthorized access.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><strong>Order Fulfillment:</strong> Sharing necessary delivery details between buyers and sellers to complete orders.</li>
          <li><strong>Account Security:</strong> Delivering email OTP codes, preventing fraud, and protecting user sessions.</li>
          <li><strong>Customer Support:</strong> Resolving order disputes, inquiries, and technical issues.</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We never sell your personal data to third parties. Information is shared strictly as needed with sellers fulfilling your order, payment providers, or when required by applicable Philippine law.
        </p>

        <h2>4. Data Security &amp; Retention</h2>
        <p>
          We use HTTPS/TLS encryption, hashed passwords, and strict access controls to safeguard stored records. We retain account and order information only as long as necessary to provide our services and comply with legal obligations.
        </p>

        <h2>5. Your Choices &amp; Contact</h2>
        <p>
          You can update your profile details directly inside your account settings or contact our privacy team at <strong>privacy@shop-ply.site</strong> for data access or deletion requests.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
