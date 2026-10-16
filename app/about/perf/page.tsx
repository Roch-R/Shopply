"use client";

import { useEffect, useState } from "react";
import AboutExperience from "../AboutExperience";

export default function ScrollPerformanceCheck() {
  const [result, setResult] = useState("Warming up the scroll scenes…");
  useEffect(() => {
    let frame = 0, cancelled = false;
    const results: { scene: string; frames: number; fps: number; slowFrames: number; longestFrame: number }[] = [];
    let phase = 0, started = 0, previous = 0, samples: number[] = [];
    const roots = () => Array.from(document.querySelectorAll<HTMLElement>("[data-kind]"));
    function tick(now: number) {
      if (cancelled) return;
      const root = roots()[phase];
      if (!root) { frame = requestAnimationFrame(tick); return; }
      const start = root.getBoundingClientRect().top + window.scrollY - 68;
      const travel = root.offsetHeight - (window.innerHeight - 68);
      if (!started) { window.scrollTo(0, start + travel * .25); started = now; previous = now; }
      const elapsed = now - started;
      if (elapsed > 1500) {
        samples.push(now - previous);
        window.scrollTo(0, start + travel * (.25 + Math.min(1, (elapsed - 1500) / 4000) * .5));
      }
      previous = now;
      if (elapsed >= 5500) {
        const duration = samples.reduce((sum, value) => sum + value, 0);
        results.push({ scene: root.dataset.kind!, frames: samples.length, fps: Math.round(samples.length / duration * 1000), slowFrames: samples.filter(value => value > 34).length, longestFrame: Math.round(Math.max(...samples)) });
        if (++phase === 2) { setResult(JSON.stringify(results)); return; }
        started = 0; samples = [];
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, []);
  return <><div style={{ height: 68, background: "#fff" }} /><AboutExperience /><output id="scroll-performance-result" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#172236", color: "#fff", padding: 10, fontSize: 12 }}>{result}</output></>;
}
