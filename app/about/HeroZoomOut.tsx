"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const NAV_ITEMS = [
  { label: "3D Studio", active: true, href: "#story" },
  { label: "Product Coaster", active: false, href: "#journey" },
  { label: "Global Orbit", active: false, href: "#globe-journey" },
  { label: "Features", active: false, href: "#features" },
  { label: "Marketplace", active: false, href: "/shop" },
];

export default function HeroZoomOut({
  onLoginClick,
  user,
  onLogout,
}: {
  onLoginClick?: () => void;
  user?: { name: string; email: string } | null;
  onLogout?: () => void;
} = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId = 0;
    let restartTimeout: ReturnType<typeof setTimeout> | null = null;

    const updateOpacity = () => {
      if (
        video &&
        video.duration &&
        !Number.isNaN(video.duration) &&
        video.duration > 1
      ) {
        const current = video.currentTime;
        const duration = video.duration;
        const fadeDuration = 0.5;

        let opacity = 1;
        if (current < fadeDuration) {
          opacity = Math.max(0, Math.min(1, current / fadeDuration));
        } else if (duration - current < fadeDuration) {
          opacity = Math.max(0, Math.min(1, (duration - current) / fadeDuration));
        }
        video.style.opacity = String(opacity);
      }
      rafId = requestAnimationFrame(updateOpacity);
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      restartTimeout = setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    video.addEventListener("ended", handleEnded);
    video.play().catch(() => {});
    rafId = requestAnimationFrame(updateOpacity);

    return () => {
      cancelAnimationFrame(rafId);
      if (restartTimeout) clearTimeout(restartTimeout);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div
      onPointerMove={(e) => {
        const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        setTilt({ x: nx, y: ny });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative min-h-screen w-full overflow-hidden bg-[#eef5ff] font-inter text-[#0f172a]"
      style={{ perspective: "1400px" }}
    >
      {/* Full-bleed looping cinematic video background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover object-center scale-[1.03] transition-transform duration-300 ease-out"
          style={{
            transform: `scale(1.05) translate3d(${(-tilt.x * 12).toFixed(1)}px, ${(-tilt.y * 8).toFixed(1)}px, 0)`,
          }}
        />
        {/* Luminous atmospheric sky-glass gradient veil for high-contrast readability & seamless bottom blend */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(240,247,255,0.62) 26%, rgba(238,245,255,0.18) 62%, rgba(238,245,255,0.96) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 34%, rgba(255,255,255,0.78) 0%, rgba(56,189,248,0.12) 55%, transparent 100%)",
          }}
        />
      </div>

      {/* Floating Liquid-Crystal Glass Navigation Bar (z-20) */}
      <header className="relative z-20 pt-5 px-4 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/90 bg-white/75 px-6 py-3.5 shadow-[0_16px_44px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-instrument text-3xl tracking-tight text-[#0f172a]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0a6cff] to-[#38bdf8] text-sm font-sans font-bold text-white shadow-[0_4px_14px_rgba(10,108,255,0.4)]">
              S
            </span>
            <span>
              Shopply<sup className="text-[0.52em] align-super text-[#0a6cff]">®</sup>
            </span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-[#0a6cff] ${
                  item.active ? "text-[#0a6cff] font-semibold" : "text-[#475569]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user?.name ? (
              <>
                <Link
                  href="/shop"
                  className="text-sm font-semibold text-[#0f172a] transition-colors hover:text-[#0a6cff]"
                >
                  Hi, {user.name.split(" ")[0]}
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full bg-[#0f172a] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.03]"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={(e) => {
                    if (onLoginClick) {
                      e.preventDefault();
                      onLoginClick();
                    }
                  }}
                  className="rounded-full border border-slate-300/80 bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#0f172a] shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#0a6cff] hover:text-[#0a6cff]"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-[#0a6cff] to-[#0284c7] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(10,108,255,0.35)] transition-transform duration-200 hover:scale-[1.03]"
                >
                  Sign Up Now
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* 3D Interactive Spatial Hero Stage (z-10) */}
      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl flex-col items-center justify-center px-6 pt-8 pb-24 text-center"
        aria-label="Shopply 3D spatial hero"
      >
        {/* Left Floating 3D Liquid-Glass Telemetry Card (Desktop) */}
        <div
          className="pointer-events-none hidden xl:block absolute left-6 top-[22%] w-64 rounded-3xl border border-white/90 bg-white/75 p-5 text-left shadow-[0_24px_54px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-transform duration-200 ease-out"
          style={{
            transform: ` perspective(1000px) rotateY(${(14 + tilt.x * 8).toFixed(1)}deg) rotateX(${(-tilt.y * 6).toFixed(1)}deg) translate3d(${(tilt.x * 14).toFixed(1)}px, ${(tilt.y * 10).toFixed(1)}px, 40px)`,
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-[#0a6cff]">
            <span>● EXPRESS PAYOUT</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700">0.2S</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#0f172a]">PHP 1,280.00</p>
          <p className="mt-1 text-xs text-slate-600">Biometric Passkey & Escrow Verified</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#0a6cff] to-[#38bdf8]" />
          </div>
        </div>

        {/* Right Floating 3D Liquid-Glass Product Drop Card (Desktop) */}
        <div
          className="pointer-events-none hidden xl:block absolute right-6 top-[24%] w-64 rounded-3xl border border-white/90 bg-white/75 p-5 text-left shadow-[0_24px_54px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-transform duration-200 ease-out"
          style={{
            transform: `perspective(1000px) rotateY(${(-14 + tilt.x * 8).toFixed(1)}deg) rotateX(${(-tilt.y * 6).toFixed(1)}deg) translate3d(${(tilt.x * 14).toFixed(1)}px, ${(tilt.y * 10).toFixed(1)}px, 50px)`,
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-[#0284c7]">
            <span>★ FLAGSHIP DROP</span>
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-700">LIVE 3D</span>
          </div>
          <p className="mt-2 text-lg font-bold tracking-tight text-[#0f172a]">AeroPulse Carbon</p>
          <p className="mt-0.5 text-xs text-slate-600">4.98★ Verified • Same-Day Dispatch</p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-sky-50/90 px-3 py-2 text-xs font-semibold text-[#0a6cff]">
            <span>Nationwide Air & EV</span>
            <span>99.4%</span>
          </div>
        </div>

        {/* Top Live 3D Pill Badge */}
        <div className="animate-fade-rise mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/95 bg-white/80 px-4 py-2 text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#0a6cff] shadow-[0_8px_24px_rgba(10,108,255,0.12)] backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-[#0a6cff] shadow-[0_0_10px_#0a6cff]" />
          <span>SHOPPLY 3D SPATIAL COMMERCE ENGINE</span>
        </div>

        {/* Centerpiece Headline */}
        <h1
          className="animate-fade-rise font-instrument max-w-5xl text-5xl font-normal text-[#0f172a] sm:text-7xl md:text-[5.5rem]"
          style={{
            lineHeight: 0.96,
            letterSpacing: "-2.2px",
            transform: `translate3d(${(tilt.x * 6).toFixed(1)}px, ${(tilt.y * 4).toFixed(1)}px, 0)`,
          }}
        >
          Experience commerce in{" "}
          <em className="italic bg-gradient-to-r from-[#0a6cff] via-[#0284c7] to-[#38bdf8] bg-clip-text text-transparent">
            living 3D.
          </em>{" "}
          Welcome to{" "}
          <em className="italic text-[#0a6cff]">Shopply.</em>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-rise-delay mt-6 max-w-2xl rounded-2xl bg-white/60 px-6 py-3 text-base font-medium leading-relaxed text-[#334155] shadow-[0_8px_30px_rgba(255,255,255,0.6)] backdrop-blur-md sm:text-lg">
          Step inside the interactive 3D storefront universe — explore sculpted flagship drops, instant passkey checkout, and live nationwide delivery telemetry.
        </p>

        {/* Primary Action Buttons Connected to Login, Sign Up & Marketplace */}
        <div className="animate-fade-rise-delay-2 mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0a6cff] via-[#0284c7] to-[#38bdf8] px-10 py-4.5 text-base font-semibold text-white shadow-[0_14px_34px_rgba(10,108,255,0.38),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_18px_40px_rgba(10,108,255,0.5)]"
          >
            <span>Sign Up Now</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>

          <Link
            href="/login"
            onClick={(e) => {
              if (onLoginClick) {
                e.preventDefault();
                onLoginClick();
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/95 bg-white/85 px-10 py-4.5 text-base font-semibold text-[#0f172a] shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0a6cff] hover:text-[#0a6cff]"
          >
            <span>Log In</span>
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200/90 bg-sky-50/80 px-7 py-4.5 text-sm font-semibold text-[#0284c7] backdrop-blur-xl transition-all duration-200 hover:bg-white hover:text-[#0a6cff]"
          >
            <span>Explore Marketplace</span>
            <span>↗</span>
          </Link>
        </div>

        {/* Interactive Scroll Prompt Pill to Enter Scene 01 */}
        <a
          href="#story"
          className="mt-12 inline-flex items-center gap-2.5 rounded-full border border-white/90 bg-white/75 px-5 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.16em] text-[#0284c7] shadow-sm backdrop-blur-xl transition-transform duration-200 hover:scale-105"
        >
          <span>SCROLL TO DIVE INTO THE 3D STUDIO</span>
          <span className="animate-bounce">↓</span>
        </a>
      </section>
    </div>
  );
}
