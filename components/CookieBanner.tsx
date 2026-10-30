"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const value = "; " + document.cookie;
    const parts = value.split("; cookie_consent=");
    const consent = parts.length === 2 ? parts.pop()?.split(";").shift() : null;

    if (!consent) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const setRealCookie = (value: string) => {
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = "cookie_consent=" + value + ";expires=" + date.toUTCString() + ";path=/";
  };

  const acceptCookies = () => {
    setRealCookie("accepted");
    setShow(false);
  };

  const declineCookies = () => {
    setRealCookie("declined");
    setShow(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        maxWidth: "400px",
        background: "#FFFFFF",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 12px 32px rgba(17, 24, 39, 0.12)",
        border: "1px solid #E5E7EB",
        zIndex: 99999,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#111827",
          marginBottom: "6px",
          letterSpacing: "-0.01em",
        }}
      >
        Cookie preferences
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "#4B5563",
          lineHeight: 1.55,
          marginBottom: "16px",
        }}
      >
        We use essential cookies to keep your session secure and remember your cart preferences. Read our{" "}
        <Link
          href="/cookies"
          style={{ color: "#111827", textDecoration: "underline", fontWeight: 500 }}
        >
          Cookie Policy
        </Link>
        .
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={acceptCookies}
          style={{
            flex: 1,
            padding: "9px 14px",
            background: "#111827",
            color: "#FFFFFF",
            border: "1px solid #111827",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accept all
        </button>
        <button
          onClick={declineCookies}
          style={{
            flex: 1,
            padding: "9px 14px",
            background: "#FFFFFF",
            color: "#374151",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
