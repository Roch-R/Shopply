"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import styles from "./DeliveryJourney.module.css";
import {
  ANCHOR_STRIDE,
  CHAPTERS,
  CHECKPOINTS,
  MAP_CITIES,
  REGIONS,
  SERVICE_SIGNS,
  TRACK_STEPS,
} from "./journeyData";
import { PH_ISLANDS } from "./phOutline";
import type { JourneyScene } from "./journeyScene";

interface DeliveryJourneyProps {
  isLoggedIn: boolean;
  onLoginClick?: () => void;
}

type Status = "loading" | "ready" | "fallback";

/** Fade windows for each overlay, in scroll progress: [inStart, inEnd, outStart, outEnd]. */
const FADES = {
  intro: [-1, 0, 0.04, 0.056],
  services: [0.06, 0.078, 0.172, 0.19],
  tilt: [0.2, 0.214, 0.272, 0.29],
  track: [0.3, 0.318, 0.386, 0.402],
  hub: [0.408, 0.424, 0.452, 0.468],
  map: [0.538, 0.558, 0.628, 0.645],
  ride: [0.75, 0.772, 0.872, 0.89],
  done: [0.952, 0.968, 2, 3],
} as const;
/** The cloud veil hides the two world swaps: city -> map and map -> neighbourhood. */
const VEILS = [
  [0.47, 0.492, 0.512, 0.536],
  [0.648, 0.669, 0.686, 0.71],
] as const;
type FadeKey = keyof typeof FADES;
const FADE_KEYS = Object.keys(FADES) as FadeKey[];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const fadeAt = (p: number, w: readonly [number, number, number, number]) => range(p, w[0], w[1]) * (1 - range(p, w[2], w[3]));

// Reduced motion: the scene only moves when the visitor scrolls (it is driven
// directly by their input), so it stays on; mouse parallax and looping CSS
// animations are switched off instead.
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/* Static SVG map used when 3D is unavailable or motion is reduced. */
const STATIC_MAP = (() => {
  const cos = Math.cos((12.9 * Math.PI) / 180);
  const px = (lon: number) => (lon - 116.6) * cos * 10;
  const py = (lat: number) => (21.4 - lat) * 10;
  const islands = PH_ISLANDS.map(
    (ring) => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join("") + "Z"
  ).join("");
  const pts = MAP_CITIES.map((c) => ({ x: px(c.lon), y: py(c.lat), name: c.name }));
  let route = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    route += `Q${((a.x + b.x) / 2 + 12).toFixed(1)} ${((a.y + b.y) / 2 - 6).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return { islands, route, pts, width: Math.ceil(px(127) + 4), height: Math.ceil(py(4.4) + 4) };
})();

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function DeliveryJourney({ isLoggedIn, onLoginClick }: DeliveryJourneyProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [chapter, setChapter] = useState(0);
  const [latest, setLatest] = useState(-1);
  const isStatic = status === "fallback";

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);
  const railFillRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const fadeRefs = useRef<Partial<Record<FadeKey, HTMLDivElement | null>>>({});
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cityRefs = useRef<(HTMLDivElement | null)[]>([]);

  const startShopping = (e: React.MouseEvent) => {
    if (!isLoggedIn && onLoginClick) {
      e.preventDefault();
      onLoginClick();
    }
  };

  const jumpTo = (p: number) => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const total = root.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: top + p * Math.max(0, total), behavior: "smooth" });
  };

  useEffect(() => {
    if (isStatic) return;
    const root = rootRef.current;
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!root || !stage || !host) return;

    let cancelled = false;
    let loading = false;
    let scene: JourneyScene | null = null;
    let raf = 0;
    let inView = false;
    let targetP = 0;
    let p = -1;
    let renderedP = -1;
    let pointerTX = 0;
    let pointerTY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastTime = 0;
    let dirty = true;
    let lastChapter = -1;
    let lastLatest = -2;
    const cardState: string[] = [];

    let forcedP: number | null = null;
    const measure = () => {
      if (forcedP !== null) {
        targetP = forcedP;
        return;
      }
      const rect = root.getBoundingClientRect();
      const total = rect.height - stage.clientHeight;
      targetP = total > 0 ? clamp01(-rect.top / total) : 0;
    };

    const applyOverlays = (prog: number) => {
      for (const key of FADE_KEYS) {
        const el = fadeRefs.current[key];
        if (!el) continue;
        const v = fadeAt(prog, FADES[key]);
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0)`;
        el.style.visibility = v < 0.01 ? "hidden" : "visible";
      }
      const veil = veilRef.current;
      if (veil) {
        const v = Math.max(fadeAt(prog, VEILS[0]), fadeAt(prog, VEILS[1]));
        veil.style.opacity = v.toFixed(3);
        veil.style.visibility = v < 0.005 ? "hidden" : "visible";
      }
      if (railFillRef.current) railFillRef.current.style.transform = `scaleY(${prog.toFixed(4)})`;
      const status = statusRef.current;
      if (status) {
        const v = range(prog, 0.008, 0.016);
        status.style.opacity = v.toFixed(3);
        status.style.visibility = v < 0.01 ? "hidden" : "visible";
      }

      let ch = 0;
      CHAPTERS.forEach((c, i) => {
        if (prog >= c.from) ch = i;
      });
      if (ch !== lastChapter) {
        lastChapter = ch;
        setChapter(ch);
      }

      const anchors = scene?.anchors;
      cardRefs.current.forEach((el, i) => {
        const o = i * ANCHOR_STRIDE;
        const alpha = anchors ? anchors[o + 2] : 0;
        const flag = anchors ? anchors[o + 3] : 0;
        if (!el) return;
        el.style.opacity = alpha.toFixed(3);
        el.style.visibility = alpha < 0.01 ? "hidden" : "visible";
        if (anchors && alpha > 0.001) {
          el.style.transform = `translate3d(${anchors[o].toFixed(1)}px, ${anchors[o + 1].toFixed(1)}px, 0)`;
        }
        const state = flag >= 2 ? "current" : flag >= 1 ? "done" : "upcoming";
        if (cardState[i] !== state) {
          cardState[i] = state;
          el.dataset.state = state;
        }
      });
      let stepNow = -1;
      TRACK_STEPS.forEach((t, i) => {
        if (prog >= t.at) stepNow = i;
      });
      if (stepNow !== lastLatest) {
        lastLatest = stepNow;
        setLatest(stepNow);
      }

      cityRefs.current.forEach((el, i) => {
        if (!el) return;
        const o = (CHECKPOINTS.length + i) * ANCHOR_STRIDE;
        const alpha = anchors ? anchors[o + 2] : 0;
        el.style.opacity = alpha.toFixed(3);
        el.style.visibility = alpha < 0.01 ? "hidden" : "visible";
        if (anchors && alpha > 0.001) {
          el.style.transform = `translate3d(${anchors[o].toFixed(1)}px, ${anchors[o + 1].toFixed(1)}px, 0)`;
        }
      });
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      if (p < 0) p = targetP;
      p += (targetP - p) * (1 - Math.exp(-dt * 7));
      if (Math.abs(targetP - p) < 0.00004) p = targetP;
      const kPointer = 1 - Math.exp(-dt * 4);
      pointerX += (pointerTX - pointerX) * kPointer;
      pointerY += (pointerTY - pointerY) * kPointer;
      const pointerSettled = Math.abs(pointerTX - pointerX) < 0.002 && Math.abs(pointerTY - pointerY) < 0.002;
      if (pointerSettled) {
        pointerX = pointerTX;
        pointerY = pointerTY;
      }

      if (dirty || p !== renderedP || !pointerSettled) {
        dirty = false;
        renderedP = p;
        if (scene) scene.render(p, pointerX, pointerY);
        applyOverlays(p);
      }

      const settled = p === targetP && pointerSettled;
      if (inView && !settled) raf = requestAnimationFrame(tick);
      else lastTime = 0;
    };

    const kick = () => {
      if (!raf && !cancelled) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      kick();
    };

    const reducedMotion = window.matchMedia(REDUCED_QUERY);
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reducedMotion.matches) return;
      const rect = stage.getBoundingClientRect();
      pointerTX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      kick();
    };
    const onPointerLeave = () => {
      pointerTX = 0;
      pointerTY = 0;
      kick();
    };

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const fonts = typeof document !== "undefined" && "fonts" in document ? document.fonts : null;
        const fontsReady = fonts
          ? Promise.race([
              Promise.all([
                fonts.load('800 64px "Plus Jakarta Sans"'),
                fonts.load('700 34px "Plus Jakarta Sans"'),
                fonts.load('500 34px "Plus Jakarta Sans"'),
              ]),
              new Promise((resolve) => setTimeout(resolve, 1500)),
            ]).catch(() => undefined)
          : Promise.resolve();
        const [mod] = await Promise.all([import("./journeyScene"), fontsReady]);
        if (cancelled) return;
        scene = mod.createJourneyScene(host, {
          onContextLost: () => {
            if (!cancelled) setStatus("fallback");
          },
          onAssetsReady: () => {
            dirty = true;
            kick();
          },
        });
        scene.resize(host.clientWidth, host.clientHeight);
        if (cancelled) {
          scene.dispose();
          scene = null;
          return;
        }
        setStatus("ready");
        measure();
        dirty = true;
        kick();
      } catch (err) {
        if (!cancelled) {
          console.warn("[DeliveryJourney] 3D scene unavailable, showing static version.", err);
          setStatus("fallback");
        }
      }
    };

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          preloadObserver.disconnect();
          void load();
        }
      },
      { rootMargin: "150% 0px 150% 0px" }
    );
    preloadObserver.observe(root);
    // Safety net: load anyway shortly after the page settles.
    const idleTimer = window.setTimeout(() => void load(), 3000);

    const viewObserver = new IntersectionObserver((entries) => {
      inView = entries.some((en) => en.isIntersecting);
      if (inView) {
        measure();
        dirty = true;
        kick();
      }
    });
    viewObserver.observe(root);

    const resizeObserver = new ResizeObserver(() => {
      if (scene) scene.resize(host.clientWidth, host.clientHeight);
      measure();
      dirty = true;
      kick();
    });
    resizeObserver.observe(host);

    // Development aid: window.__journeyAt(0.5) pins the story at an exact progress, __journeyAt(null) releases it.
    const debugHost = window as unknown as { __journeyAt?: (value: number | null) => void };
    if (process.env.NODE_ENV !== "production") {
      debugHost.__journeyAt = (value) => {
        forcedP = value;
        measure();
        if (value !== null) p = value;
        dirty = true;
        kick();
      };
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    measure();
    kick();

    return () => {
      cancelled = true;
      delete debugHost.__journeyAt;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      preloadObserver.disconnect();
      viewObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      if (scene) scene.dispose();
      scene = null;
    };
  }, [isStatic]);

  const shopHref = isLoggedIn ? "/shop" : "/login";
  const ctas = (
    <div className={styles.ctas}>
      <Link href={shopHref} onClick={startShopping} className={styles.btnPrimary}>
        <span>{isLoggedIn ? "Go to Marketplace" : "Start shopping"}</span>
        <ArrowIcon />
      </Link>
      <Link href="/register" className={styles.btnSecondary}>
        Open a seller account
      </Link>
    </div>
  );

  if (isStatic) {
    return (
      <section className={styles.staticRoot} id="delivery-journey" aria-labelledby="dj-static-title">
        <div className={styles.staticInner}>
          <p className={styles.eyebrow}>The Shopply journey</p>
          <h2 id="dj-static-title" className={styles.staticTitle}>
            Follow one order from a local seller to your door.
          </h2>

          <div className={styles.staticSigns}>
            {SERVICE_SIGNS.map((s) => (
              <div key={s.num} className={styles.staticSign}>
                <span className={styles.staticNum}>{s.num}</span>
                <strong>{s.title}</strong>
                <span>
                  {s.lines[0]} {s.lines[1]}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.staticGrid}>
            <div>
              <p className={styles.eyebrow}>Live order tracking</p>
              <h3 className={styles.staticSub}>Know where your parcel is, at every stop.</h3>
              <ol className={styles.staticTimeline}>
                {TRACK_STEPS.map((c) => (
                  <li key={c.label}>
                    <span className={styles.staticTick}>
                      <CheckIcon />
                    </span>
                    <div>
                      <strong>{c.label}</strong>
                      <span>{c.place}</span>
                    </div>
                    <time>{c.time}</time>
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.staticMapCol}>
              <svg
                className={styles.staticMap}
                viewBox={`0 0 ${STATIC_MAP.width} ${STATIC_MAP.height}`}
                role="img"
                aria-label="Map of the Philippines with a delivery route from Quezon City through Cebu to Davao City"
              >
                <path d={STATIC_MAP.islands} className={styles.staticIslands} />
                <path d={STATIC_MAP.route} className={styles.staticRoute} />
                {STATIC_MAP.pts.map((pt) => (
                  <g key={pt.name}>
                    <circle cx={pt.x} cy={pt.y} r={2.6} className={styles.staticPin} />
                    <text x={pt.x + 5} y={pt.y + 1.5} className={styles.staticLabel}>
                      {pt.name}
                    </text>
                  </g>
                ))}
              </svg>
              <h3 className={styles.staticSub}>Luzon to Mindanao, one marketplace.</h3>
              {ctas}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={rootRef} className={styles.root} id="delivery-journey" aria-labelledby="dj-title">
      <div ref={stageRef} className={styles.stage}>
        <div
          ref={hostRef}
          className={`${styles.canvasHost} ${status === "ready" ? styles.canvasReady : ""}`}
          aria-hidden="true"
        />
        {status === "loading" && (
          <div className={styles.placeholder} aria-hidden="true">
            <div className={styles.placeholderRoad} />
            <span className={styles.placeholderPill}>Loading 3D scene…</span>
          </div>
        )}
        <div ref={veilRef} className={styles.veil} aria-hidden="true" />

        {/* Chapter 1: intro */}
        <div ref={(el) => { fadeRefs.current.intro = el; }} className={`${styles.overlay} ${styles.intro}`}>
          <p className={styles.eyebrow}>The Shopply journey</p>
          <h2 id="dj-title" className={styles.title}>
            Follow one order from a local seller to your door.
          </h2>
          <p className={styles.sub}>Scroll to ride along. Move your mouse to look around.</p>
          <span className={styles.scrollHint} aria-hidden="true">
            <span />
          </span>
        </div>

        {/* Chapter 2: services (signboards are rendered in 3D) */}
        <div ref={(el) => { fadeRefs.current.services = el; }} className={`${styles.overlay} ${styles.services}`}>
          <p className={styles.eyebrow}>Why shoppers choose Shopply</p>
          <h3 className={styles.heading}>
            Everything a good order needs, <em>built in.</em>
          </h3>
          <ul className={styles.srOnly}>
            {SERVICE_SIGNS.map((s) => (
              <li key={s.num}>
                {s.title}: {s.lines[0]} {s.lines[1]}
              </li>
            ))}
          </ul>
        </div>

        {/* Chapter 3: camera tilt */}
        <div ref={(el) => { fadeRefs.current.tilt = el; }} className={`${styles.overlay} ${styles.tilt}`}>
          <span className={styles.pill}>
            <span className={styles.pulse} aria-hidden="true" />
            Picked up. Next stop: the sorting hub.
          </span>
        </div>

        {/* Chapter 4: tracking */}
        <div ref={(el) => { fadeRefs.current.track = el; }} className={`${styles.overlay} ${styles.track}`}>
          <p className={styles.eyebrow}>Live order tracking</p>
          <h3 className={styles.heading}>
            Know where your parcel is, <em>at every stop.</em>
          </h3>
          <p className={styles.sub}>
            Each update comes with a time and a place, from the seller&apos;s shelf to your doorstep.
          </p>
          <div className={styles.orderChip}>
            <span className={styles.orderIcon} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </span>
            <span>
              <strong>Studio Pro ANC Headphones</strong>
              <small>₱2,490 · Cash on Delivery · Quezon City → Davao City</small>
            </span>
          </div>
          <p className={styles.note}>Sample order for illustration.</p>
        </div>

        {/* Checkpoint cards anchored to 3D markers (desktop) */}
        <div className={styles.cards} aria-hidden="true">
          {CHECKPOINTS.map((c, i) => (
            <div
              key={c.status}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={styles.card}
              data-state="upcoming"
            >
              <span className={styles.cardTick}>
                <CheckIcon />
              </span>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <strong>{c.status}</strong>
                  <time>{c.time}</time>
                </div>
                <span className={styles.cardPlace}>{c.place}</span>
                <span className={styles.cardDetail}>{c.detail}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sorting hub */}
        <div ref={(el) => { fadeRefs.current.hub = el; }} className={`${styles.overlay} ${styles.hub}`}>
          <p className={styles.eyebrow}>Sorting hub · Manila</p>
          <h3 className={styles.heading}>
            Sorted the same day, <em>then sent south.</em>
          </h3>
          <p className={styles.sub}>Every parcel is scanned in and out of the hub, so its status is never a guess.</p>
        </div>

        {/* Live tracker that follows the whole story */}
        <div ref={statusRef} className={styles.tracker}>
          <ol className={styles.trackerSteps} aria-hidden="true">
            {TRACK_STEPS.map((t, i) => (
              <li key={t.label} data-state={i < latest ? "done" : i === latest ? "current" : "upcoming"}>
                <span className={styles.trackerDot}>
                  <CheckIcon />
                </span>
                <span className={styles.trackerLabel}>{t.label}</span>
              </li>
            ))}
          </ol>
          <div className={styles.trackerNow} aria-live="polite">
            {latest >= 0 ? (
              <>
                <strong>{TRACK_STEPS[latest].label}</strong>
                <span>
                  {TRACK_STEPS[latest].place} · {TRACK_STEPS[latest].time}
                </span>
                <em>
                  {latest + 1}/{TRACK_STEPS.length}
                </em>
              </>
            ) : (
              <>
                <strong>Order placed</strong>
                <span>Waiting for the seller to confirm</span>
              </>
            )}
          </div>
        </div>

        {/* Chapter 5: nationwide map */}
        <div ref={(el) => { fadeRefs.current.map = el; }} className={`${styles.overlay} ${styles.mapCopy}`}>
          <p className={styles.eyebrow}>Nationwide delivery</p>
          <h3 className={styles.heading}>
            Luzon to Mindanao, <em>one marketplace.</em>
          </h3>
          <p className={styles.sub}>
            Order from verified stores anywhere in the country and pay your way: Cash on Delivery, GCash, Maya or bank transfer.
          </p>
          <ul className={styles.regions}>
            {REGIONS.map((r) => (
              <li key={r.name}>
                <span className={styles.regionDot} aria-hidden="true" />
                <div>
                  <strong>{r.name}</strong>
                  <span>{r.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Last mile: motorcycle rider */}
        <div ref={(el) => { fadeRefs.current.ride = el; }} className={`${styles.overlay} ${styles.ride}`}>
          <p className={styles.eyebrow}>Out for delivery · Davao City</p>
          <h3 className={styles.heading}>
            Your rider is <em>on the way.</em>
          </h3>
          <p className={styles.sub}>A local rider brings it down your street, right to your gate.</p>
        </div>

        {/* Finale: delivered */}
        <div ref={(el) => { fadeRefs.current.done = el; }} className={`${styles.overlay} ${styles.done}`}>
          <span className={styles.doneBadge} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <h3 className={styles.heading}>
            Delivered. <em>Right to your door.</em>
          </h3>
          <ul className={styles.receipt}>
            <li>
              <span>Studio Pro ANC Headphones</span>
              <strong>₱2,490</strong>
            </li>
            <li>
              <span>Paid on delivery</span>
              <strong>Cash on Delivery</strong>
            </li>
            <li>
              <span>Received</span>
              <strong>Thu 11:18 AM · Davao City</strong>
            </li>
          </ul>
          {ctas}
          <p className={styles.note}>Sample order for illustration.</p>
        </div>

        <div className={styles.cities} aria-hidden="true">
          {MAP_CITIES.map((c, i) => (
            <div
              key={c.name}
              ref={(el) => {
                cityRefs.current[i] = el;
              }}
              className={styles.city}
              data-final={i === MAP_CITIES.length - 1 ? "true" : undefined}
            >
              <strong>{c.name}</strong>
              <span>{c.note}</span>
            </div>
          ))}
        </div>

        <nav className={styles.rail} aria-label="Delivery journey chapters">
          <div className={styles.railTrack} aria-hidden="true">
            <div ref={railFillRef} className={styles.railFill} />
          </div>
          {CHAPTERS.map((c, i) => (
            <button
              key={c.label}
              type="button"
              className={styles.railItem}
              data-active={chapter === i ? "true" : undefined}
              aria-current={chapter === i ? "step" : undefined}
              onClick={() => jumpTo(c.jump)}
            >
              <span className={styles.railLabel}>{c.label}</span>
              <span className={styles.railDot} aria-hidden="true" />
            </button>
          ))}
        </nav>

        <a href="#departments" className={styles.skip}>
          Skip the tour
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </a>
      </div>
    </section>
  );
}
