"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./experience.module.css";

const chapters = [
  { label: "01 / THE VISION", title: <>The smarter way to <em>run your shop.</em></>, text: "Less busywork. More possibility. Meet the commerce workspace that brings your products, orders, and ideas together.", short: "Your workspace" },
  { label: "02 / THE DETAILS", title: <>Every detail. <em>Beautifully connected.</em></>, text: "From the first product to the next delivery, keep every moving part in view. One space. A whole world of possibilities.", short: "All connected" },
  { label: "03 / THE POSSIBILITIES", title: <>Small beginnings. <em>Bigger possibilities.</em></>, text: "We built Shopply for people with something to share. A clearer view of your business gives you more room to make your next move.", short: "Room to grow" },
];

function Bag({ small = false }: { small?: boolean }) {
  return <svg width={small ? 20 : 44} height={small ? 24 : 50} viewBox="0 0 48 56" fill="none" aria-hidden="true"><rect x="5" y="17" width="38" height="34" rx="9" stroke="currentColor" strokeWidth="3" /><path d="M15 18v-5a9 9 0 0 1 18 0v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M14 34c4-6 7-6 11 0s7 6 11 0" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export default function AboutExperience() {
  const journey = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = journey.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let currentChapter = -1;
    const update = () => {
      frame = 0;
      root.dataset.reduced = String(motion.matches);
      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, root.offsetHeight - window.innerHeight + 68);
      const progress = motion.matches ? 0 : Math.max(0, Math.min(1, (68 - rect.top) / travel));
      // Expand the layers through the middle chapter, then assemble them again.
      const spread = Math.sin(progress * Math.PI);
      root.style.setProperty("--journey", progress.toFixed(4));
      root.style.setProperty("--spread", spread.toFixed(4));
      const chapter = progress < 0.31 ? 0 : progress < 0.69 ? 1 : 2;
      if (chapter !== currentChapter) {
        currentChapter = chapter;
        root.dataset.chapter = String(chapter);
        root.querySelectorAll<HTMLElement>("[data-copy]").forEach((copy, index) => {
          copy.setAttribute("aria-hidden", String(!motion.matches && index !== chapter));
          copy.inert = !motion.matches && index !== chapter;
        });
        root.querySelectorAll<HTMLElement>("[data-chapter-link]").forEach((link, index) => {
          if (index === chapter) link.setAttribute("aria-current", "step");
          else link.removeAttribute("aria-current");
        });
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const onMotion = () => { currentChapter = -1; schedule(); };
    const move = (event: PointerEvent) => {
      if (motion.matches || !pointer.matches) return;
      root.style.setProperty("--pointer-x", ((event.clientX / window.innerWidth - 0.5) * 8).toFixed(2) + "deg");
      root.style.setProperty("--pointer-y", ((event.clientY / window.innerHeight - 0.5) * -6).toFixed(2) + "deg");
    };
    const reset = () => {
      root.style.setProperty("--pointer-x", "0deg");
      root.style.setProperty("--pointer-y", "0deg");
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", onMotion);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", onMotion);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
    };
  }, []);

  function goToChapter(index: number) {
    const root = journey.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.querySelectorAll("[data-copy]")[index]?.scrollIntoView({ block: "center" });
      return;
    }
    const travel = root.offsetHeight - window.innerHeight + 68;
    window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top - 68 + travel * [0, 0.5, 0.94][index], behavior: "smooth" });
  }

  return (
    <section ref={journey} className={styles.journey} data-chapter="0" aria-label="The Shopply story">
      <div className={styles.sticky}>
        <div className={styles.grid} aria-hidden="true" />
        <div className={styles.halo} aria-hidden="true" />
        <div className={styles.layout}>
          <div className={styles.copyArea}>
            <div className={styles.eyebrow}><span /> ABOUT SHOPPLY <span className={styles.eyebrowLine} /> COMMERCE, REIMAGINED</div>
            <div className={styles.chapters}>
              {chapters.map((chapter, index) => <div key={chapter.label} className={styles.copy} data-copy data-index={index} aria-hidden={index !== 0}>
                <p className={styles.chapterLabel}>{chapter.label}</p>
                {index === 0 ? <h1>{chapter.title}</h1> : <h2>{chapter.title}</h2>}
                <p className={styles.description}>{chapter.text}</p>
                <div className={styles.actions}>
                  <Link href="/dashboard" className={styles.primary}>Open Dashboard <span aria-hidden="true">↗</span></Link>
                  <a href="#features" className={styles.secondary}>Explore features <span aria-hidden="true">↓</span></a>
                </div>
              </div>)}
            </div>
            <div className={styles.storyNote}><span className={styles.noteIcon}>✦</span><span>Built for your everyday.<br /><strong>Designed for what comes next.</strong></span></div>
          </div>

          <div className={styles.visual} role="img" aria-label="Illustrated Shopply workspace with product, order, and analytics panels that unfold as you scroll. Example data, for illustration only.">
            <div className={styles.orbit} /><div className={`${styles.orbit} ${styles.orbitTwo}`} />
            <div className={styles.spark}>✦</div><div className={styles.sparkTwo}>✧</div>
            <div className={styles.scene}>
              <div className={styles.platform} />
              <div className={styles.workspace}>
                <div className={styles.windowBar}><div className={styles.windowDots}><i /><i /><i /></div><span>your next chapter starts here</span><span>↗</span></div>
                <div className={styles.dashboard}>
                  <aside className={styles.sidebar}><Bag small /><span className={styles.sideActive}>▦</span><span>▤</span><span>▥</span><span>◇</span><span className={styles.sideBottom}>◉</span></aside>
                  <div className={styles.dashboardContent}>
                    <div className={styles.dashboardHeading}><div><small>YOUR WORKSPACE</small><h3>Hello, possibility.</h3></div><span className={styles.avatar}>S</span></div>
                    <div className={styles.metrics}><div><span>Your products</span><strong>Everything in place</strong><i /></div><div><span>Your next move</span><strong>Make it happen ↗</strong><i /></div></div>
                    <div className={styles.chart}><div><span>A clearer picture</span><small>EXAMPLE OVERVIEW</small></div><svg viewBox="0 0 360 100" fill="none"><defs><linearGradient id="aboutChartFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8b5cf6" stopOpacity=".25" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs><path d="M0 87C30 85 25 55 60 65S100 78 125 44S170 70 195 37S235 52 265 20S315 40 360 5V100H0Z" fill="url(#aboutChartFill)" /><path d="M0 87C30 85 25 55 60 65S100 78 125 44S170 70 195 37S235 52 265 20S315 40 360 5" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" /></svg><div className={styles.chartLabels}><span>IDEA</span><span>LAUNCH</span><span>GROW</span></div></div>
                    <div className={styles.dashboardFooter}><span><i /> All together. All yours.</span><span>Shopply ✦</span></div>
                  </div>
                </div>
              </div>
              <div className={styles.productPanel}><div className={styles.panelTop}><span>THE LITTLE DETAILS</span><span>↗</span></div><div className={styles.bagSculpture}><div className={styles.bagHandle} /><div className={styles.bagFront}><Bag /></div><div className={styles.bagSide} /></div><div className={styles.productBottom}><div><strong>Your next bestseller</strong><small>Starts with an idea.</small></div><span>✦</span></div></div>
              <div className={styles.orderPanel}><span className={styles.orderIcon}>✓</span><div><small>EVERY STEP, CONNECTED</small><strong>From your shop. To their door.</strong><div className={styles.orderTrack}><i /><span /><i /><span /><i /></div></div></div>
              <div className={styles.insightPanel}><span>Room to grow</span><div className={styles.bars}>{[28, 43, 35, 61, 52, 78, 94].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><strong>See what&apos;s possible. <span>↗</span></strong></div>
              <div className={styles.brandTile}><Bag /><span>One space.<br /><strong>Infinite possibility.</strong></span></div>
            </div>
            <span className={styles.visualCaption}>A LITTLE PERSPECTIVE CHANGES EVERYTHING.</span>
          </div>
        </div>
        <div className={styles.bottomBar}><div className={styles.scrollHint}><span>↓</span> SCROLL TO DISCOVER</div><nav className={styles.chapterNav} aria-label="Story chapters">{chapters.map((chapter, index) => <button key={chapter.label} data-chapter-link onClick={() => goToChapter(index)} aria-current={index === 0 ? "step" : undefined}><span>0{index + 1}</span>{chapter.short}</button>)}</nav><span className={styles.progressLabel}>A NEW PERSPECTIVE ↗</span></div>
      </div>
    </section>
  );
}
