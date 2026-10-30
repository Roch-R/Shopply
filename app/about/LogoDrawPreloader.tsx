"use client";

import { useEffect } from "react";
import styles from "./LogoDrawPreloader.module.css";

interface LogoDrawPreloaderProps {
  active: boolean;
  onComplete?: () => void;
  durationMs?: number;
}

export default function LogoDrawPreloader({
  active,
  onComplete,
  durationMs = 320,
}: LogoDrawPreloaderProps) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      onComplete?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [active, onComplete, durationMs]);

  if (!active) return null;

  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={styles.srOnly}>Opening Shopply</span>
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
