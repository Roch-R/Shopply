"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AboutExperience from "../about/AboutExperience";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";

export default function ExperiencePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user") || localStorage.getItem("shopply_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleLoginClick = () => {
    router.push("/login");
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("shopply_user");
    } catch {}
    setUser(null);
    router.push("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F19", color: "#FFFFFF" }}>
      <PublicHeader onLoginClick={handleLoginClick} activePath="/experience" />
      <main>
        <AboutExperience
          onLoginClick={handleLoginClick}
          user={user}
          onLogout={handleLogout}
        />
      </main>
      <PublicFooter onLoginClick={handleLoginClick} />
    </div>
  );
}
