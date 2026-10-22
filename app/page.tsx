"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";
import { revokeMarketplaceAccess } from "@/lib/marketplaceAccess";
import AboutExperience from "./about/AboutExperience";
import AboutSections, { AboutFooter } from "./about/AboutSections";
import LogoDrawPreloader from "./about/LogoDrawPreloader";
import styles from "./about/page.module.css";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Returning home closes this tab's marketplace until the dashboard is opened.
    revokeMarketplaceAccess();
    localStorage.removeItem("shopply_on_landing");
    sessionStorage.removeItem("shopply_on_landing");
    localStorage.removeItem("shopply_landing_lock");

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") ?? "null");
        setUser(storedUser);
      } catch {
        /* An expired profile can be refreshed from the dashboard. */
      }
    }
    setReady(true);

    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", revokeMarketplaceAccess);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pageshow", revokeMarketplaceAccess);
    };
  }, []);

  function handleLogout() {
    const token = localStorage.getItem("token");
    if (token)
      fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      }).catch(err => console.error("Logout failed:", err));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    getApiCache().invalidateAll();
    setUser(null);
    router.push("/login");
  }

  function handleStartLogin() {
    setIsPreloading(true);
  }

  if (!ready)
    return (
      <div className={styles.loading}>
        <Skeleton style={{ width: "100%", height: 68 }} />
        <div>
          <Skeleton style={{ width: "70%", height: 90, borderRadius: 18 }} />
          <Skeleton style={{ width: "50%", height: 28, marginTop: 25, borderRadius: 10 }} />
        </div>
      </div>
    );

  return (
    <div className={styles.page} id="about-top" data-scrolled={scrolled ? "true" : "false"}>
      <a href="#story" className={styles.skip}>
        Skip to the Shopply story
      </a>
      <main className={styles.main} data-curtain-main>
        <AboutExperience
          onLoginClick={handleStartLogin}
          user={user}
          onLogout={handleLogout}
        />
        <AboutSections />
      </main>
      <AboutFooter onLoginClick={handleStartLogin} />
      <LogoDrawPreloader
        active={isPreloading}
        onComplete={() => {
          window.location.href = "/login";
        }}
      />
    </div>
  );
}