"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const NAV_ITEMS = [
  { label: "Home", active: true, href: "#" },
  { label: "Studio", active: false, href: "#story" },
  { label: "About", active: false, href: "#journey" },
  { label: "Features", active: false, href: "#features" },
  { label: "Shop", active: false, href: "/shop" },
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
    <div className="relative min-h-screen h-screen min-h-[860px] w-full overflow-hidden bg-[#FFFFFF] font-inter text-[#000000]">
      {/* Background video layer (z-0) */}
      <div
        className="absolute z-0"
        style={{ inset: "auto 0 0 0", top: "300px" }}
      >
        <video
          ref={videoRef}
          src={VIDEO_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover object-center"
        />
        {/* Gradient overlay on video */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"
          style={{
            background:
              "linear-gradient(to bottom, #FFFFFF 0%, rgba(255, 255, 255, 0.35) 14%, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0) 88%, rgba(255, 255, 255, 0.75) 100%)",
          }}
        />
      </div>

      {/* Navigation bar (z-10) */}
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
          <Link
            href="/"
            className="font-instrument text-3xl tracking-tight text-[#000000]"
          >
            Shopply<sup className="text-[0.55em] align-super">®</sup>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm transition-colors hover:text-[#000000] ${
                  item.active ? "text-[#000000]" : "text-[#6F6F6F]"
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
                  className="text-sm font-medium text-[#000000] transition-opacity hover:opacity-70"
                >
                  Hi, {user.name.split(" ")[0]}
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03]"
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
                  className="px-4 py-2 text-sm font-medium text-[#000000] transition-opacity hover:opacity-70"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero section (z-10) */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center"
        style={{ paddingTop: "calc(8rem - 75px)" }}
        aria-label="Shopply flagship hero"
      >
        <h1
          className="animate-fade-rise font-instrument max-w-7xl text-5xl font-normal text-[#000000] sm:text-7xl md:text-8xl"
          style={{ lineHeight: 0.95, letterSpacing: "-2.46px" }}
        >
          Beyond <em className="italic text-[#6F6F6F]">silence,</em> we build{" "}
          <em className="italic text-[#6F6F6F]">Shopply.</em>
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-[#6F6F6F] sm:text-lg">
          Building platforms for brilliant minds, fearless makers, and
          thoughtful souls. Through the noise, we craft digital havens for deep
          work and pure flows.
        </p>

        <div className="animate-fade-rise-delay-2 mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            onClick={(e) => {
              if (onLoginClick) {
                e.preventDefault();
                onLoginClick();
              }
            }}
            className="rounded-full bg-[#000000] px-12 py-5 text-base text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03]"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-[#000000]/20 bg-[#FFFFFF]/85 px-12 py-5 text-base text-[#000000] backdrop-blur-sm transition-transform duration-200 hover:bg-[#FFFFFF] hover:scale-[1.03]"
          >
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  );
}
