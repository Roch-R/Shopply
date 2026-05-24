"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/Skeleton";

export default function Home() {
  const router = useRouter();

useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) { router.replace("/login"); return; }
  try {
    const user = JSON.parse(localStorage.getItem("user") ?? "null");
    if (!user) { router.replace("/login"); return; }
    if (user.email_verified_at) {
      router.replace("/dashboard");
    } else {
      router.replace("/verify");
    }
  } catch {
    router.replace("/login");
  }
}, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7ff", padding: "40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32 }}>
        <Skeleton style={{ width: 240, height: "calc(100vh - 80px)", borderRadius: 24 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <Skeleton style={{ width: "100%", height: 140, borderRadius: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
            <Skeleton style={{ height: 120, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );
}