"use client";

import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .legal-doc { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; color: #374151; line-height: 1.75; font-size: 15px; }
        .legal-doc h2 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-size: 19px; font-weight: 700; color: #111827; margin: 36px 0 12px; letter-spacing: -0.015em; }
        .legal-doc p { margin-bottom: 16px; }
        .legal-doc ul { margin-bottom: 16px; padding-left: 22px; }
        .legal-doc li { margin-bottom: 8px; }
      `}</style>

      <PublicHeader activePath="/terms" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "52px 24px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "8px" }}>
            Legal Agreement
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(28px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#111827", marginBottom: "8px" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>Last updated: May 23, 2026</p>
        </div>
      </section>

      <main className="legal-doc">
        <p>
          Welcome to Shopply. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Shopply website, marketplace platform, and related services (collectively, the &quot;Services&quot;). By registering for an account or using our Services, you agree to be bound by these Terms.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using our Services, you confirm that you can form a binding contract with Shopply, that you accept these Terms, and that you agree to comply with them. If you are using the Services on behalf of a business or store, you represent that you have authority to bind that entity to these Terms.
        </p>

        <h2>2. Account Registration and Responsibilities</h2>
        <p>To buy or sell on Shopply, you must register for a verified account. You agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information during registration.</li>
          <li>Maintain the confidentiality of your login credentials and accept responsibility for activities under your account.</li>
          <li>Promptly notify us of any unauthorized access or security breach.</li>
        </ul>

        <h2>3. Acceptable Marketplace Conduct</h2>
        <p>You agree to use the Services only for lawful commerce. You shall not:</p>
        <ul>
          <li>List or sell illegal, counterfeit, stolen, or prohibited items.</li>
          <li>Misrepresent product descriptions, variant inventory, pricing, or shipping origin.</li>
          <li>Transmit malware or attempt to bypass authentication or platform security controls.</li>
        </ul>

        <h2>4. Intellectual Property Rights</h2>
        <p>
          The Services and platform interface are owned by Shopply and protected by intellectual property laws. You retain ownership of product photos and descriptions you upload to your storefront, granting Shopply a non-exclusive license to display them for operating the marketplace.
        </p>

        <h2>5. Orders, Pricing, and Fulfillment</h2>
        <p>
          Product prices on Shopply are displayed in Philippine Pesos (₱) unless stated otherwise. Sellers are responsible for accurate stock quantities and timely order dispatch. Buyers agree to complete payment for confirmed Cash on Delivery or digital orders.
        </p>

        <h2>6. Termination and Suspension</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent transactions, or harm buyers or sellers on the platform.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHOPPLY SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICES.
        </p>

        <h2>8. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the Republic of the Philippines.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
