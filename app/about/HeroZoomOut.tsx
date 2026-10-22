"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const NAV_ITEMS = [
  { label: "Home", active: true, href: "#about-top" },
  { label: "3D Studio", active: false, href: "#story" },
  { label: "Product Coaster", active: false, href: "#journey" },
  { label: "Global Orbit", active: false, href: "#globe-journey" },
  { label: "Features", active: false, href: "#features" },
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
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Fast GPU playback kickoff
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setVideoLoaded(true))
        .catch(() => {
          // Auto-play policy fallback
          video.muted = true;
          video.play().catch(() => {});
          setVideoLoaded(true);
        });
    }
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#eef5ff] font-inter text-[#0f172a]"
      style={{ contain: "paint" }}
    >
      {/* Full-bleed hardware-accelerated looping cinematic video background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          className={`h-full w-full object-cover object-center transition-opacity duration-700 ease-out ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: "translateZ(0)",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        />

        {/* Luminous atmospheric sky-glass gradient veil for high-contrast readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(240,247,255,0.58) 28%, rgba(238,245,255,0.18) 60%, rgba(238,245,255,0.95) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(65% 55% at 50% 36%, rgba(255,255,255,0.82) 0%, rgba(56,189,248,0.1) 60%, transparent 100%)",
          }}
        />
      </div>

      {/* Floating Liquid-Crystal Glass Navigation Bar (z-20) */}
      <header className="relative z-20 pt-5 px-4 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/90 bg-white/80 px-6 py-3.5 shadow-[0_16px_44px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-2xl">
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
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gradient-to-r from-[#0a6cff] to-[#0284c7] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(10,108,255,0.35)] transition-transform duration-200 hover:scale-[1.03]"
                >
                  Dashboard
                </Link>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-red-600"
                  >
                    Log Out
                  </button>
                )}
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

      {/* 3D Interactive Spatial Hero Stage (z-10) — Clean, uncluttered, focused */}
      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-5xl flex-col items-center justify-center px-6 pt-6 pb-20 text-center"
        aria-label="Shopply 3D spatial hero"
      >
        {/* Centerpiece Headline */}
        <h1
          className="font-instrument max-w-4xl text-5xl font-normal text-[#0f172a] sm:text-7xl md:text-[5.5rem] tracking-tight leading-[1.04]"
        >
          Experience commerce in{" "}
          <em className="italic bg-gradient-to-r from-[#0a6cff] via-[#0284c7] to-[#38bdf8] bg-clip-text text-transparent">
            living 3D.
          </em>{" "}
          Welcome to{" "}
          <em className="italic text-[#0a6cff]">Shopply.</em>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl rounded-2xl bg-white/70 px-8 py-3.5 text-base font-medium leading-relaxed text-[#334155] shadow-[0_8px_30px_rgba(255,255,255,0.7)] backdrop-blur-md sm:text-lg">
          Step inside the interactive 3D storefront universe — explore sculpted flagship drops, instant passkey checkout, and live nationwide delivery telemetry.
        </p>

        {/* Interactive Scroll Prompt Pill to Enter Scene 01 */}
        <a
          href="#story"
          className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-white/90 bg-white/80 px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#0284c7] shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white"
        >
          <span>SCROLL TO DIVE INTO THE 3D STUDIO</span>
          <span className="animate-bounce">↓</span>
        </a>
      </section>
    </div>
  );
}
