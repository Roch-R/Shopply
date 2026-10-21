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
    text: "Instant settlement notifications and real-time visitor analytics expand around the display as the camera locks in.",
    short: "Look closer",
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
    text: "Fly straight through the glowing display frame and enter the multi-layered 3D interior of your storefront.",
    short: "Step inside",
  },
  {
    tag: "04 / SPATIAL WORKFLOWS",
    title: (
      <>
         schedules, chat,
        <br />
        <em>and smart controls.</em>
      </>
    ),
    text: "Glide past same-day dispatch calendars, live buyer conversations, and automated fraud shields suspended in 3D space.",
    short: "In layers",
  },
  {
    tag: "05 / FLAGSHIP CORE",
    title: (
      <>
        Real-time pulse.
        <br />
        <em>Golden hour drops.</em>
      </>
    ),
    text: "Arrive at the heart of the tunnel where verified creator profiles and curated audio collections converge.",
    short: "Live command",
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
    text: "Bank through the second glowing portal past titanium wearables with live ECG and 7-day battery telemetry.",
    short: "Wearables",
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
    text: "Experience CNC-machined 75% gasket keyboards and pro mirrorless f/1.4 camera optics along the high-speed spline.",
    short: "Creator gear",
  },
  {
    tag: "04 / BOTANICA & BARISTA",
    title: (
      <>
        Everyday rituals.
        <br />
        <em>Elevated at home.</em>
      </>
    ),
    text: "From pure Jeju centella skincare serums to 15-bar PID espresso stations, discover curated essentials at every turn.",
    short: "Daily rituals",
  },
  {
    tag: "05 / AERIAL & GPS RADAR",
    title: (
      <>
        Tri-sensor drones to
        <br />
        <em>8-minute rider ETA.</em>
      </>
    ),
    text: "Finish the coaster run alongside 4K cinema drones and live HyperSpeed GPS courier radar tracking to your door.",
    short: "Live radar",
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
    subtitle: "3D STUDIO PRO LAPTOP & SPATIAL PORTAL VORTEX",
    badge: "01 — THE STUDIO",
    hint: "DIVE INTO THE SCREEN",
    footerNote: "5 CHAPTERS • STUDIO & PORTAL TUNNEL",
    ariaLabel: "Meet Shopply: 3D laptop studio and portal tunnel",
  },
  rail: {
    id: "journey",
    chapters: railChapters,
    subtitle: "3D HYPERLOOP COASTER & CURATED PRODUCT DROPS",
    badge: "02 — THE COASTER",
    hint: "RIDE THE HYPERLOOP",
    footerNote: "5 CHAPTERS • FOOTWEAR, OPTICS, DRONES & RADAR",
    ariaLabel: "Explore the Shopply 3D hyperloop product coaster",
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
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const stageH = stage ? stage.clientHeight : window.innerHeight;
    const travel = Math.max(1, root.offsetHeight - stageH);
    const scrollStart = root.getBoundingClientRect().top + window.scrollY;
    const destY = scrollStart + (travel * index) / (chapters.length - 1);
    smoothScrollTo(destY, 850);
  }

  const sceneClassName = [styles.journey, kind === "rail" ? styles.railJourney : ""]
    .filter(Boolean)
    .join(" ");

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

        <div className={styles.copyStack}>
          {chapters.map((chapter, index) => (
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
                  0{index + 1} / 0{chapters.length}
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
          ))}
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
