"use client";

import { useEffect, useState } from "react";
import styles from "./LogoDrawPreloader.module.css";

function playShopplyChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume (gentle, pleasing volume)
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Phase 1: Soft shimmer frequency swell during line drawing (0.05s - 0.9s)
    const drawOsc = ctx.createOscillator();
    const drawGain = ctx.createGain();
    const drawFilter = ctx.createBiquadFilter();

    drawOsc.type = "sine";
    drawOsc.frequency.setValueAtTime(320, now);
    drawOsc.frequency.exponentialRampToValueAtTime(640, now + 0.85);

    drawFilter.type = "lowpass";
    drawFilter.frequency.setValueAtTime(700, now);
    drawFilter.frequency.exponentialRampToValueAtTime(1600, now + 0.85);

    drawGain.gain.setValueAtTime(0.001, now);
    drawGain.gain.linearRampToValueAtTime(0.05, now + 0.35);
    drawGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    drawOsc.connect(drawFilter);
    drawFilter.connect(drawGain);
    drawGain.connect(master);

    drawOsc.start(now + 0.05);
    drawOsc.stop(now + 0.95);

    // Phase 2: Uplifting brand chime when the fill blooms & wave turns white (~1.1s)
    // E-Major warm chime triad: E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz)
    const freqs = [659.25, 830.61, 987.77, 1318.51];
    freqs.forEach((freq, idx) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      chimeOsc.type = idx === 3 ? "sine" : "triangle";
      const start = now + 1.08 + idx * 0.035;
      chimeOsc.frequency.setValueAtTime(freq, start);

      chimeGain.gain.setValueAtTime(0.0001, start);
      chimeGain.gain.linearRampToValueAtTime(0.12 / (idx + 1), start + 0.025);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(master);

      chimeOsc.start(start);
      chimeOsc.stop(start + 1.2);
    });
  } catch {
    // Graceful fallback if audio is not permitted by browser policy
  }
}

export default function LogoDrawPreloader() {
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Play dynamic chime
    playShopplyChime();

    // Trace and draw runs for 2.3s, then fades out smoothly over 350ms
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2300);

    const doneTimer = setTimeout(() => {
      setDone(true);
    }, 2650);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (done) return null;

  return (
    <div
      className={`${styles.overlay} ${fading ? styles.overlayFadeOut : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!fading}
    >
      <span className={styles.srOnly}>Loading</span>
      <div className={styles.d}>
        <div className={styles.lg}>
          <svg
            viewBox="0 0 64 64"
            width="92"
            height="92"
            aria-hidden="true"
            className={styles.svg}
          >
            <defs>
              <linearGradient id="mllg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4FA3FF" />
                <stop offset="100%" stopColor="#0A6CFF" />
              </linearGradient>
            </defs>
            {/* Filled copy of the shape (opacity 0 to 1) */}
            <path
              className={styles.fl}
              d="M21 22h22c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H21c-4.4 0-8-3.6-8-8V30c0-4.4 3.6-8 8-8z"
            />
            {/* Outline of the mark (bag and handle) */}
            <path
              className={styles.st}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              d="M21 22h22c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H21c-4.4 0-8-3.6-8-8V30c0-4.4 3.6-8 8-8z M23 22v-5c0-5 4-9 9-9s9 4 9 9v5"
            />
            {/* Inner symbol (Shopply wave smile) */}
            <path
              className={styles.ch}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              d="M22 38c3.5-5.5 6.5-5.5 10 0s6.5 5.5 10 0"
            />
          </svg>
          <span className={styles.wm}>shopply</span>
        </div>
      </div>
    </div>
  );
}
