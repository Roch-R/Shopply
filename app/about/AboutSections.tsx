import type { CSSProperties } from "react";
import Link from "next/link";
import SiteLockSeal from "@/components/SiteLockSeal";
import styles from "./sections.module.css";

const features = [
  { title: "Smart Inventory", text: "Track stock levels in real time with low-stock alerts and reorder suggestions.", color: "#9563db", tint: "#f1eafa", kind: "inventory", tag: "A PLACE FOR EVERYTHING", detail: "Organize. Track. Restock." },
  { title: "Analytics & Insights", text: "Turn your sales data into a clearer picture of your business and your next move.", color: "#5b84ce", tint: "#eaf1fc", kind: "analytics", tag: "SEE THE BIGGER PICTURE", detail: "Less guessing. More clarity." },
  { title: "Secure Access", text: "Keep account access protected while managing your shop and your everyday work.", color: "#48a690", tint: "#e8f5ef", kind: "security", tag: "PEACE OF MIND, BUILT IN", detail: "Your space. Your control." },
  { title: "Lightning Fast", text: "Move smoothly between products, orders, and your dashboard. Keep your day flowing.", color: "#d5a33e", tint: "#fcf4df", kind: "speed", tag: "KEEP YOUR MOMENTUM", detail: "Less waiting. More doing." },
  { title: "Order Management", text: "Follow every order from placement to delivery, with statuses and history together.", color: "#ce7da9", tint: "#f9eaf3", kind: "orders", tag: "EVERY STEP, CONNECTED", detail: "From your shop to their door." },
  { title: "Team Collaboration", text: "Bring your team together, assign roles, and keep everyone moving in the same direction.", color: "#7e7bd2", tint: "#eeecfc", kind: "team", tag: "BETTER, TOGETHER", detail: "One team. One shared space." },
] as const;

const steps = [
  { title: "Create your account", text: "Your next chapter starts with a simple sign-up. Make a space for your business.", label: "MAKE IT YOURS", symbol: "◉" },
  { title: "Set up your shop", text: "Add your products, set your prices, and give your storefront its own personality.", label: "BRING YOUR IDEA TO LIFE", symbol: "▦" },
  { title: "Start selling", text: "Go live, welcome your first orders, and follow every step from your dashboard.", label: "HELLO, POSSIBILITY", symbol: "↗" },
];

const team = [
  { initials: "RR", name: "Rochell Reponte", role: "Founder & CEO", bio: "Passionate about making commerce accessible for every merchant.", color: "#9563db", tint: "#eee4fa" },
  { initials: "DA", name: "Denmar Aces", role: "Head of Product", bio: "Focused on removing friction from everyday workflows.", color: "#6188cc", tint: "#e4edfa" },
  { initials: "DJ", name: "Dayoja Joemil", role: "Lead Engineer", bio: "Building the foundations that help Shopply grow with your business.", color: "#55a28e", tint: "#e2f1ea" },
];

function depthStyle(index: number, color?: string, tint?: string): CSSProperties {
  return { "--d": `${(index % 3) * 90}ms`, "--turn": index % 2 === 0 ? -1 : 1, "--accent": color, "--tint": tint } as CSSProperties;
}

function BagMark() {
  return <svg viewBox="0 0 48 56" fill="none" aria-hidden="true"><rect x="5" y="17" width="38" height="34" rx="9" stroke="currentColor" strokeWidth="3" /><path d="M15 18v-5a9 9 0 0 1 18 0v5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M14 34c4-6 7-6 11 0s7 6 11 0" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" /></svg>;
}

function FeatureObject({ kind }: { kind: typeof features[number]["kind"] }) {
  return <div className={styles.objectStage} aria-hidden="true">
    <div className={styles.objectOrbit} />
    <div className={`${styles.object} ${styles[kind]}`}>
      {kind === "inventory" && <>
        <div className={styles.inventoryBack}><span /><span /><span /></div>
        <div className={styles.inventoryFront}><div className={styles.miniBag}><BagMark /></div><div className={styles.stockLines}><i /><i /><i /></div><b>ALL IN PLACE <span>✓</span></b></div>
        <span className={styles.floatingChip}>Stock, sorted. ✓</span>
      </>}
      {kind === "analytics" && <>
        <div className={styles.chartPlate}><span>A CLEARER PICTURE</span><div className={styles.chartBars}>{[30, 48, 40, 69, 58, 92].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><small>IDEA <span>GROWTH ↗</span></small></div>
        <span className={styles.floatingChip}>Your next move ↗</span>
      </>}
      {kind === "security" && <>
        <div className={styles.securityRing} /><div className={styles.securityPlate}><div className={styles.lockHandle} /><div className={styles.lockBody}><span /></div></div><span className={styles.floatingChip}>A little peace of mind ✓</span>
      </>}
      {kind === "speed" && <>
        <div className={styles.speedPlate} /><div className={styles.boltShadow}>ϟ</div><div className={styles.bolt}>ϟ</div><div className={styles.speedLines}><i /><i /><i /></div><span className={styles.floatingChip}>Keep moving. ↗</span>
      </>}
      {kind === "orders" && <>
        <div className={styles.parcel}><div className={styles.parcelFront}><i /><span>SHOPPLY<br /><b>↗</b></span></div><div className={styles.parcelSide} /><div className={styles.parcelTop} /></div><span className={styles.floatingChip}>On its way. ✓</span>
      </>}
      {kind === "team" && <>
        <div className={styles.teamPlate}><span>ONE SHARED SPACE</span><div className={styles.miniPeople}><i>R</i><i>D</i><i>J</i></div><div className={styles.teamLine} /></div><span className={styles.floatingChip}>Better, together. ✦</span>
      </>}
    </div>
    <div className={styles.objectShadow} />
  </div>;
}

export default function AboutSections() {
  return <div className={styles.sections}>
    <section id="features" className={styles.featuresSection} aria-labelledby="features-title">
      <div className={`${styles.sectionHeading} reveal`}>
        <div><p className={styles.eyebrow}>01 / WHAT WE OFFER</p><h2 id="features-title">Everything you need.<br /><em>Room for more.</em></h2></div>
        <p className={styles.headingNote}>Six ways to simplify your everyday.<br />One workspace to bring them all together.</p>
      </div>
      <div className={styles.featureGrid}>
        {features.map((feature, index) => <div key={feature.kind} className="reveal" data-scroll3d style={depthStyle(index, feature.color, feature.tint)}>
          <article className={`${styles.featureCard} tilt`}>
            <div className={styles.cardTop}><span>{feature.tag}</span><span>0{index + 1}</span></div>
            <div className={styles.featureContent}><div className={styles.featureCopy}><h3>{feature.title}</h3><p>{feature.text}</p></div><FeatureObject kind={feature.kind} /></div>
            <div className={styles.cardBottom}><span>{feature.detail}</span><span>✦</span></div>
          </article>
        </div>)}
      </div>
    </section>

    <section className={styles.workflowSection} aria-labelledby="workflow-title">
      <div className={`${styles.workflowHeader} reveal`}><p className={styles.eyebrow}>02 / HOW IT WORKS</p><h2 id="workflow-title">From an idea.<br /><em>To your first order.</em></h2><p>Three simple steps. A whole new beginning.</p></div>
      <div className={styles.workflowLayout}>
        <div className={styles.workflowVisual} data-scroll3d aria-hidden="true"><div className={styles.workflowOrbit} /><div className={styles.workflowPlanes}>{steps.map((step, index) => <div key={step.title} className={styles.workflowPlane} style={{ "--plane": index } as CSSProperties}><div><span>0{index + 1}</span><span>SHOPPLY / YOUR JOURNEY</span></div><b>{step.symbol}</b><strong>{step.title}</strong><small>{step.label}</small></div>)}</div><span className={styles.workflowCaption}>A LITTLE MOMENTUM. A LOT OF POSSIBILITY.</span></div>
        <ol className={styles.stepList}>{steps.map((step, index) => <li key={step.title} className="reveal" data-scroll3d style={depthStyle(index)}><div className={styles.step}><span className={styles.stepNumber}>0{index + 1}</span><div><small>{step.label}</small><h3>{step.title}</h3><p>{step.text}</p></div><span className={styles.stepArrow}>↗</span></div></li>)}</ol>
      </div>
    </section>

    <section className={styles.teamSection} aria-labelledby="team-title">
      <div className={`${styles.sectionHeading} reveal`}><div><p className={styles.eyebrow}>03 / THE PEOPLE BEHIND IT</p><h2 id="team-title">Real people.<br /><em>Shared ambition.</em></h2></div><p className={styles.headingNote}>We love great products.<br />And the people who make them possible.</p></div>
      <div className={styles.teamGrid}>{team.map((person, index) => <div key={person.name} className="reveal" data-scroll3d style={depthStyle(index, person.color, person.tint)}><article className={`${styles.teamCard} tilt`}><div className={styles.personScene} aria-hidden="true"><div className={styles.personOrbit} /><div className={styles.personDisc}>{person.initials}</div><span className={styles.personSpark}>✦</span><span className={styles.personNumber}>0{index + 1}</span></div><div className={styles.personCopy}><p className={styles.role}>{person.role}</p><h3>{person.name}</h3><p>{person.bio}</p></div><div className={styles.personFooter}><span>BUILT WITH PURPOSE</span><span>↗</span></div></article></div>)}</div>
    </section>

    <section className={styles.ctaSection} aria-labelledby="cta-title" data-scroll3d>
      <div className={`${styles.ctaInside} reveal`}><div className={styles.ctaCopy}><p className={styles.eyebrow}>04 / YOUR NEXT CHAPTER</p><h2 id="cta-title">Make room<br />for <em>possibility.</em></h2><p>Everything you need to run your shop.<br />More space for what you do best.</p><Link href="/dashboard" className={styles.ctaButton}>Open your dashboard <span aria-hidden="true">↗</span></Link></div><div className={styles.ctaVisual} aria-hidden="true"><div className={styles.ctaOrbit} /><div className={styles.ctaOrbitTwo} /><div className={styles.brandSculpture}><div className={styles.brandBack} /><div className={styles.brandFront}><BagMark /><span>SHOPPLY</span></div></div><span className={styles.ctaSpark}>✦</span><span className={styles.ctaChip}>YOUR NEXT MOVE STARTS HERE ↗</span></div><div className={styles.ctaBottom}><span>LESS BUSYWORK. MORE POSSIBILITY.</span><span>ONE SPACE. ALL YOURS.</span></div></div>
    </section>
  </div>;
}

const footerLinks = [
  { title: "Product", links: [["Features", "/features"], ["Marketplace", "/shop"], ["Integrations", "/integrations"], ["Changelog", "/changelog"]] },
  { title: "Resources", links: [["Documentation", "/docs"], ["Merchant Guides", "/guides"], ["API Reference", "/api-reference"], ["Blog", "/blog"]] },
  { title: "Company", links: [["About Us", "/about"], ["Careers", "/careers"], ["Contact", "/contact"], ["Legal & Privacy", "/legal"]] },
];

export function AboutFooter() {
  return <footer className={styles.footer} data-scroll3d>
    <div className={styles.footerTop}><div className={`${styles.footerBrand} reveal`}><Link href="/" className={styles.logo}><BagMark /><span>Shopply</span></Link><p>The modern commerce workspace.<br />For your everyday. And your next big idea.</p><a href="#features" className={styles.footerExplore}>Find your next possibility <span>↑</span></a></div>{footerLinks.map((column, index) => <div key={column.title} className={`${styles.footerColumn} reveal`} style={depthStyle(index)}><h3>{column.title}</h3>{column.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>)}</div>
    <div className={styles.wordmarkWindow} aria-hidden="true"><div className={styles.wordmark}>Shopply<span>✦</span></div></div>
    <div className={styles.footerBottom}><p>© {new Date().getFullYear()} Shopply Inc.</p><SiteLockSeal size="sm" showText /><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><a href="#about-top" aria-label="Back to top">Back to top ↑</a></div></div>
  </footer>;
}
