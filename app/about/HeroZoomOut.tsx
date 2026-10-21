"use client";

import { useEffect, useRef } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

const NAV_ITEMS = [
  { label: "Home", active: true, href: "/" },
  { label: "Studio", active: false, href: "#story" },
  { label: "About", active: false, href: "#journey" },
  { label: "Journal", active: false, href: "#network" },
  { label: "Reach Us", active: false, href: "/login" },
];

export default function HeroZoomOut() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId = 0;
    let restartTimeout: ReturnType<typeof setTimeout> | null = null;

    const updateOpacity = () => {
      if (video && video.duration && !Number.isNaN(video.duration) && video.duration > 1) {
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
          <a
            href="/"
            className="font-instrument text-3xl tracking-tight text-[#000000]"
          >
            Aethera<sup className="text-[0.55em] align-super">®</sup>
          </a>

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

          <a
            href="#story"
            className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03]"
          >
            Begin Journey
          </a>
        </nav>
      </header>

      {/* Hero section (z-10) */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center"
        style={{ paddingTop: "calc(8rem - 75px)" }}
      >
        <h1
          className="animate-fade-rise font-instrument max-w-7xl text-5xl font-normal text-[#000000] sm:text-7xl md:text-8xl"
          style={{ lineHeight: 0.95, letterSpacing: "-2.46px" }}
        >
          Beyond <em className="italic text-[#6F6F6F]">silence,</em> we build{" "}
          <em className="italic text-[#6F6F6F]">the eternal.</em>
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-[#6F6F6F] sm:text-lg">
          Building platforms for brilliant minds, fearless makers, and
          thoughtful souls. Through the noise, we craft digital havens for deep
          work and pure flows.
        </p>

        <a
          href="#story"
          className="animate-fade-rise-delay-2 mt-12 rounded-full bg-[#000000] px-14 py-5 text-base text-[#FFFFFF] transition-transform duration-200 hover:scale-[1.03]"
        >
          Begin Journey
        </a>
      </section>
    </div>
  );
}
