"use client";

import { useEffect, useState } from "react";
import styles from "./LogoDrawPreloader.module.css";

export default function LogoDrawPreloader() {
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 240);

    const doneTimer = setTimeout(() => {
      setDone(true);
    }, 440);

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
      <span className={styles.srOnly}>Loading Shopply</span>
      <div className={styles.brandLockup}>
        <svg
          viewBox="0 0 28 28"
          width="32"
          height="32"
          aria-hidden="true"
          className={styles.mark}
        >
          <rect x="4" y="9" width="20" height="15" rx="3.5" fill="#111827" />
          <path
            d="M9.5 9V7.5a4.5 4.5 0 0 1 9 0V9"
            fill="none"
            stroke="#111827"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10.5 15.5a3.5 3.5 0 0 0 7 0"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.wordmark}>Shopply</span>
      </div>
    </div>
  );
}
