"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";

interface ModeConfig {
  id: string;
  label: string;
  tag: string;
  title: string;
  desc: string;
  color: number;
  hex: string;
  badge: string;
}

const MODES: ModeConfig[] = [
  {
    id: "studio",
    label: "3D Studio Audio",
    tag: "FEATURED 3D ACOUSTICS",
    title: "Studio Pro ANC Wireless",
    desc: "Interactive 3D exploded acoustic chamber with 40mm beryllium drivers, dual noise-cancelling mics, and ultra-plush memory foam seals.",
    color: 0x10b981,
    hex: "#10B981",
    badge: "Active 3D Spatial Audio",
  },
  {
    id: "kinetic",
    label: "3D AeroPulse Runner",
    tag: "LIGHTWEIGHT KINETICS",
    title: "AeroSwift Carbon Runner",
    desc: "180g responsive carbon-plate geometry with zoned engineered mesh and dynamic energy-return cushioning built for fast miles.",
    color: 0x06b6d4,
    hex: "#06B6D4",
    badge: "Dynamic Kinetic Plate",
  },
  {
    id: "orbit",
    label: "3D Logistics Network",
    tag: "NATIONWIDE TELEMETRY",
    title: "Philippine Express Orbit",
    desc: "Sub-2 hour sortation hubs connecting Luzon, Visayas, and Mindanao with tracked express dispatch and direct seller chat.",
    color: 0x8b5cf6,
    hex: "#8B5CF6",
    badge: "Real-Time 3D Cargo Arcs",
  },
];

export default function Storefront3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  const activeMode = MODES[activeModeIndex];

  useEffect(() => {
    const host = canvasHostRef.current;
    const container = containerRef.current;
    if (!host || !container) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let animId: number;
    let disposed = false;

    // Check WebGL support
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // Scene & Camera setup
    scene = new THREE.Scene();
    const width = host.clientWidth || 500;
    const height = host.clientHeight || 420;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      host.innerHTML = "";
      host.appendChild(renderer.domElement);
    } catch {
      setWebglSupported(false);
      return;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 5, 6);
    const modeLight = new THREE.PointLight(activeMode.color, 3.5, 15);
    modeLight.position.set(-3, -2, 4);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(0, -4, -3);

    scene.add(ambientLight, keyLight, modeLight, rimLight);

    // 3D Objects Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Central Metallic Torus Knot
    const centralGeo = new THREE.TorusKnotGeometry(1.25, 0.38, 120, 24, 2, 3);
    const centralMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.88,
      roughness: 0.18,
      wireframe: false,
    });
    const centralMesh = new THREE.Mesh(centralGeo, centralMat);
    rootGroup.add(centralMesh);

    // 2. Outer Concentric Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(2.35, 0.032, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: activeMode.color,
      emissive: activeMode.color,
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    rootGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.7, 0.024, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    rootGroup.add(ring2);

    // 3. Floating 3D Star/Data Particles
    const particleCount = 120;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 2.4 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: activeMode.color,
      size: 0.065,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // Mouse & Scroll Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let dragVelocity = { x: 0, y: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        dragVelocity.x = deltaX * 0.008;
        dragVelocity.y = deltaY * 0.008;
        targetRotY += dragVelocity.x;
        targetRotX += dragVelocity.y;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    host.addEventListener("mousemove", handlePointerMove);
    host.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // Scroll interpolation
    let scrollProgress = 0;
    const handleScroll = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const viewH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (viewH - rect.top) / (viewH + rect.height)));
      scrollProgress = progress;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Resize Handler
    const handleResize = () => {
      if (!host || !renderer || !camera) return;
      const w = host.clientWidth || 500;
      const h = host.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      if (disposed) return;
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Inertia decay
      if (!isDragging) {
        dragVelocity.x *= 0.94;
        dragVelocity.y *= 0.94;
        targetRotY += dragVelocity.x;
        targetRotX += dragVelocity.y;
      }

      // Continuous ambient rotation + scroll reactivity
      const scrollRotation = (scrollProgress - 0.5) * Math.PI * 1.5;
      targetRotY += delta * 0.45;

      // Smooth interpolation (lerp)
      rootGroup.rotation.y += (targetRotY + mouseX * 0.4 - rootGroup.rotation.y) * 0.08;
      rootGroup.rotation.x += (targetRotX + scrollRotation * 0.35 - mouseY * 0.3 - rootGroup.rotation.x) * 0.08;

      // Secondary ring orbits
      ring1.rotation.z += delta * 0.35;
      ring2.rotation.z -= delta * 0.28;

      // Subtle breathing scale
      const pulse = 1 + Math.sin(time * 1.8) * 0.035;
      centralMesh.scale.set(pulse, pulse, pulse);

      // Particle constellation rotation
      particleSystem.rotation.y -= delta * 0.15;
      particleSystem.rotation.x += delta * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      host.removeEventListener("mousemove", handlePointerMove);
      host.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      // Clean up WebGL resources
      centralGeo.dispose();
      centralMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [activeMode]);

  return (
    <section className="sf-3d-section" ref={containerRef} id="3d-studio">
      <style suppressHydrationWarning>{`
        .sf-3d-section {
          background: #0B0F19;
          color: #FFFFFF;
          padding: 80px 0 88px;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #1E293B;
          border-bottom: 1px solid #1E293B;
        }
        .sf-3d-bg-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.06) 45%, transparent 70%);
          pointer-events: none;
          filter: blur(40px);
        }
        .sf-3d-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 2;
        }
        .sf-3d-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34D399;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
        .sf-3d-badge-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
          animation: sfPulse 2s infinite;
        }
        @keyframes sfPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        .sf-3d-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(32px, 3.8vw, 46px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 18px;
          color: #FFFFFF;
        }
        .sf-3d-title-gradient {
          background: linear-gradient(135deg, #FFFFFF 30%, #34D399 70%, #06B6D4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sf-3d-desc {
          font-size: 16px;
          line-height: 1.65;
          color: #94A3B8;
          margin-bottom: 28px;
          max-width: 520px;
        }
        .sf-3d-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 32px;
        }
        .sf-3d-tab {
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(51, 65, 85, 0.8);
          color: #CBD5E1;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sf-3d-tab:hover {
          background: rgba(51, 65, 85, 0.9);
          color: #FFFFFF;
          border-color: #64748B;
        }
        .sf-3d-tab.active {
          background: #FFFFFF;
          color: #0F172A;
          border-color: #FFFFFF;
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
        }
        .sf-3d-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .sf-3d-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 48px;
          padding: 0 24px;
          border-radius: 10px;
          background: #10B981;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }
        .sf-3d-btn-primary:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(16, 185, 129, 0.45);
        }
        .sf-3d-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px;
          padding: 0 20px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .sf-3d-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.45);
          transform: translateY(-2px);
        }
        .sf-3d-stage-wrapper {
          position: relative;
          background: radial-gradient(circle at center, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(51, 65, 85, 0.7);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.12);
        }
        .sf-3d-canvas-host {
          width: 100%;
          height: 440px;
          cursor: grab;
          border-radius: 14px;
          overflow: hidden;
        }
        .sf-3d-canvas-host:active {
          cursor: grabbing;
        }
        .sf-3d-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94A3B8;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
          pointer-events: none;
        }
        .sf-3d-mode-pill {
          position: absolute;
          top: 24px;
          right: 24px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #E2E8F0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        @media (max-width: 1024px) {
          .sf-3d-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .sf-3d-canvas-host {
            height: 360px;
          }
        }
      `}</style>

      <div className="sf-3d-bg-glow" />

      <div className="sf-container">
        <div className="sf-3d-grid">
          <div>
            <div className="sf-3d-badge">
              <span className="sf-3d-badge-pulse" />
              <span>Real-Time 3D Interactive Canvas</span>
            </div>

            <h2 className="sf-3d-title">
              Interactive 3D scrolling that puts you in the{" "}
              <span className="sf-3d-title-gradient">driver&apos;s seat.</span>
            </h2>

            <p className="sf-3d-desc">
              Experience the next generation of online retail. Spin, inspect, and glide through live 3D product geometry and nationwide logistics telemetry in real-time space.
            </p>

            <div className="sf-3d-tabs">
              {MODES.map((mode, idx) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`sf-3d-tab${activeModeIndex === idx ? " active" : ""}`}
                  onClick={() => setActiveModeIndex(idx)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="sf-3d-actions">
              <Link href="/experience" className="sf-3d-btn-primary">
                <span>Launch Full 3D Studio</span>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a href="#catalog" className="sf-3d-btn-ghost">
                Browse Marketplace Listings
              </a>
            </div>
          </div>

          <div className="sf-3d-stage-wrapper">
            <div
              className="sf-3d-canvas-host"
              ref={canvasHostRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />
            <div className="sf-3d-mode-pill" style={{ color: activeMode.hex }}>
              {activeMode.badge}
            </div>
            <div className="sf-3d-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12a4 4 0 0 1 8 0" />
              </svg>
              <span>Scroll page or drag to rotate 3D</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
