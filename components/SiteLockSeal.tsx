"use client";

import React from "react";

interface SiteLockSealProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
}

export default function SiteLockSeal({
  size = "md",
  className = "",
  style = {},
  showText = false,
}: SiteLockSealProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.open(
        "https://www.sitelock.com/verify.php?site=shop-ply.site",
        "SiteLock",
        "width=600,height=600,left=160,top=170"
      );
    }
  };

  const heights = {
    sm: 30,
    md: 40,
    lg: 50,
  };

  return (
    <div
      className={`sitelock-seal-wrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        ...style,
      }}
    >
      <a
        href="https://www.sitelock.com/verify.php?site=shop-ply.site"
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title="SiteLock Verified: shop-ply.site is Malware-Free and Secure"
        style={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
          cursor: "pointer",
          transition: "transform 0.2s, opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <img
          src="https://shield.sitelock.com/shield/shop-ply.site"
          alt="SiteLock Malware-Free Verification"
          title="Click to verify Shopply's active SiteLock security status"
          style={{
            height: heights[size],
            width: "auto",
            display: "block",
            borderRadius: 6,
          }}
          loading="lazy"
        />
      </a>
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
            256-Bit SSL & Malware Protected
          </span>
          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>
            ✓ Verified by SiteLock Security
          </span>
        </div>
      )}
    </div>
  );
}
