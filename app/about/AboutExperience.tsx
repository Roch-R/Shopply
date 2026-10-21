"use client";

import { useEffect, useRef } from "react";
import styles from "./experience.module.css";
import HeroZoomOut from "./HeroZoomOut";
import type { SceneKind } from "./scroll-scenes";

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
    text: "Watch the 3D Studio Pro workspace hinge open—bringing live payouts, store traffic, and flagship drops into one view.",
    short: "Meet Shopply",
  },
  {
    tag: "02 / ORBITAL TELEMETRY",
    title: (
      <>
        Step closer.
        <br />
        <em>Every metric alive.</em>
      </>
    ),
    text: "Instant settlement notifications and real-time visitor analytics expand in a 3D crown around the Retina display.",
    short: "Orbital metrics",
  },
  {
    tag: "03 / CROSS THE GLASS",
    title: (
      <>
        The screen is
        <br />
        <em>the portal.</em>
      </>
    ),
    text: "Fly straight through the glowing Stargate bezel and enter the multi-layered 3D interior of your storefront.",
    short: "Cross the glass",
  },
  {
    tag: "04 / SPATIAL WORKFLOWS",
    title: (
      <>
        Schedules, chat,
        <br />
        <em>and smart controls.</em>
      </>
    ),
    text: "Glide past same-day dispatch calendars, live buyer conversations, and automated fraud shields suspended in 3D space.",
    short: "Spatial workflows",
  },
  {
    tag: "05 / CREATOR FLAGSHIPS",
    title: (
      <>
        Verified merchants.
        <br />
        <em>Zero-error dispatch.</em>
      </>
    ),
    text: "Soar past top-rated creator profiles and automated thermal label checklists inside the illuminated vortex.",
    short: "Creator hub",
  },
  {
    tag: "06 / GYROSCOPIC NEXUS",
    title: (
      <>
        Pass through the
        <br />
        <em>3D commerce gate.</em>
      </>
    ),
    text: "Three counter-rotating metallic gimbal rings synchronize multi-warehouse inventory and cross-channel analytics.",
    short: "Gyro nexus",
  },
  {
    tag: "07 / NEURAL AI STUDIO",
    title: (
      <>
        Raw phone snap to
        <br />
        <em>studio pro in 1 click.</em>
      </>
    ),
    text: "Our built-in neural backdrop engine and dynamic kit bundler boost average order value by +34% automatically.",
    short: "Neural AI",
  },
  {
    tag: "08 / BIOMETRIC & 60FPS AR",
    title: (
      <>
        One-tap FaceID.
        <br />
        <em>True-scale AR try-on.</em>
      </>
    ),
    text: "Preview sneakers, watches, and home gear in 60fps spatial augmented reality before approving with 0.2s passkeys.",
    short: "AR & FaceID",
  },
  {
    tag: "09 / ESCROW & TREASURY",
    title: (
      <>
        100% protected vault.
        <br />
        <em>5% instant cashback.</em>
      </>
    ),
    text: "Shopply Authentic Shield holds funds safely in escrow until delivery, while every order mints never-expiring coins.",
    short: "Escrow vault",
  },
  {
    tag: "10 / FLAGSHIP SANCTUARY",
    title: (
      <>
        Arrive at the core.
        <br />
        <em>Golden hour drops.</em>
      </>
    ),
    text: "Reach the glowing geodesic heart of the Shopply universe where curated collections and live creators converge.",
    short: "Flagship core",
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
    text: "Launch onto the 3D Hyperloop Coaster starting with ultra-light 180g marathon runners and instant dispatch.",
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
    text: "Bank through the second glowing Stargate past titanium wearables with live ECG and 7-day battery telemetry.",
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
    text: "Experience CNC-machined 75% gasket mechanical keyboards with hot-swap switches along the high-speed spline.",
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
    text: "Dive down the coaster drop beside weather-sealed 4K60 mirrorless camera kits and aspherical prime lenses.",
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
    text: "Sweep past pure Jeju centella and 10% niacinamide serums verified direct from official flagship labs.",
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
    text: "Crest the mid-track apex alongside commercial-grade stainless espresso stations and micro-foam steam wands.",
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
    text: "Accelerate through high-banked neon rings with omnidirectional obstacle radar and 12km O4 video transmission.",
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
  {
    tag: "09 / ARCHIPELAGO MEGA-HUBS",
    title: (
      <>
        Luzon, Visayas,
        <br />
        <em>&amp; Mindanao linked.</em>
      </>
    ),
    text: "Optical sortation hubs, sea-air bridges, and solar EV fleets connect every island with 99.7% same-day exit.",
    short: "Island hubs",
  },
  {
    tag: "10 / FLASH QUEUE SUMMIT",
    title: (
      <>
        11.11 mega scale.
        <br />
        <em>Zero-crash finish.</em>
      </>
    ),
    text: "Cross the final Hyperloop portal powered by high-concurrency flash queues and 28,400+ verified video unboxings.",
    short: "Flash summit",
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
    subtitle: "3D STUDIO PRO LAPTOP & DEEP SPATIAL PORTAL ODYSSEY",
    badge: "01 — THE STUDIO & PORTAL",
    hint: "SCROLL TO DIVE THROUGH 10 3D CHAPTERS",
    footerNote: "10 CHAPTERS • STUDIO, GYRO GATE, AI & SANCTUARY CORE",
    ariaLabel: "Meet Shopply: 10-chapter 3D laptop studio and deep portal vortex",
  },
  rail: {
    id: "journey",
    chapters: railChapters,
    subtitle: "3D HYPERLOOP COASTER & CURATED PRODUCT MEGA-RUN",
    badge: "02 — THE HYPERLOOP COASTER",
    hint: "RIDE THE 10-STAGE 3D HYPERLOOP",
    footerNote: "10 CHAPTERS • FOOTWEAR, OPTICS, DRONES, HUBS & FLASH SUMMIT",
    ariaLabel: "Explore the Shopply 10-chapter 3D hyperloop product coaster",
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

  function goTo(index: number) {
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
                    <button onClick={() => goTo(1)}>
                      Explore 3D worlds <span aria-hidden="true">↓</span>
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
          <span className={styles.hudNote}>{meta.footerNote}</span>
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
        <p>WORLD 01 → WORLD 02 • CURATED DROPS IN HIGH-SPEED MOTION</p>
        <h2>
          From carbon runners to
          <br />
          <em>4K aerial cinema.</em>
        </h2>
        <span>
          Enter the 3D Hyperloop Coaster <b aria-hidden="true">↓</b>
        </span>
      </div>
      <ScrollScene kind="rail" />
    </>
  );
}
