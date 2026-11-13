"use client";

import React from "react";
import styles from "./DepartmentBento.module.css";

export interface BentoDepartment {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  image: string;
  /** Listings currently shown for this department. */
  count: number;
}

interface DepartmentBentoProps {
  departments: BentoDepartment[];
  onSelect: (id: string) => void;
  /** Link shown beside the heading (e.g. "Explore full marketplace"). */
  action?: React.ReactNode;
}

export default function DepartmentBento({ departments, onSelect, action }: DepartmentBentoProps) {
  // Spotlight follows the cursor inside whichever tile it is over.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    tile.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    tile.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <section className={styles.section} id="departments" aria-labelledby="departments-title">
      <div className={styles.container}>
        <div className={`${styles.head} sf-scroll-reveal sf-reveal-fade-up`}>
          <div>
            <p className={styles.eyebrow}>Departments</p>
            <h2 id="departments-title">Shop by department</h2>
            <p className={styles.lead}>Browse curated categories from independent stores and brand partners.</p>
          </div>
          {action}
        </div>

        <div className={styles.bento} onPointerMove={onPointerMove}>
          {departments.map((dept, index) => (
            <div
              key={dept.id}
              className={`${styles.cell} sf-scroll-reveal sf-reveal-card`}
              style={{ "--stagger": index } as React.CSSProperties}
            >
              <button type="button" className={styles.tile} data-tile onClick={() => onSelect(dept.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dept.image} alt="" loading="lazy" />
                <span className={styles.shade} aria-hidden="true" />
                <span className={styles.spot} aria-hidden="true" />
                {dept.count > 0 && (
                  <span className={styles.count}>
                    {dept.count} {dept.count === 1 ? "listing" : "listings"}
                  </span>
                )}
                <span className={styles.body}>
                  <span className={styles.icon} aria-hidden="true">
                    {dept.icon}
                  </span>
                  <span className={styles.text}>
                    <strong>{dept.title}</strong>
                    <span>{dept.subtitle}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="8 7 17 7 17 16" />
                    </svg>
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
