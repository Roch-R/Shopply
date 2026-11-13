"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import styles from "./HomeHero.module.css";

export interface HeroProduct {
  label: string;
  name: string;
  price: string;
  image: string;
  alt: string;
}

interface HomeHeroProps {
  isLoggedIn: boolean;
  onLoginClick?: () => void;
  products: [HeroProduct, HeroProduct, HeroProduct];
  /** Filter the catalogue below and scroll to it. */
  onSearch: (query: string) => void;
  onPreview: (index: number) => void;
}

const SEARCH_HINTS = ["wireless headphones", "running shoes", "everyday watch", "pour-over coffee set", "commuter backpack"];
const POPULAR = ["Headphones", "Shoes", "Watch", "Cleanser"];
const MARQUEE = [
  "Cash on Delivery",
  "GCash",
  "Maya",
  "Bank transfer",
  "Verified local stores",
  "Direct seller chat",
  "Tracked orders",
  "Luzon · Visayas · Mindanao",
  "Receipt on every purchase",
];
const HEADLINE: { text: string; accent?: boolean }[] = [
  { text: "Everyday" },
  { text: "essentials" },
  { text: "from" },
  { text: "trusted", accent: true },
  { text: "local", accent: true },
  { text: "sellers", accent: true },
  { text: "across" },
  { text: "the" },
  { text: "Philippines." },
];

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function HomeHero({ isLoggedIn, onLoginClick, products, onSearch, onPreview }: HomeHeroProps) {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setHint((h) => (h + 1) % SEARCH_HINTS.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  // Product stack leans towards the pointer.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let rx = 0;
    let ry = 0;
    const apply = () => {
      raf = 0;
      stage.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      stage.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = stage.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      rx = 4 - ny * 14;
      ry = -8 + nx * 20;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      rx = 4;
      ry = -8;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const region = stage.parentElement ?? stage;
    region.addEventListener("pointermove", onMove);
    region.addEventListener("pointerleave", onLeave);
    return () => {
      region.removeEventListener("pointermove", onMove);
      region.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const startShopping = (e: React.MouseEvent) => {
    if (!isLoggedIn && onLoginClick) {
      e.preventDefault();
      onLoginClick();
    }
  };

  const cardKey = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPreview(i);
    }
  };

  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.pill}>
            <span className={styles.pulse} aria-hidden="true" />
            Philippine Marketplace · Verified Local Stores
          </div>

          <h1 id="home-hero-title" className={styles.title}>
            {HEADLINE.map((w, i) => (
              <React.Fragment key={w.text}>
                <span className={w.accent ? `${styles.word} ${styles.accent}` : styles.word} style={{ "--i": i } as React.CSSProperties}>
                  {w.text}
                </span>{" "}
              </React.Fragment>
            ))}
          </h1>

          <p className={styles.sub}>
            Shop electronics, footwear, apparel and home goods with transparent peso pricing, direct seller chat and nationwide Cash on Delivery.
          </p>

          <form className={styles.search} onSubmit={submit} role="search">
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${SEARCH_HINTS[hint]}…`}
              aria-label="Search the marketplace"
            />
            <button type="submit">Search</button>
          </form>
          <div className={styles.popular}>
            <span>Popular:</span>
            {POPULAR.map((term) => (
              <button key={term} type="button" onClick={() => onSearch(term)}>
                {term}
              </button>
            ))}
          </div>

          <div className={styles.ctas}>
            <Link href={isLoggedIn ? "/shop" : "/login"} onClick={startShopping} className={styles.primary}>
              <span>{isLoggedIn ? "Go to Marketplace" : "Sign in to start shopping"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="/register" className={styles.secondary}>
              Open a seller account
            </Link>
          </div>

          <ul className={styles.trust}>
            <li>
              <strong>Protected checkout</strong>
              <span>Order tracking and a receipt on every purchase</span>
            </li>
            <li>
              <strong>Direct seller chat</strong>
              <span>Ask for sizing and real stock photos</span>
            </li>
            <li>
              <strong>Flexible payment</strong>
              <span>Cash on Delivery, GCash, Maya and bank transfer</span>
            </li>
          </ul>
        </div>

        <div className={styles.stageWrap}>
          <div ref={stageRef} className={styles.stage}>
            <div className={styles.ring} aria-hidden="true" />

            <div
              className={`${styles.card} ${styles.cardMain}`}
              role="button"
              tabIndex={0}
              onClick={() => onPreview(0)}
              onKeyDown={cardKey(0)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={products[0].image} alt={products[0].alt} />
              <div className={styles.caption}>
                <div>
                  <small>{products[0].label}</small>
                  <strong>{products[0].name}</strong>
                </div>
                <span>{products[0].price}</span>
              </div>
            </div>

            <div
              className={`${styles.card} ${styles.cardA}`}
              role="button"
              tabIndex={0}
              onClick={() => onPreview(1)}
              onKeyDown={cardKey(1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={products[1].image} alt={products[1].alt} />
              <div className={styles.caption}>
                <div>
                  <small>{products[1].label}</small>
                  <strong>{products[1].name}</strong>
                </div>
                <span>{products[1].price}</span>
              </div>
            </div>

            <div
              className={`${styles.card} ${styles.cardB}`}
              role="button"
              tabIndex={0}
              onClick={() => onPreview(2)}
              onKeyDown={cardKey(2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={products[2].image} alt={products[2].alt} />
              <div className={styles.caption}>
                <div>
                  <small>{products[2].label}</small>
                  <strong>{products[2].name}</strong>
                </div>
                <span>{products[2].price}</span>
              </div>
            </div>

            <div className={`${styles.chip} ${styles.chipVerified}`} aria-hidden="true">
              <span className={styles.tick}>
                <Check />
              </span>
              Verified seller
            </div>
            <div className={`${styles.chip} ${styles.chipPay}`} aria-hidden="true">
              <span className={styles.peso}>₱</span>
              Cash on Delivery
            </div>
            <div className={styles.toasts} aria-hidden="true">
              <div className={styles.toast}>
                <span className={styles.tick}>
                  <Check />
                </span>
                <div>
                  <strong>Order confirmed</strong>
                  <small>Quezon City · seller is packing</small>
                </div>
              </div>
              <div className={styles.toast}>
                <span className={styles.tick}>
                  <Check />
                </span>
                <div>
                  <strong>Out for delivery</strong>
                  <small>Davao City · rider on the way</small>
                </div>
              </div>
              <div className={styles.toast}>
                <span className={styles.tick}>
                  <Check />
                </span>
                <div>
                  <strong>Delivered</strong>
                  <small>Paid with Cash on Delivery</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <a href="#delivery-journey" className={styles.cue}>
        <span className={styles.mouse} aria-hidden="true">
          <span />
        </span>
        Scroll to follow an order in 3D
      </a>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.track}>
          {[0, 1].map((dup) => (
            <React.Fragment key={dup}>
              {MARQUEE.map((item) => (
                <span key={`${dup}-${item}`}>
                  <i />
                  {item}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
