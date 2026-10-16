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

const globeChapters = [
  {
    tag: "01 / LUZON MEGA-HUB",
    title: (
      <>
        Manila to Clark.
        <br />
        <em>18,400 parcels a day.</em>
      </>
    ),
    text: "Orbit our 3D geodesic planet as automated optical sortation hubs clear 99.7% of Luzon orders for same-day exit.",
    short: "Luzon hub",
  },
  {
    tag: "02 / VISAYAS SEA & AIR BRIDGE",
    title: (
      <>
        Cebu, Iloilo, Bacolod.
        <br />
        <em>4.2-hour transit.</em>
      </>
    ),
    text: "Glowing 3D flight arcs connect every island with high-frequency cargo bridges and real-time vessel telemetry.",
    short: "Visayas bridge",
  },
  {
    tag: "03 / MINDANAO PRIORITY CARGO",
    title: (
      <>
        Davao & CDO.
        <br />
        <em>Direct night freighters.</em>
      </>
    ),
    text: " Dedicated air-cargo corridors power +52% merchant growth across Mindanao with door-to-door cold-chain tracking.",
    short: "Mindanao air",
  },
  {
    tag: "04 / ASEAN CROSS-BORDER",
    title: (
      <>
        Tokyo, Seoul, Singapore.
        <br />
        <em>Zero FX markup.</em>
      </>
    ),
    text: "Shop international flagship boutiques directly in PHP with instant customs clearance and gyroscopic route optimization.",
    short: "ASEAN gateway",
  },
  {
    tag: "05 / ROBOTICS & GREEN EV FLEET",
    title: (
      <>
        1,200 packs an hour.
        <br />
        <em>84% electric last-mile.</em>
      </>
    ),
    text: "Autonomous warehouse grids and solar-charged EV courier vans cut 12.4 tons of CO₂ every single month.",
    short: "Green robotics",
  },
];

const vaultChapters = [
  {
    tag: "01 / PASSKEY BIOMETRIC PAY",
    title: (
      <>
        One-tap FaceID.
        <br />
        <em>0.2-second approval.</em>
      </>
    ),
    text: "Meet the 3D Titanium Flagship Phone—engineered with hardware-backed cryptographic passkeys for instant checkout.",
    short: "Biometric pay",
  },
  {
    tag: "02 / EXPLODED 3D LAYERS",
    title: (
      <>
        Unpack the stack.
        <br />
        <em>60fps spatial AR.</em>
      </>
    ),
    text: "Watch the phone screen physically separate into 3D floating layers—revealing true-scale AR room try-on and live streams.",
    short: "Exploded 3D",
  },
  {
    tag: "03 / LIVE DROP STUDIO",
    title: (
      <>
        14.2k watching live.
        <br />
        <em>320 cart adds a minute.</em>
      </>
    ),
    text: "Creators broadcast interactive HD product drops with one-tap pinned items and real-time community reactions.",
    short: "Live studio",
  },
  {
    tag: "04 / ESCROW & 0% SPLIT-PAY",
    title: (
      <>
        100% protected vault.
        <br />
        <em>Pay in 4 at 0% interest.</em>
      </>
    ),
    text: "Shopply Authentic Shield holds funds in escrow until you inspect your parcel, paired with flexible 4x split payments.",
    short: "Escrow & split",
  },
  {
    tag: "05 / CASHBACK TREASURY",
    title: (
      <>
        Earn 5% back in
        <br />
        <em>never-expiring coins.</em>
      </>
    ),
    text: "Every verified purchase builds your instant rewards vault—redeemable across thousands of flagship merchants.",
    short: "Rewards vault",
  },
];

const helixChapters = [
  {
    tag: "01 / THE DNA OF COMMERCE",
    title: (
      <>
        Ascend the 3D
        <br />
        <em>Double-Helix Tower.</em>
      </>
    ),
    text: "Two intertwined neon strands connect 22 glowing energy rungs—powering the next generation of AI merchant tools.",
    short: "DNA helix",
  },
  {
    tag: "02 / NEURAL AI PHOTO STUDIO",
    title: (
      <>
        Raw phone snap to
        <br />
        <em>studio lighting in 1 click.</em>
      </>
    ),
    text: "Our built-in neural backdrop engine removes clutter and renders realistic 3D studio shadows automatically.",
    short: "AI photo studio",
  },
  {
    tag: "03 / DYNAMIC BUNDLE ENGINE",
    title: (
      <>
        Smart kit pairing.
        <br />
        <em>+34% order value.</em>
      </>
    ),
    text: "Automatically pair compatible accessories with tiered volume discounts as the camera spirals up the tower.",
    short: "Smart bundler",
  },
  {
    tag: "04 / 11.11 FLASH QUEUE ENGINE",
    title: (
      <>
        High-concurrency drops.
        <br />
        <em>Zero-crash checkout.</em>
      </>
    ),
    text: "Built to handle tens of thousands of simultaneous flash-sale claims with fair queue locks and instant inventory sync.",
    short: "Flash engine",
  },
  {
    tag: "05 / VERIFIED VIDEO UNBOXINGS",
    title: (
      <>
        28,400 buyer videos.
        <br />
        <em>4.96★ real community proof.</em>
      </>
    ),
    text: "Reach the summit of the 3D Helix where authentic video reviews and verified merchants build lasting trust.",
    short: "Video proof",
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
  globe: {
    id: "network",
    chapters: globeChapters,
    subtitle: "3D GEODESIC PLANET & GYROSCOPIC CARGO ARCS",
    badge: "03 — THE NETWORK",
    hint: "ORBIT THE PLANET",
    footerNote: "5 CHAPTERS • LUZON, VISAYAS, MINDANAO & ASEAN",
    ariaLabel: "Explore the Shopply 3D planetary logistics network",
  },
  vault: {
    id: "ecosystem",
    chapters: vaultChapters,
    subtitle: "3D TITANIUM PHONE & EXPLODING HOLOGRAPHIC LAYERS",
    badge: "04 — THE POCKET VAULT",
    hint: "UNPACK 3D LAYERS",
    footerNote: "5 CHAPTERS • FACEID, 60FPS AR, LIVE & ESCROW",
    ariaLabel: "Explore the Shopply 3D mobile flagship and exploded layers",
  },
  helix: {
    id: "helix",
    chapters: helixChapters,
    subtitle: "3D DOUBLE-HELIX DNA TOWER & NEURAL AI ENGINE",
    badge: "05 — THE DNA HELIX",
    hint: "ASCEND THE HELIX",
    footerNote: "5 CHAPTERS • AI STUDIO, BUNDLER & FLASH ENGINE",
    ariaLabel: "Explore the Shopply 3D double-helix AI commerce tower",
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

  const sceneClassName = [
    styles.journey,
    kind === "rail" ? styles.railJourney : "",
    kind === "globe" ? styles.globeJourney : "",
    kind === "vault" ? styles.vaultJourney : "",
    kind === "helix" ? styles.helixJourney : "",
  ]
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
      <div className={styles.interlude}>
        <p>WORLD 02 → WORLD 03 • ARCHIPELAGO-WIDE LOGISTICS TELEMETRY</p>
        <h2>
          Luzon, Visayas, Mindanao,
          <br />
          and <em>ASEAN in real time.</em>
        </h2>
        <span>
          Orbit the 3D Planetary Network <b aria-hidden="true">↓</b>
        </span>
      </div>
      <ScrollScene kind="globe" />
      <div className={styles.interlude}>
        <p>WORLD 03 → WORLD 04 • SPATIAL MOBILE ARCHITECTURE</p>
        <h2>
          Biometric security meets
          <br />
          <em>60fps augmented reality.</em>
        </h2>
        <span>
          Unpack the 3D Pocket Flagship <b aria-hidden="true">↓</b>
        </span>
      </div>
      <ScrollScene kind="vault" />
      <div className={styles.interlude}>
        <p>WORLD 04 → WORLD 05 • NEURAL AI & HIGH-CONCURRENCY SCALE</p>
        <h2>
          Ascend the spiral of
          <br />
          <em>autonomous commerce.</em>
        </h2>
        <span>
          Climb the 3D Double-Helix Tower <b aria-hidden="true">↓</b>
        </span>
      </div>
      <ScrollScene kind="helix" />
    </>
  );
}
