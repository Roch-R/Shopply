"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./sections.module.css";

const team = [
  { initials: "RR", name: "Rochell Reponte", role: "Founder & CEO", bio: "Making commerce accessible for every merchant." },
  { initials: "DA", name: "Denmar Aces", role: "Head of Product", bio: "Removing friction from everyday workflows." },
  { initials: "DJ", name: "Dayoja Joemil", role: "Lead Engineer", bio: "Building a space that grows with your ideas." },
];
export default function AboutSections() {
  return <div className={styles.sections}>
    <section id="features" className={styles.mission} aria-labelledby="mission-title">
      <p className={styles.eyebrow}>THE IDEA BEHIND SHOPPLY</p>
      <div className={styles.missionHeading}><h2 id="mission-title">Made for the everyday.<br /><em>Built for your next big idea.</em></h2><p>We believe commerce should feel a little more human. Shopply brings shopping, selling, and the people behind it all into one shared space.</p></div>
      <div className={styles.values}>{[
        ["01", "Discover something good.", "From everyday essentials to your next favourite find, explore a shop full of possibilities.", "↗"],
        ["02", "Make something yours.", "A new product. A new shop. A fresh start. Give your ideas a place to grow.", "✳"],
        ["03", "Connect with people.", "Behind every shop and every order is a person. That's where our story begins.", "↔"],
      ].map(([number, title, copy, icon]) => <article key={number}><div><span>{number}</span><b aria-hidden="true">{icon}</b></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className={styles.team} aria-labelledby="team-title"><div className={styles.teamHeading}><p className={styles.eyebrow}>THE PEOPLE BEHIND THE POSSIBILITY</p><h2 id="team-title">A small team.<br /><em>A shared belief.</em></h2></div><div className={styles.teamGrid}>{team.map(person => <article key={person.name}><span className={styles.avatar}>{person.initials}<i aria-hidden="true">↗</i></span><p className={styles.role}>{person.role}</p><h3>{person.name}</h3><p>{person.bio}</p></article>)}</div></section>
    <div className={styles.closing}><span aria-hidden="true">✳</span><p>Big journeys start with little steps.<br /><strong>Let&apos;s take the next one together.</strong></p><span aria-hidden="true">↓</span></div>
  </div>;
}

export function AboutFooter({ onLoginClick }: { onLoginClick?: () => void } = {}) {
  const footerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const footer = footerRef.current;
    const main = footer?.parentElement?.querySelector<HTMLElement>("[data-curtain-main]");
    const content = footer?.querySelector<HTMLElement>("[data-footer-content]");
    const button = footer?.querySelector<HTMLElement>("[data-footer-button]");
    if (!footer || !main || !content || !button) return;
    footer.inert = main.getBoundingClientRect().bottom >= window.innerHeight;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: main,
          start: "bottom 100%",
          end: () => `bottom ${100 - (footer.offsetHeight / window.innerHeight) * 100}%`,
          scrub: 0.5,
          onUpdate: trigger => {
            footer.inert = trigger.progress <= 0;
          },
          onRefresh: trigger => {
            footer.inert = trigger.progress <= 0;
          },
        },
      });
      timeline
        .fromTo(content, { yPercent: 24, scale: 0.88, opacity: 0.3 }, { yPercent: 0, scale: 1, opacity: 1, duration: 1 }, 0)
        .fromTo(button, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, 0.6);
    }, footer);
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(footer);
    return () => {
      observer.disconnect();
      context.revert();
      footer.inert = false;
    };
  }, []);
  return <footer ref={footerRef} id="next-chapter" className={styles.footer} inert>
    <div className={styles.footerContent} data-footer-content><div className={styles.footerTop}><Link href="/" className={styles.logo}>shopply<span>↗</span></Link><span>YOUR NEXT CHAPTER STARTS HERE</span></div><div className={styles.footerHero}><div><p className={styles.eyebrow}>A WORLD OF POSSIBILITY IS WAITING</p><h2>Good finds.<br />Great beginnings.</h2><a href="/login" onClick={e => { if (onLoginClick) { e.preventDefault(); onLoginClick(); } }} className={styles.footerButton} data-footer-button>Find your next favourite <span aria-hidden="true">↗</span></a></div><div className={styles.footerArt} aria-hidden="true"><div className={styles.bagHandle} /><div className={styles.bag}>s<span>↗</span></div><i>✳</i></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} Shopply</span><div><Link href="/contact">Get in touch</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#about-top">Back to top ↑</a></div><span>MADE FOR WHAT&apos;S NEXT.</span></div></div>
  </footer>;
}
