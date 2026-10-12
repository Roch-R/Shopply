"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { getApiCache } from "@/lib/apiCache";
import AboutExperience from "./AboutExperience";
import AboutSections, { AboutFooter } from "./AboutSections";

function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("token");
  let user: { name: string; email: string } | null = null;
  try { user = JSON.parse(localStorage.getItem("user") ?? "null"); } catch { }
  return { token, user };
}

export default function AboutPage() {
  const router = useRouter();
  const pushed = useRef(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(function checkAuth() {
    const { token, user: u } = getAuth();
    if (!token && !pushed.current) {
      pushed.current = true;
      router.replace("/login");
    } else {
      setUser(u);
      setReady(true);
    }
  }, []); // intentional empty deps — runs once on mount

  /* ——— 3D SCROLL ENGINE ———
     Drives all scroll animations through CSS custom properties so the
     browser can composite transforms on the GPU (no per-frame React renders). */
  const pageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ready) return;
    const root = pageRef.current;
    if (!root) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("js-3d");
    const reveals = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));

    // 1) Reveal elements as they enter the viewport
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => {
      if (motion.matches) el.classList.add("in");
      else io.observe(el);
    });

    // 2) Scroll-linked variables
    const scrollEls = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll3d]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const max = document.documentElement.scrollHeight - vh;
      // Batch layout reads before writes so each card shares a single layout pass.
      const positions = scrollEls.map(el => {
        if (motion.matches) return 0;
        const r = el.getBoundingClientRect();
        return Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
      });
      root.style.setProperty("--sy", String(sy));
      root.style.setProperty("--sp", (max > 0 ? Math.min(sy / max, 1) : 0).toFixed(4));
      scrollEls.forEach((el, index) => el.style.setProperty("--p", positions[index].toFixed(4)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // 3) Pointer tilt on cards (desktop only)
    const cleanups: Array<() => void> = [];
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.querySelectorAll<HTMLElement>(".tilt").forEach(el => {
        const move = (ev: MouseEvent) => {
          if (motion.matches) return;
          const r = el.getBoundingClientRect();
          const x = (ev.clientX - r.left) / r.width - 0.5;
          const y = (ev.clientY - r.top) / r.height - 0.5;
          el.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
          el.style.setProperty("--rx", `${(-y * 16).toFixed(2)}deg`);
        };
        const leave = () => {
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        };
        el.addEventListener("mousemove", move);
        el.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          el.removeEventListener("mousemove", move);
          el.removeEventListener("mouseleave", leave);
        });
      });
    }

    const onMotionChange = () => {
      if (motion.matches) reveals.forEach(el => el.classList.add("in"));
      root.querySelectorAll<HTMLElement>(".tilt").forEach(el => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
      onScroll();
    };
    motion.addEventListener("change", onMotionChange);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      motion.removeEventListener("change", onMotionChange);
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach(fn => fn());
    };
  }, [ready]);

  function handleLogout() {
    const token = localStorage.getItem("token");
    if (token) {
      const API = "/api";
      fetch(`${API}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }).catch(err => console.error("Logout failed:", err));
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    getApiCache().invalidateAll();
    router.push("/login");
  }

  if (!ready) return (
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

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff}
        .page{min-height:100vh;background:linear-gradient(160deg,#f0f4ff 0%,#faf5ff 45%,#f0f9ff 100%);
          font-family:'Inter',sans-serif;position:relative;overflow-x:clip}
        .blob{position:fixed;border-radius:50%;pointer-events:none;z-index:0}
        .b1{width:600px;height:600px;background:radial-gradient(circle,rgba(124,58,237,.08) 0%,transparent 70%);top:-200px;right:-150px}
        .b2{width:500px;height:500px;background:radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 70%);bottom:-150px;left:-120px}
        .b3{width:300px;height:300px;background:radial-gradient(circle,rgba(16,185,129,.05) 0%,transparent 70%);top:40%;left:40%}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(255,255,255,.75);backdrop-filter:blur(20px);
          border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.04)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-user{font-size:13px;color:#64748b}
        .nav-user strong{color:#0f172a;font-weight:600}
        .nav-btn{padding:8px 20px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          box-shadow:0 2px 10px rgba(124,58,237,.25)}
        .nav-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(124,58,237,.35)}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        /* ═══════════ 3D SCROLL ANIMATIONS ═══════════ */
        /* Scroll progress bar */
        .scroll-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:200;pointer-events:none;
          background:linear-gradient(90deg,#7c3aed,#4f46e5,#2563eb,#06b6d4);
          transform-origin:0 50%;transform:scaleX(var(--sp,0));box-shadow:0 0 12px rgba(124,58,237,.5)}

        /* Parallax background blobs */
        .b1{transform:translate3d(0,calc(var(--sy,0) * -0.18px),0)}
        .b2{transform:translate3d(0,calc(var(--sy,0) * 0.12px),0)}
        .b3{transform:translate3d(calc(var(--sy,0) * 0.05px),calc(var(--sy,0) * -0.08px),0)}

        /* Reveal-on-scroll (only hidden once JS is confirmed running) */
        .reveal{transition:opacity .9s ease, transform 1.1s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0ms);will-change:transform,opacity}
        .js-3d .reveal{opacity:0;transform:perspective(1200px) rotateX(32deg) translate3d(0,80px,-120px)}
        .js-3d .reveal.flip{transform:perspective(1200px) rotateY(-75deg) translate3d(-40px,30px,-80px);transform-origin:0 50%}
        .js-3d .reveal.zoom{transform:perspective(1200px) translate3d(0,40px,-260px) scale(.85)}
        .js-3d .reveal.in{opacity:1;transform:none}
        @media (prefers-reduced-motion: reduce){
          .reveal,.js-3d .reveal{opacity:1 !important;transform:none !important;transition:none !important}
          .b1,.b2,.b3{transform:none !important;opacity:1 !important}
          .scroll-progress{display:none}
        }

        @media(max-width:768px){
          .nav{padding:0 12px; gap:8px}
          .nav-logo-text{display:none}
          .nav-user{display:none}
          .nav-right{gap:8px}
          .nav-link{padding:6px 8px; font-size:12px}
          .nav-btn{padding:8px 12px; font-size:12px}
        }
      `}</style>

      <div className="page" id="about-top" ref={pageRef}>
        <div className="scroll-progress" aria-hidden="true" />
        <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />

        {/* NAV */}
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
              </linearGradient></defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            {user && <span className="nav-user">Hi, <strong>{user.name.split(" ")[0]}</strong> 👋</span>}
            <Link href="/shop" className="nav-link" style={{color:'#7c3aed',background:'rgba(124,58,237,.1)',fontWeight:600}}>🛍️ Shop</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
            <button className="nav-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <main>
          <AboutExperience />
          <AboutSections />
        </main>
        <AboutFooter />
      </div>
    </>
  );
}
