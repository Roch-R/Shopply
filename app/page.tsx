"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import StorefrontHome from "@/components/StorefrontHome";
import LogoDrawPreloader from "./about/LogoDrawPreloader";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  function handleStartLogin() {
    setIsPreloading(true);
  }

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
        <div style={{ height: 36, background: "#111827" }} />
        <div style={{ height: 68, borderBottom: "1px solid #E5E7EB", padding: "16px 24px" }}>
          <Skeleton style={{ width: 140, height: 28 }} />
        </div>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "56px 24px" }}>
          <Skeleton style={{ width: "60%", height: 56, borderRadius: 10 }} />
          <Skeleton style={{ width: "45%", height: 24, marginTop: 18, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StorefrontHome user={null} onLoginClick={handleStartLogin} />
      <LogoDrawPreloader
        active={isPreloading}
        onComplete={() => {
          window.location.href = "/login";
        }}
      />
    </div>
  );
}
