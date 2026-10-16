"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";
import AboutExperience from "./AboutExperience";
import AboutSections, { AboutFooter } from "./AboutSections";
import LogoDrawPreloader from "./LogoDrawPreloader";
import styles from "./page.module.css";

export default function AboutPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") ?? "null");
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    const token = localStorage.getItem("token");
    if (token) fetch("/api/logout", { method: "POST", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }).catch(err => console.error("Logout failed:", err));
    localStorage.removeItem("token"); localStorage.removeItem("user"); getApiCache().invalidateAll(); setUser(null); router.push("/login");
  }

  function handleStartLogin() {
    setIsPreloading(true);
  }

  if (!ready) return <div className={styles.loading}><Skeleton style={{ width: "100%", height: 68 }} /><div><Skeleton style={{ width: "70%", height: 90, borderRadius: 18 }} /><Skeleton style={{ width: "50%", height: 28, marginTop: 25, borderRadius: 10 }} /></div></div>;
  return <div className={styles.page} id="about-top" data-scrolled={scrolled ? "true" : "false"}>
    <a href="#story" className={styles.skip}>Skip to the Shopply story</a>
    <nav className={`${styles.nav} ${scrolled ? styles.navHidden : ""}`} aria-label="Main navigation">
      <Link href="/" className={styles.logo} aria-label="Shopply home">
        <svg width="27" height="32" viewBox="0 0 48 56" fill="none" aria-hidden="true">
          <rect x="5" y="17" width="38" height="34" rx="9" stroke="currentColor" strokeWidth="3" />
          <path d="M15 18v-5a9 9 0 0 1 18 0v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 34c4-6 7-6 11 0s7 6 11 0" stroke="#ffbd57" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span>shopply</span>
      </Link>
      <div className={styles.navLinks}>
        <a href="#story" aria-current="page">About</a>
        <a href="#journey">Experience</a>
        <a href="#features">Features</a>
        {user && <Link href="/dashboard">Dashboard</Link>}
      </div>
      <div className={styles.account}>
        {user?.name ? (
          <>
            <span>Hi, {user.name.split(" ")[0]}</span>
            <button onClick={handleLogout}>Log out <span aria-hidden="true">↗</span></button>
          </>
        ) : (
          <a
            href="/login"
            onClick={e => {
              e.preventDefault();
              handleStartLogin();
            }}
            className={styles.loginBtn}
          >
            Log in <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </nav>
    <main className={styles.main} data-curtain-main>
      <AboutExperience onLoginClick={handleStartLogin} />
      <AboutSections />
    </main>
    <AboutFooter onLoginClick={handleStartLogin} />
    <LogoDrawPreloader
      active={isPreloading}
      onComplete={() => {
        window.location.href = "/login";
      }}
    />
  </div>;
}
