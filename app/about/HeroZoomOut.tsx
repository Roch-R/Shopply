"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./hero-zoom-out.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function HeroZoomOut() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLElement>(null);
  const hdRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const metaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const hd = hdRef.current;
    const media = mediaRef.current;
    const img = imgRef.current;
    const meta = metaRef.current;
    if (!root || !pin || !hd || !media || !meta) return;

    const ctx = gsap.context(() => {
      gsap.set([hd, meta], { opacity: 0, y: 14 });
      gsap.set(media, { scale: 1, borderRadius: 0 });
      if (img) gsap.set(img, { scale: 1.05 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => "+=" + window.innerHeight * 1.5,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      // The scene scales toward its bottom edge and rounds off; the headline lands in the room it frees.
      tl.to(media, { scale: 0.58, borderRadius: 44, duration: 1 }, 0)
        .to(hd, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.55)
        .to(meta, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.85)
        .to({}, { duration: 0.35 });

      if (img) {
        tl.to(img, { scale: 1, duration: 1, ease: "power1.out" }, 0);
      }
    }, root);

    void document.fonts.ready.then(() => {
      if (root.isConnected) ScrollTrigger.refresh();
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.heroZoomRoot}>
      <section ref={pinRef} className={styles.pin} aria-label="Shopply flagship hero">
        <header ref={hdRef} className={styles.hd}>
          <span className={styles.k}>Shopply Marketplace</span>
          <h3>
            Everything you love,
            <br />
            in one living storefront.
          </h3>
        </header>
        <div ref={mediaRef} className={styles.media}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src="/shopply-hero-anime.jpg"
            alt="Shopply Online Shopping & Delivery"
            className={styles.mediaImage}
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <footer ref={metaRef} className={styles.meta}>
          <span>Scene 01 - Flagship Storefront</span>
          <span>Live 24/7 • PH</span>
        </footer>
      </section>
      <section className={styles.out}>
        <b>Made for every shopper &amp; creator.</b>
        <p>Verified drops at dawn, instant payouts at noon, nationwide express delivery by night.</p>
      </section>
    </div>
  );
}
