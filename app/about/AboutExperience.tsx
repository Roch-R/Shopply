"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./experience.module.css";
import HeroZoomOut from "./HeroZoomOut";
import type { LensMode, SceneKind } from "./scroll-scenes";

const laptopChapters = [
  {
    tag: "01 / MEET SHOPPLY STUDIO",
    title: (
      <>
        Your whole shop.
        <br />
        <em>A world of possibility.</em>
      </>
    ),
    text: "Watch the 3D Studio Pro workspace open—bringing live payouts, store traffic, and flagship drops into one clean view.",
    short: "Meet Shopply",
  },
  {
    tag: "02 / LIVE TELEMETRY",
    title: (
      <>
        Step closer.
        <br />
        <em>Every metric alive.</em>
      </>
    ),
    text: "Instant settlement notifications and real-time visitor analytics float cleanly around the Retina display.",
    short: "Live metrics",
  },
  {
    tag: "03 / CROSS THE GLASS",
    title: (
      <>
        The screen is
        <br />
        <em>only the surface.</em>
      </>
    ),
    text: "Move straight through the display glass and enter the layered 3D workspace behind your storefront.",
    short: "Cross the glass",
  },
  {
    tag: "04 / PAYMENTS & DISPATCH",
    title: (
      <>
        Instant payouts.
        <br />
        <em>Same-day schedules.</em>
      </>
    ),
    text: "Glide past verified express settlements and automated same-day dispatch calendars arranged in clean 3D depth.",
    short: "Payments & dispatch",
  },
  {
    tag: "05 / CONVERSATION & ANALYTICS",
    title: (
      <>
        Direct buyer chat.
        <br />
        <em>Live store traffic.</em>
      </>
    ),
    text: "Answer customer questions in real time while monitoring live conversion velocity across every channel.",
    short: "Chat & traffic",
  },
  {
    tag: "06 / SMART CONTROLS & CREATORS",
    title: (
      <>
        Protected checkout.
        <br />
        <em>Verified flagships.</em>
      </>
    ),
    text: "Multi-warehouse inventory sync, smart fraud shields, and 4.98★ flagship merchant profiles stay effortless.",
    short: "Smart controls",
  },
  {
    tag: "07 / FULFILLMENT & AI STUDIO",
    title: (
      <>
        Zero-error dispatch.
        <br />
        <em>AI studio lighting.</em>
      </>
    ),
    text: "Automated thermal label checklists and one-click neural studio backdrops prepare every product for launch.",
    short: "AI & fulfillment",
  },
  {
    tag: "08 / GOLDEN HOUR FLAGSHIP",
    title: (
      <>
        Everything in place.
        <br />
        <em>Ready for every drop.</em>
      </>
    ),
    text: "Arrive at the flagship showcase where curated collections, instant checkout, and nationwide delivery meet.",
    short: "Flagship drop",
  },
];

const railChapters = [
  {
    tag: "01 / AEROPULSE FOOTWEAR",
    title: (
      <>
        Carbon-plated speed.
        <br />
        <em>Verified authentic.</em>
      </>
    ),
    text: "Follow the 3D spline past ultra-light 180g marathon runners with every stitch and sole inspected.",
    short: "Footwear drop",
  },
  {
    tag: "02 / CHRONOS TITANIUM S10",
    title: (
      <>
        Precision time.
        <br />
        <em>Sapphire durability.</em>
      </>
    ),
    text: "Curve past aerospace titanium wearables featuring live ECG telemetry and 7-day battery endurance.",
    short: "Titanium watch",
  },
  {
    tag: "03 / KURO CUSTOM MECH",
    title: (
      <>
        Tactile engineering.
        <br />
        <em>Built for creators.</em>
      </>
    ),
    text: "Explore CNC-machined 75% gasket mechanical keyboards with hot-swap switches along the 3D rail.",
    short: "Custom mech",
  },
  {
    tag: "04 / PRO MIRRORLESS OPTICS",
    title: (
      <>
        Full-frame f/1.4.
        <br />
        <em>Cinema-grade glass.</em>
      </>
    ),
    text: "Glide beside weather-sealed 4K60 mirrorless camera bodies and aspherical prime lenses.",
    short: "Pro optics",
  },
  {
    tag: "05 / BOTANICA & SKINCARE",
    title: (
      <>
        Clean glow rituals.
        <br />
        <em>Dermatologist tested.</em>
      </>
    ),
    text: "Sweep past pure Jeju centella and 10% niacinamide serums sourced directly from official brand labs.",
    short: "Clean skincare",
  },
  {
    tag: "06 / HOME BARISTA LAB",
    title: (
      <>
        15-bar extraction.
        <br />
        <em>93.5°C PID precision.</em>
      </>
    ),
    text: "Pass commercial-grade stainless espresso stations with dual boilers and micro-foam steam wands.",
    short: "Home barista",
  },
  {
    tag: "07 / NOVA 4K AERIAL DRONE",
    title: (
      <>
        Tri-sensor flight.
        <br />
        <em>45-minute horizon.</em>
      </>
    ),
    text: "Discover foldable 4K60 cinema drones with omnidirectional obstacle sensing and 12km HD transmission.",
    short: "4K cinema drone",
  },
  {
    tag: "08 / HYPERSPEED GPS RADAR",
    title: (
      <>
        Live courier sweep.
        <br />
        <em>8-minute door ETA.</em>
      </>
    ),
    text: "Track your express rider in real time with sub-second GPS telemetry from local hub to your doorstep.",
    short: "Live GPS radar",
  },
];

const sceneMeta: Record<
  SceneKind,
  {
    id: string;
    chapters: typeof laptopChapters;
    subtitle: string;
    badge: string;
    hint: string;
    footerNote: string;
    ariaLabel: string;
  }
> = {
  laptop: {
    id: "story",
    chapters: laptopChapters,
    subtitle: "3D STUDIO LAPTOP & LAYERED WORKSPACE",
    badge: "01 — THE STUDIO WORKSPACE",
    hint: "SCROLL TO EXPLORE 8 3D CHAPTERS",
    footerNote: "8 CHAPTERS • STUDIO, PAYMENTS, ANALYTICS & FLAGSHIP",
    ariaLabel: "Meet Shopply: 8-chapter 3D laptop studio and layered card workspace",
  },
  rail: {
    id: "journey",
    chapters: railChapters,
    subtitle: "3D PRODUCT RAIL & CURATED SHOWCASE",
    badge: "02 — THE 3D PRODUCT RAIL",
    hint: "SCROLL ALONG THE 8-STOP 3D RAIL",
    footerNote: "8 CHAPTERS • FOOTWEAR, OPTICS, ESPRESSO, DRONES & GPS",
    ariaLabel: "Explore the Shopply 8-chapter 3D product rail",
  },
};

function smoothScrollTo(targetY: number, duration = 850) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 2) return;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo(0, startY + diff * ease);
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function ScrollScene({ kind, onLoginClick }: { kind: SceneKind; onLoginClick?: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const [lens, setLens] = useState<LensMode>("cinema");
  const [cruising, setCruising] = useState(false);
  const meta = sceneMeta[kind];
  const chapters = meta.chapters;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    import("./scroll-scenes")
      .then(({ mountScrollScene }) => {
        if (!cancelled) destroy = mountScrollScene(root, kind, chapters.length);
      })
      .catch(() => {
        root.dataset.webgl = "unavailable";
      });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [kind, chapters.length]);

  useEffect(() => {
    if (!cruising) return;
    let raf = 0;
    let lastTime = performance.now();

    function stopCruise() {
      setCruising(false);
    }

    function tick(now: number) {
      const root = rootRef.current;
      if (!root) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const stageH = stage ? stage.clientHeight : window.innerHeight;
      const scrollStart = root.getBoundingClientRect().top + window.scrollY;
      const scrollEnd = scrollStart + Math.max(1, root.offsetHeight - stageH);

      if (window.scrollY < scrollStart - 10) {
        window.scrollTo(0, scrollStart);
      } else if (window.scrollY >= scrollEnd - 4) {
        setCruising(false);
        return;
      } else {
        window.scrollBy(0, dt * 210);
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    window.addEventListener("wheel", stopCruise, { passive: true });
    window.addEventListener("touchstart", stopCruise, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stopCruise);
      window.removeEventListener("touchstart", stopCruise);
    };
  }, [cruising]);

  function goTo(index: number) {
    setCruising(false);
    const root = rootRef.current;
    if (!root) return;
    const clampedIndex = Math.max(0, Math.min(chapters.length - 1, index));
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const stageH = stage ? stage.clientHeight : window.innerHeight;
    const travel = Math.max(1, root.offsetHeight - stageH);
    const scrollStart = root.getBoundingClientRect().top + window.scrollY;
    const destY = scrollStart + (travel * clampedIndex) / (chapters.length - 1);
    smoothScrollTo(destY, 850);
  }

  function stepBy(delta: number) {
    const root = rootRef.current;
    if (!root) return;
    const current = Number(root.dataset.chapter || "0");
    goTo(current + delta);
  }

  const sceneClassName = [styles.journey, kind === "rail" ? styles.railJourney : ""]
    .filter(Boolean)
    .join(" ");

  const totalFormatted = String(chapters.length).padStart(2, "0");

  return (
    <section
      ref={rootRef}
      id={meta.id}
      className={sceneClassName}
      data-kind={kind}
      data-chapter="0"
      data-lens={lens}
      aria-label={meta.ariaLabel}
    >
      <div className={styles.sticky} data-stage>
        <div className={styles.canvas} data-canvas aria-hidden="true" />
        <div className={styles.fallback} data-fallback aria-hidden="true">
          <span>
            shopply<span>↗</span>
          </span>
          <div>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <small>A WORLD OF POSSIBILITY</small>
        </div>

        <div className={styles.topline}>
          <span className={styles.worldBadge}>{meta.badge}</span>
          <span className={styles.worldSub}>{meta.subtitle}</span>
          <span className={styles.worldHint}>{meta.hint}</span>
        </div>

        <div className={styles.copyStack}>
          {chapters.map((chapter, index) => {
            const stepFormatted = String(index + 1).padStart(2, "0");
            return (
              <div
                key={chapter.tag}
                className={`${styles.copy} ${kind === "laptop" && index === 0 ? styles.introCopy : ""}`}
                data-copy
                data-index={index}
                aria-hidden={index !== 0}
                inert={index !== 0}
              >
                <div className={styles.eyebrowRow}>
                  <p className={styles.eyebrow}>{chapter.tag}</p>
                  <span className={styles.stepPill}>
                    {stepFormatted} / {totalFormatted}
                  </span>
                </div>
                {kind === "laptop" && index === 0 ? <h1>{chapter.title}</h1> : <h2>{chapter.title}</h2>}
                <p className={styles.description}>{chapter.text}</p>
                {kind === "laptop" && index === 0 && (
                  <div className={styles.actions}>
                    <a
                      href="/login"
                      onClick={e => {
                        if (onLoginClick) {
                          e.preventDefault();
                          onLoginClick();
                        }
                      }}
                      className={styles.primary}
                    >
                      Start shopping <span aria-hidden="true">↗</span>
                    </a>
                    <button type="button" onClick={() => setCruising(true)}>
                      ▶ Auto-Cruise 3D
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <nav className={styles.stops} aria-label={`${meta.badge} chapters`}>
          {chapters.map((chapter, index) => (
            <button
              key={chapter.tag}
              type="button"
              className={styles.stopBtn}
              data-stop={index}
              onClick={() => goTo(index)}
              aria-label={`Jump to chapter ${index + 1}: ${chapter.short}`}
            >
              <span className={styles.stopLabel}>{chapter.short}</span>
              <span className={styles.stopDot} />
            </button>
          ))}
        </nav>

        <div className={styles.hudBar}>
          <span className={styles.telemetryPill} data-telemetry>
            Z-DEPTH +7.8M • 0%
          </span>

          <div className={styles.lensGroup} role="group" aria-label="3D Camera Lens">
            {(["cinema", "wide", "orbit"] as LensMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                data-active={lens === mode}
                onClick={() => setLens(mode)}
              >
                {mode === "cinema" ? "Cinema" : mode === "wide" ? "Wide 3D" : "Orbit"}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.cruiseBtn}
            data-active={cruising}
            onClick={() => setCruising(c => !c)}
          >
            {cruising ? "⏸ Pause 3D" : "▶ Auto-Cruise"}
          </button>

          <div className={styles.hudNav}>
            <button type="button" onClick={() => stepBy(-1)} aria-label="Previous 3D chapter">
              ↑ Prev
            </button>
            <button type="button" onClick={() => stepBy(1)} aria-label="Next 3D chapter">
              Next ↓
            </button>
          </div>
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span data-progress data-orientation="horizontal" />
        </div>
      </div>
      <div className={styles.sectionMarkers} aria-hidden="true">
        {chapters.map(chapter => (
          <div key={chapter.tag} />
        ))}
      </div>
    </section>
  );
}

export default function AboutExperience({ onLoginClick }: { onLoginClick?: () => void } = {}) {
  return (
    <>
      <HeroZoomOut />
      <ScrollScene kind="laptop" onLoginClick={onLoginClick} />
      <div className={styles.interlude}>
        <p>SCENE 01 → SCENE 02 • CURATED DROPS ALONG THE 3D RAIL</p>
        <h2>
          From carbon runners to
          <br />
          <em>4K aerial cinema.</em>
        </h2>
        <span>
          Continue scrolling along the 3D rail <b aria-hidden="true">↓</b>
        </span>
      </div>
      <ScrollScene kind="rail" />
    </>
  );
}
