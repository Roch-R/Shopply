"use client";

import { useState, FormEvent } from "react";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setIsSuccess(true);
      setFormData({ name: "", email: "", message: "" });
    } catch {
      setError("Something went wrong while sending your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#111827", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style suppressHydrationWarning>{`
        .ct-grid {
          max-width: 1040px;
          margin: 0 auto;
          padding: 56px 24px 80px;
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 48px;
          align-items: start;
        }
        .ct-form-box {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 32px;
        }
        .ct-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid #D1D5DB;
          background: #FFFFFF;
          color: #111827;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }
        .ct-input:focus {
          border-color: #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }
        @media (max-width: 820px) {
          .ct-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .ct-form-box {
            padding: 24px;
          }
        }
      `}</style>

      <PublicHeader activePath="/contact" />

      <section style={{ background: "#F7F7F5", borderBottom: "1px solid #E5E7EB", padding: "56px 24px" }}>
        <div style={{ maxWidth: "1040px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D6847", marginBottom: "10px" }}>
            Support &amp; Inquiries
          </span>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "12px" }}>
            Contact Shopply Support
          </h1>
          <p style={{ fontSize: "15.5px", color: "#4B5563", maxWidth: "560px", lineHeight: 1.6 }}>
            Have a question about an order, seller verification, or store setup? Send us a message and our support team will respond promptly.
          </p>
        </div>
      </section>

      <main className="ct-grid">
        <div className="ct-form-box">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}>
            Send us a message
          </h2>

          {isSuccess ? (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "28px", textAlign: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#065F46", marginBottom: "6px" }}>Message received</h3>
              <p style={{ color: "#047857", fontSize: "14px", marginBottom: "20px", lineHeight: 1.5 }}>
                Thank you for contacting Shopply. Our team will reply to your email shortly.
              </p>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                style={{
                  padding: "9px 18px",
                  background: "#FFFFFF",
                  color: "#065F46",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  border: "1px solid #A7F3D0",
                  cursor: "pointer",
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form style={{ display: "flex", flexDirection: "column", gap: "16px" }} onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: "10px 12px", borderRadius: "8px", fontSize: "13px" }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Full name
                </label>
                <input
                  className="ct-input"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Email address
                </label>
                <input
                  className="ct-input"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                  Message
                </label>
                <textarea
                  className="ct-input"
                  placeholder="Include your order number or question details..."
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: "44px",
                  background: "#111827",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.65 : 1,
                }}
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "#F7F7F5", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "14px" }}>Direct channels</h3>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "2px" }}>Customer &amp; Order Support</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>support@shop-ply.site</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "2px" }}>Merchant Partnerships</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>partners@shop-ply.site</div>
            </div>
          </div>

          <div style={{ background: "#F7F7F5", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "24px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>Support hours</h4>
            <p style={{ color: "#4B5563", fontSize: "13.5px", lineHeight: 1.6 }}>
              Monday – Saturday
              <br />
              9:00 AM – 6:00 PM PHT (GMT+8)
            </p>
          </div>
        </aside>
      </main>

      <PublicFooter />
    </div>
  );
}
