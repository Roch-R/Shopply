import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const BLUE = "#0A6CFF",
  BLUE_DARK = "#0050C8",
  BLUE_SOFT = "#E7F0FF",
  INK = "#0F172A",
  MUTED = "#64748B",
  BG_LINE = "#E2E8F0",
  BG_BAR = "#CBD5E1",
  BG_BAR2 = "#F1F5F9";
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export type SceneKind = "laptop" | "rail";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Held smootherstep keyframes
const kf = (p: number, a: number[], h = 0.035) => {
  const x = clamp01(p) * (a.length - 1);
  const i = Math.min(a.length - 2, Math.floor(x));
  const t = clamp01((x - i - h) / (1 - 2 * h));
  return a[i] + (a[i + 1] - a[i]) * (t * t * t * (t * (t * 6 - 15) + 10));
};

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 14) {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, bw: number, bh: number, c: string) {
  rr(g, x, y, bw, bh, bh / 2);
  g.fillStyle = c;
  g.fill();
}

function txt(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  font: string,
  c: string,
  al?: CanvasTextAlign
) {
  g.font = font;
  g.fillStyle = c;
  g.textAlign = al || "left";
  g.textBaseline = "alphabetic";
  g.fillText(s, x, y);
}

class Resources {
  canvases: HTMLCanvasElement[] = [];
  textures = new Set<THREE.Texture>();
  canvas(w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    this.canvases.push(c);
    return c;
  }
  texture(c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.add(t);
    return t;
  }
  dispose(scene: THREE.Scene) {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
      }
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    this.textures.forEach(t => t.dispose());
    this.canvases.forEach(c => {
      c.width = 0;
      c.height = 0;
    });
    scene.clear();
  }
}

function dashboard(resources: Resources) {
  const c = resources.canvas(1440, 900),
    g = c.getContext("2d")!;
  g.setTransform(2.25, 0, 0, 2.25, 0, 0);
  g.clearRect(0, 0, 640, 400);

  const bgGrad = g.createLinearGradient(0, 0, 640, 400);
  bgGrad.addColorStop(0, "#F8FAFF");
  bgGrad.addColorStop(1, "#EEF4FF");
  g.fillStyle = bgGrad;
  g.fillRect(0, 0, 640, 400);

  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, 640, 30);
  g.fillStyle = BG_LINE;
  g.fillRect(0, 29.5, 640, 1);

  [
    ["#FF5F56", 16],
    ["#FFBD2E", 28],
    ["#27C93F", 40],
  ].forEach(([col, cx]) => {
    g.beginPath();
    g.arc(cx as number, 15, 4.2, 0, Math.PI * 2);
    g.fillStyle = col as string;
    g.fill();
  });

  rr(g, 190, 6, 260, 18, 9);
  g.fillStyle = "#F1F5F9";
  g.fill();
  txt(g, "shopply.site / studio-overview", 320, 18.5, "600 9.5px " + FONT, MUTED, "center");

  rr(g, 548, 6, 78, 18, 9);
  g.fillStyle = "#DCFCE7";
  g.fill();
  g.beginPath();
  g.arc(559, 15, 3, 0, Math.PI * 2);
  g.fillStyle = "#16A34A";
  g.fill();
  txt(g, "LIVE SYNC", 567, 18.5, "700 8.5px " + FONT, "#15803D");

  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 30, 132, 370);
  g.fillStyle = BG_LINE;
  g.fillRect(131, 30, 1, 370);

  const logoGrad = g.createLinearGradient(16, 44, 42, 70);
  logoGrad.addColorStop(0, "#38BDF8");
  logoGrad.addColorStop(1, BLUE);
  rr(g, 16, 44, 26, 26, 8);
  g.fillStyle = logoGrad;
  g.fill();
  g.strokeStyle = "#fff";
  g.lineWidth = 2.2;
  g.lineCap = "round";
  g.beginPath();
  g.arc(29, 54, 4.2, Math.PI, 0);
  g.stroke();
  g.strokeRect(24, 54, 10, 8.5);

  txt(g, "Shopply", 50, 62, "700 16px " + FONT, INK);

  ["Overview", "Products", "Orders", "Customers", "Analytics", "Settings"].forEach((s, i) => {
    const y = 90 + i * 33;
    if (i === 0) {
      rr(g, 10, y - 16, 112, 26, 8);
      g.fillStyle = BLUE_SOFT;
      g.fill();
    }
    txt(g, s, 22, y + 1, "600 11.5px " + FONT, i === 0 ? BLUE_DARK : MUTED);
  });

  rr(g, 12, 326, 108, 60, 12);
  const sideGrad = g.createLinearGradient(12, 326, 120, 386);
  sideGrad.addColorStop(0, "#0A6CFF");
  sideGrad.addColorStop(1, "#4F46E5");
  g.fillStyle = sideGrad;
  g.fill();
  txt(g, "Shopply Pro", 22, 346, "700 11px " + FONT, "#fff");
  txt(g, "99.9% Uptime", 22, 361, "500 9px " + FONT, "rgba(255,255,255,0.8)");
  bar(g, 22, 370, 84, 5, "rgba(255,255,255,0.28)");
  bar(g, 22, 370, 68, 5, "#fff");

  txt(g, "Storefront Command", 152, 64, "700 22px " + FONT, INK);
  txt(g, "Real-time commerce telemetry, live orders & inventory velocity.", 152, 81, "500 11px " + FONT, MUTED);

  rr(g, 522, 46, 98, 28, 10);
  g.fillStyle = BLUE;
  g.fill();
  txt(g, "+ New Product", 571, 64, "600 10.5px " + FONT, "#fff", "center");

  const kpis: [string, string, string, string][] = [
    ["Gross Revenue", "PHP 48.2k", "+18.4%", "#0A6CFF"],
    ["Active Orders", "1,284", "+24.1%", "#6366F1"],
    ["Store Visitors", "9,640", "+12.8%", "#0EA5E9"],
  ];
  kpis.forEach(([label, val, delta, accent], i) => {
    const x = 152 + i * 158;
    rr(g, x, 96, 148, 84, 14);
    g.fillStyle = "#fff";
    g.fill();
    g.strokeStyle = BG_LINE;
    g.lineWidth = 1.2;
    g.stroke();

    txt(g, label, x + 14, 118, "600 10.5px " + FONT, MUTED);
    rr(g, x + 94, 106, 42, 16, 8);
    g.fillStyle = "#DCFCE7";
    g.fill();
    txt(g, delta, x + 115, 117, "700 8.5px " + FONT, "#15803D", "center");

    txt(g, val, x + 14, 150, "700 22px " + FONT, INK);

    bar(g, x + 14, 164, 120, 4, BG_BAR2);
    bar(g, x + 14, 164, 82 + i * 12, 4, accent);
  });

  rr(g, 152, 194, 316, 190, 16);
  g.fillStyle = "#fff";
  g.fill();
  g.strokeStyle = BG_LINE;
  g.lineWidth = 1.2;
  g.stroke();

  txt(g, "Revenue & Order Velocity", 170, 218, "700 12.5px " + FONT, INK);
  txt(g, "MON              WED              FRI              SUN", 170, 368, "600 9px " + FONT, MUTED);

  const hs = [0.38, 0.52, 0.46, 0.68, 0.61, 0.54, 0.78, 0.7, 0.86, 0.79, 0.94, 1.0];
  hs.forEach((v, i) => {
    const bx = 170 + i * 24;
    const bh = v * 110;
    const by = 350 - bh;
    rr(g, bx, by, 15, bh, 5);
    if (i >= 9) {
      const bGrad = g.createLinearGradient(0, by, 0, 350);
      bGrad.addColorStop(0, "#0A6CFF");
      bGrad.addColorStop(1, "#60A5FA");
      g.fillStyle = bGrad;
    } else {
      g.fillStyle = "#E2E8F0";
    }
    g.fill();
  });

  g.beginPath();
  hs.forEach((v, i) => {
    const lx = 177.5 + i * 24;
    const ly = 345 - v * 106;
    if (i === 0) g.moveTo(lx, ly);
    else g.lineTo(lx, ly);
  });
  g.strokeStyle = "#0050C8";
  g.lineWidth = 2.2;
  g.stroke();

  rr(g, 480, 194, 140, 190, 16);
  g.fillStyle = "#fff";
  g.fill();
  g.strokeStyle = BG_LINE;
  g.lineWidth = 1.2;
  g.stroke();

  txt(g, "Live Dispatch", 494, 218, "700 12px " + FONT, INK);
  const feed = [
    ["#SP-2049", "PHP 2,490", "#0A6CFF"],
    ["#SP-2048", "PHP 1,280", "#10B981"],
    ["#SP-2047", "PHP 4,120", "#6366F1"],
    ["#SP-2046", "PHP 890", "#F59E0B"],
  ];
  feed.forEach(([id, amt, dotCol], i) => {
    const fy = 234 + i * 36;
    rr(g, 490, fy, 120, 28, 8);
    g.fillStyle = "#F8FAFC";
    g.fill();
    g.beginPath();
    g.arc(501, fy + 14, 3.5, 0, Math.PI * 2);
    g.fillStyle = dotCol;
    g.fill();
    txt(g, id, 510, fy + 13, "700 9.5px " + FONT, INK);
    txt(g, amt, 510, fy + 23, "600 8.5px " + FONT, MUTED);
  });

  return resources.texture(c);
}

function drawImageCard(
  resources: Resources,
  imagePath: string,
  badgeText: string,
  priceText: string,
  titleText: string,
  subtitleText: string,
  fallbackColors: [string, string, string]
) {
  const c = resources.canvas(640, 448),
    g = c.getContext("2d")!;
  const t = resources.texture(c);

  const renderCard = (imgObj?: HTMLImageElement) => {
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, 320, 224);

    rr(g, 4, 4, 312, 216, 22);
    g.fillStyle = "#ffffff";
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = BG_LINE;
    g.stroke();

    g.save();
    rr(g, 4, 4, 312, 146, 22);
    g.clip();

    if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
      const scale = Math.max(312 / imgObj.naturalWidth, 146 / imgObj.naturalHeight);
      const dw = imgObj.naturalWidth * scale;
      const dh = imgObj.naturalHeight * scale;
      const dx = 4 + (312 - dw) / 2;
      const dy = 4 + (146 - dh) / 2;
      g.drawImage(imgObj, dx, dy, dw, dh);

      const shadowGrad = g.createLinearGradient(0, 86, 0, 150);
      shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
      shadowGrad.addColorStop(1, "rgba(15,23,42,0.38)");
      g.fillStyle = shadowGrad;
      g.fillRect(4, 86, 312, 64);
    } else {
      const gr = g.createLinearGradient(0, 4, 312, 150);
      gr.addColorStop(0, fallbackColors[0]);
      gr.addColorStop(0.5, fallbackColors[1]);
      gr.addColorStop(1, fallbackColors[2]);
      g.fillStyle = gr;
      g.fillRect(4, 4, 312, 146);

      const sun = g.createRadialGradient(235, 55, 4, 235, 55, 48);
      sun.addColorStop(0, "rgba(255,255,255,0.92)");
      sun.addColorStop(0.4, "rgba(255,245,210,0.55)");
      sun.addColorStop(1, "rgba(255,200,100,0)");
      g.fillStyle = sun;
      g.beginPath();
      g.arc(235, 55, 48, 0, Math.PI * 2);
      g.fill();
    }

    rr(g, 16, 16, 128, 24, 12);
    g.fillStyle = "rgba(15, 23, 42, 0.78)";
    g.fill();
    txt(g, badgeText, 26, 31.5, "700 9px " + FONT, "#fff");

    g.restore();

    rr(g, 212, 166, 90, 26, 9);
    g.fillStyle = BLUE_SOFT;
    g.fill();
    txt(g, priceText, 257, 183, "700 11px " + FONT, BLUE_DARK, "center");

    txt(g, titleText, 20, 180, "700 15.5px " + FONT, INK);
    txt(g, subtitleText, 20, 200, "500 11.5px " + FONT, MUTED);
  };

  renderCard();

  if (typeof window !== "undefined") {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      renderCard(img);
      t.needsUpdate = true;
    };
    img.src = imagePath;
  }

  return t;
}

// 24 Unique Bespoke Showcase & Telemetry Cards (kinds 10..33) so NO two cards ever repeat!
interface BespokeCardSpec {
  badge: string;
  metric: string;
  title: string;
  sub: string;
  colors: [string, string, string];
  motif: "sneaker" | "watch" | "keys" | "lens" | "serum" | "espresso" | "drone" | "radar" | "hub" | "wave" | "air" | "globe" | "robot" | "eco" | "faceid" | "ar" | "live" | "shield" | "split" | "coins" | "ai" | "bundle" | "flash" | "stars";
}

const BESPOKE_CARDS: BespokeCardSpec[] = [
  // Rail Scene Unique Cards (10..17)
  {
    badge: "★ 4.97 • FOOTWEAR DROP",
    metric: "PHP 3,890",
    title: "AeroPulse Carbon Runners",
    sub: "Ultra-light 180g marathon sole • Verified Auth",
    colors: ["#FF512F", "#F09819", "#7C2D12"],
    motif: "sneaker",
  },
  {
    badge: "⌚ TITANIUM SERIES",
    metric: "PHP 5,490",
    title: "Chronos Smart Watch S10",
    sub: "Sapphire crystal display • 7-day battery telemetry",
    colors: ["#0F172A", "#0284C7", "#38BDF8"],
    motif: "watch",
  },
  {
    badge: "⌨ CUSTOM MECHANICAL",
    metric: "PHP 4,250",
    title: "Kuro 75% Gasket Keyboard",
    sub: "CNC aluminum body • Hot-swap tactile switches",
    colors: ["#311042", "#6366F1", "#EC4899"],
    motif: "keys",
  },
  {
    badge: "📷 PRO OPTICS LAB",
    metric: "PHP 28,900",
    title: "Lumix f/1.4 Mirrorless Kit",
    sub: "Full-frame 4K60 sensor • Weather-sealed body",
    colors: ["#111827", "#374151", "#0EA5E9"],
    motif: "lens",
  },
  {
    badge: "✦ CLEAN SKINCARE",
    metric: "PHP 1,190",
    title: "Botanica Jeju Glow Serum",
    sub: "Pure niacinamide + centella • Dermatologist tested",
    colors: ["#064E3B", "#10B981", "#A7F3D0"],
    motif: "serum",
  },
  {
    badge: "☕ HOME BARISTA",
    metric: "PHP 12,400",
    title: "CremaPro 15-Bar Espresso",
    sub: "PID temperature control & commercial steam wand",
    colors: ["#451A03", "#B45309", "#FBBF24"],
    motif: "espresso",
  },
  {
    badge: "🛸 AERIAL CINEMA",
    metric: "PHP 16,800",
    title: "Nova 4K Tri-Sensor Drone",
    sub: "Omnidirectional obstacle radar • 45-min flight",
    colors: ["#090D16", "#1E3A8A", "#06B6D4"],
    motif: "drone",
  },
  {
    badge: "📍 LIVE RIDER RADAR",
    metric: "8 MIN ETA",
    title: "HyperSpeed Express Courier",
    sub: "Rider Marco D. is 1.4km away • Live GPS telemetry",
    colors: ["#0F172A", "#0A6CFF", "#22C55E"],
    motif: "radar",
  },
  // Globe Scene Unique Cards (18..23)
  {
    badge: "⚡ LUZON MEGA-HUB",
    metric: "18.4k / DAY",
    title: "Manila & Clark Sortation",
    sub: "Automated optical dispatch • 99.7% same-day exit",
    colors: ["#003580", "#0A6CFF", "#38BDF8"],
    motif: "hub",
  },
  {
    badge: "🌊 VISAYAS EXPRESS",
    metric: "4.2H TRANSIT",
    title: "Cebu • Iloilo • Bacolod",
    sub: "High-frequency air & sea cargo bridge active",
    colors: ["#0C4A6E", "#0284C7", "#7DD3FC"],
    motif: "wave",
  },
  {
    badge: "✈ MINDANAO AIR LINK",
    metric: "+52% GROWTH",
    title: "Davao & CDO Priority Cargo",
    sub: "Direct night-flight freighter • Door-to-door cold chain",
    colors: ["#1E1B4B", "#4F46E5", "#818CF8"],
    motif: "air",
  },
  {
    badge: "🌏 ASEAN GATEWAY",
    metric: "0% FX MARKUP",
    title: "Cross-Border Direct Drops",
    sub: "Tokyo, Seoul & Singapore boutiques cleared instantly",
    colors: ["#0F172A", "#3B82F6", "#A855F7"],
    motif: "globe",
  },
  {
    badge: "🤖 SMART WAREHOUSE",
    metric: "1,200 / HR",
    title: "Autonomous Fulfill Grid #04",
    sub: "Zero-error barcode verify & thermal weight check",
    colors: ["#18181B", "#2563EB", "#60A5FA"],
    motif: "robot",
  },
  {
    badge: "🌱 GREEN EV FLEET",
    metric: "-12.4T CO₂",
    title: "84% Electric Last-Mile",
    sub: "Solar-charged EV vans & e-bikes across Metro hubs",
    colors: ["#064E3B", "#059669", "#34D399"],
    motif: "eco",
  },
  // Vault Scene Unique Cards (24..29)
  {
    badge: "🔐 PASSKEY BIO-AUTH",
    metric: "0.2S VERIFY",
    title: "One-Tap FaceID Checkout",
    sub: "Hardware-backed cryptographic payment approval",
    colors: ["#090D16", "#0A6CFF", "#38BDF8"],
    motif: "faceid",
  },
  {
    badge: "🕶 60FPS SPATIAL AR",
    metric: "TRUE SCALE",
    title: "AR Room & Fit Try-On",
    sub: "Preview sneakers, watches & decor in your space",
    colors: ["#2E1065", "#7C3AED", "#38BDF8"],
    motif: "ar",
  },
  {
    badge: "🔴 14.2K WATCHING",
    metric: "+320 / MIN",
    title: "Shopply Live Drop Studio",
    sub: "Interactive HD creator stream with instant cart pin",
    colors: ["#7F1D1D", "#EF4444", "#F97316"],
    motif: "live",
  },
  {
    badge: "🛡 ESCROW PROTECTION",
    metric: "100% COVERED",
    title: "Shopply Authentic Shield",
    sub: "Funds held safely in vault until parcel is inspected",
    colors: ["#0F172A", "#0369A1", "#38BDF8"],
    motif: "shield",
  },
  {
    badge: "💳 0% SPLIT INSTALLMENT",
    metric: "4x PHP 622",
    title: "Flexible Pay-in-4 Engine",
    sub: "Zero interest, zero hidden fees, instant approval",
    colors: ["#1E1B4B", "#6366F1", "#EC4899"],
    motif: "split",
  },
  {
    badge: "🪙 REWARDS VAULT",
    metric: "4,850 COINS",
    title: "Instant Cashback Treasury",
    sub: "Earn 5% back on every verified drop • No expiry",
    colors: ["#422006", "#D97706", "#FDE047"],
    motif: "coins",
  },
  // Helix Scene Unique Cards (30..33)
  {
    badge: "✨ AI STUDIO ENGINE",
    metric: "1-CLICK PRO",
    title: "Neural Product Backdrop",
    sub: "Transforms raw phone snaps into studio lighting",
    colors: ["#1E1B4B", "#0A6CFF", "#22D3EE"],
    motif: "ai",
  },
  {
    badge: "📦 SMART BUNDLER",
    metric: "+34% AOV",
    title: "Dynamic Kit Recommender",
    sub: "Pairs compatible gear with automatic tiered discounts",
    colors: ["#0F172A", "#4F46E5", "#38BDF8"],
    motif: "bundle",
  },
  {
    badge: "🔥 11.11 MEGA DROP",
    metric: "92% CLAIMED",
    title: "Automated Flash Queue",
    sub: "Zero-crash high-concurrency checkout protection",
    colors: ["#7C2D12", "#EA580C", "#FACC15"],
    motif: "flash",
  },
  {
    badge: "🎬 VERIFIED UNBOXINGS",
    metric: "28.4K VIDEOS",
    title: "Real Buyer Video Wall",
    sub: "4.96★ community ratings with authentic media proof",
    colors: ["#064E3B", "#0EA5E9", "#38BDF8"],
    motif: "stars",
  },
];

function drawBespokeCard(resources: Resources, spec: BespokeCardSpec) {
  const c = resources.canvas(640, 448),
    g = c.getContext("2d")!;
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.clearRect(0, 0, 320, 224);

  rr(g, 4, 4, 312, 216, 22);
  g.fillStyle = "#ffffff";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = BG_LINE;
  g.stroke();

  g.save();
  rr(g, 4, 4, 312, 146, 22);
  g.clip();

  const gr = g.createLinearGradient(4, 4, 316, 150);
  gr.addColorStop(0, spec.colors[0]);
  gr.addColorStop(0.55, spec.colors[1]);
  gr.addColorStop(1, spec.colors[2]);
  g.fillStyle = gr;
  g.fillRect(4, 4, 312, 146);

  // Subtle ambient grid lines in banner
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 1;
  for (let x = 40; x < 310; x += 36) {
    g.beginPath();
    g.moveTo(x, 4);
    g.lineTo(x, 150);
    g.stroke();
  }
  for (let y = 32; y < 150; y += 28) {
    g.beginPath();
    g.moveTo(4, y);
    g.lineTo(316, y);
    g.stroke();
  }

  // Soft radial highlight on right side of banner
  const glow = g.createRadialGradient(232, 76, 4, 232, 76, 68);
  glow.addColorStop(0, "rgba(255,255,255,0.38)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.beginPath();
  g.arc(232, 76, 68, 0, Math.PI * 2);
  g.fill();

  // Custom Vector Motif Illustration per card!
  g.save();
  g.strokeStyle = "#ffffff";
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.lineWidth = 2.6;
  g.lineCap = "round";
  g.lineJoin = "round";

  const m = spec.motif;
  if (m === "sneaker") {
    // Sleek sneaker silhouette & speed lines
    rr(g, 168, 86, 118, 22, 11);
    g.fill();
    g.beginPath();
    g.moveTo(176, 86);
    g.lineTo(198, 52);
    g.lineTo(234, 62);
    g.lineTo(278, 82);
    g.closePath();
    g.fillStyle = "rgba(255,255,255,0.28)";
    g.fill();
    g.stroke();
    bar(g, 42, 72, 86, 6, "rgba(255,255,255,0.45)");
    bar(g, 26, 88, 102, 6, "rgba(255,255,255,0.75)");
  } else if (m === "watch") {
    // Concentric activity rings & watch crown
    [38, 28, 18].forEach((rad, idx) => {
      g.beginPath();
      g.arc(232, 78, rad, -Math.PI * 0.5, Math.PI * (0.9 - idx * 0.25));
      g.lineWidth = 5.5;
      g.strokeStyle = idx === 0 ? "#38BDF8" : idx === 1 ? "#4ADE80" : "#F43F5E";
      g.stroke();
    });
    txt(g, "142 BPM", 36, 94, "700 22px " + FONT, "#fff");
    txt(g, "ECG • SPO2 ACTIVE", 36, 114, "600 10px " + FONT, "rgba(255,255,255,0.75)");
  } else if (m === "keys") {
    // RGB Mechanical Keycap Matrix
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 6; col++) {
        rr(g, 142 + col * 26, 44 + r * 28, 21, 22, 5);
        g.fillStyle = (r + col) % 3 === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.24)";
        g.fill();
      }
    }
    txt(g, "GASKET PRO", 26, 98, "700 16px " + FONT, "#fff");
  } else if (m === "lens") {
    // Camera Aperture Blades & Focal Ring
    [44, 32, 18, 8].forEach((rad, idx) => {
      g.beginPath();
      g.arc(232, 78, rad, 0, Math.PI * 2);
      g.lineWidth = idx === 0 ? 3 : 1.8;
      g.strokeStyle = idx === 2 ? "#38BDF8" : "rgba(255,255,255,0.85)";
      g.stroke();
    });
    txt(g, "f/1.4", 34, 96, "700 28px " + FONT, "#fff");
    txt(g, "35MM ASPHERICAL", 34, 116, "600 9.5px " + FONT, "rgba(255,255,255,0.75)");
  } else if (m === "serum") {
    // Dropper bottle & molecular rings
    rr(g, 214, 54, 36, 68, 12);
    g.fillStyle = "rgba(255,255,255,0.32)";
    g.fill();
    g.stroke();
    rr(g, 223, 36, 18, 18, 5);
    g.fillStyle = "#fff";
    g.fill();
    txt(g, "10% NIACINAMIDE", 28, 96, "700 15px " + FONT, "#fff");
    txt(g, "PURE CENTELLA EXTRACT", 28, 114, "600 9.5px " + FONT, "rgba(255,255,255,0.8)");
  } else if (m === "espresso") {
    // Pressure dial gauge
    g.beginPath();
    g.arc(232, 82, 38, Math.PI * 0.8, Math.PI * 2.2);
    g.lineWidth = 4;
    g.stroke();
    g.beginPath();
    g.moveTo(232, 82);
    g.lineTo(256, 58);
    g.strokeStyle = "#FDE047";
    g.stroke();
    txt(g, "9.0 BAR", 32, 94, "700 24px " + FONT, "#fff");
    txt(g, "93.5°C PID BREW", 32, 114, "600 10px " + FONT, "rgba(255,255,255,0.8)");
  } else if (m === "drone") {
    // Quadcopter rotors & HUD crosshair
    [
      [196, 52],
      [268, 52],
      [196, 104],
      [268, 104],
    ].forEach(([rx, ry]) => {
      g.beginPath();
      g.arc(rx, ry, 16, 0, Math.PI * 2);
      g.strokeStyle = "rgba(255,255,255,0.8)";
      g.stroke();
    });
    g.beginPath();
    g.moveTo(196, 52);
    g.lineTo(268, 104);
    g.moveTo(268, 52);
    g.lineTo(196, 104);
    g.stroke();
    txt(g, "4K / 120FPS", 28, 94, "700 20px " + FONT, "#fff");
    txt(g, "12KM O4 TRANSMISSION", 28, 114, "600 9.5px " + FONT, "rgba(255,255,255,0.8)");
  } else if (m === "radar" || m === "hub") {
    // Live GPS Radar Sweep & Route
    [42, 28, 14].forEach(rad => {
      g.beginPath();
      g.arc(234, 78, rad, 0, Math.PI * 2);
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.stroke();
    });
    g.beginPath();
    g.arc(234, 78, 6, 0, Math.PI * 2);
    g.fillStyle = "#4ADE80";
    g.fill();
    txt(g, "LIVE TELEMETRY", 28, 92, "700 17px " + FONT, "#fff");
    txt(g, "REAL-TIME GPS DISPATCH", 28, 112, "600 9.5px " + FONT, "rgba(255,255,255,0.8)");
  } else {
    // Dynamic waveform + glowing metric bars
    for (let i = 0; i < 8; i++) {
      const bh = 22 + ((i * 19) % 52);
      rr(g, 162 + i * 17, 118 - bh, 11, bh, 5);
      g.fillStyle = i >= 5 ? "#ffffff" : "rgba(255,255,255,0.38)";
      g.fill();
    }
    txt(g, spec.metric, 28, 94, "700 24px " + FONT, "#fff");
    txt(g, "VERIFIED SHOPPLY TELEMETRY", 28, 114, "600 9px " + FONT, "rgba(255,255,255,0.8)");
  }
  g.restore();

  // Top badge pill
  rr(g, 16, 16, 138, 24, 12);
  g.fillStyle = "rgba(15, 23, 42, 0.76)";
  g.fill();
  txt(g, spec.badge, 26, 31.5, "700 8.8px " + FONT, "#fff");

  g.restore();

  // Right metric/price pill
  rr(g, 206, 166, 96, 26, 9);
  g.fillStyle = BLUE_SOFT;
  g.fill();
  txt(g, spec.metric, 254, 183, "700 11px " + FONT, BLUE_DARK, "center");

  // Unique Title & Subtitle
  txt(g, spec.title, 20, 180, "700 15.5px " + FONT, INK);
  txt(g, spec.sub, 20, 200, "500 11px " + FONT, MUTED);

  return resources.texture(c);
}

function cardTexture(resources: Resources, kind: number) {
  if (kind >= 10) {
    const spec = BESPOKE_CARDS[(kind - 10) % BESPOKE_CARDS.length];
    return drawBespokeCard(resources, spec);
  }

  const k = kind % 10;

  if (k === 7) {
    return drawImageCard(
      resources,
      "/headset.jpg",
      "★ 4.9 • BESTSELLER",
      "PHP 2,490",
      "Golden hour collection",
      "Curated audio essentials on Shopply",
      ["#FF8A00", "#FF6B6B", "#4C1D95"]
    );
  }
  if (k === 8) {
    return drawImageCard(
      resources,
      "/shopply_3d_hero.jpg",
      "⚡ FEATURED DROP",
      "PHP 3,850",
      "Studio Flagship Edition",
      "Next-gen spatial storefront showcase",
      ["#0A6CFF", "#4F46E5", "#0F172A"]
    );
  }
  if (k === 9) {
    return drawImageCard(
      resources,
      "/shopply_3d_analytics.jpg",
      "● LIVE INSIGHTS",
      "+42% GROWTH",
      "Real-time Commerce Pulse",
      "Instant analytics across every channel",
      ["#0EA5E9", "#6366F1", "#1E1B4B"]
    );
  }

  const c = resources.canvas(640, 448),
    g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 640, 448);
  g.scale(2, 2);

  rr(g, 4, 4, 312, 216, 22);
  g.fillStyle = "#ffffff";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = BG_LINE;
  g.stroke();

  g.save();
  rr(g, 4, 4, 312, 216, 22);
  g.clip();

  const topStrip = g.createLinearGradient(4, 4, 316, 4);
  topStrip.addColorStop(0, "#0A6CFF");
  topStrip.addColorStop(0.5, "#38BDF8");
  topStrip.addColorStop(1, "#6366F1");
  g.fillStyle = topStrip;
  g.fillRect(4, 4, 312, 4);

  if (k === 0) {
    const iconGrad = g.createLinearGradient(22, 24, 66, 68);
    iconGrad.addColorStop(0, "#38BDF8");
    iconGrad.addColorStop(1, BLUE);
    rr(g, 22, 24, 44, 44, 13);
    g.fillStyle = iconGrad;
    g.fill();
    g.strokeStyle = "#fff";
    g.lineWidth = 3.8;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(35, 46);
    g.lineTo(42, 53);
    g.lineTo(54, 39);
    g.stroke();
    txt(g, "Payment received", 78, 43, "700 18.5px " + FONT, INK);
    txt(g, "Order #SP-2048 • Express Checkout", 78, 62, "500 12.5px " + FONT, MUTED);
    bar(g, 22, 92, 276, 1.5, BG_LINE);
    txt(g, "INSTANT SETTLEMENT", 22, 120, "700 10px " + FONT, MUTED);
    txt(g, "PHP 1,280.00", 22, 164, "700 34px " + FONT, INK);
    bar(g, 22, 184, 110, 8, BG_BAR2);
    bar(g, 22, 184, 82, 8, BLUE);
    rr(g, 206, 142, 92, 30, 15);
    g.fillStyle = "#DCFCE7";
    g.fill();
    txt(g, "✓ Verified Paid", 252, 161, "700 11.5px " + FONT, "#15803D", "center");
  } else if (k === 1) {
    txt(g, "Dispatch Schedule", 24, 44, "700 20px " + FONT, INK);
    rr(g, 222, 26, 76, 24, 12);
    g.fillStyle = BLUE_SOFT;
    g.fill();
    txt(g, "Same-Day", 260, 42, "700 10px " + FONT, BLUE_DARK, "center");
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    for (let col = 0; col < 7; col++) txt(g, days[col], 36 + col * 41, 72, "700 10.5px " + FONT, MUTED, "center");
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 7; col++) {
        const n = r * 7 + col + 1;
        const on = n === 17;
        if (on) {
          rr(g, 36 + col * 41 - 17, 84 + r * 32, 34, 28, 10);
          g.fillStyle = BLUE;
          g.fill();
        } else if (n === 9 || n === 23 || n === 12) {
          rr(g, 36 + col * 41 - 17, 84 + r * 32, 34, 28, 10);
          g.fillStyle = BLUE_SOFT;
          g.fill();
        }
        txt(g, String(n), 36 + col * 41, 103 + r * 32, "600 12.5px " + FONT, on ? "#fff" : INK, "center");
      }
    }
  } else if (k === 2) {
    rr(g, 22, 22, 188, 38, 14);
    g.fillStyle = BG_BAR2;
    g.fill();
    txt(g, "Is this item in stock today?", 36, 46, "500 13.5px " + FONT, INK);

    rr(g, 88, 72, 210, 40, 14);
    const chatGrad = g.createLinearGradient(88, 72, 298, 112);
    chatGrad.addColorStop(0, BLUE);
    chatGrad.addColorStop(1, "#4F46E5");
    g.fillStyle = chatGrad;
    g.fill();
    txt(g, "Yes! Ships today via Express ⚡", 104, 97, "600 13px " + FONT, "#fff");

    rr(g, 22, 124, 168, 38, 14);
    g.fillStyle = BG_BAR2;
    g.fill();
    txt(g, "Awesome, placing order!", 36, 148, "500 13.5px " + FONT, INK);

    rr(g, 22, 178, 276, 26, 13);
    g.strokeStyle = BG_LINE;
    g.lineWidth = 1.5;
    g.stroke();
    txt(g, "Reply to buyer...", 36, 195, "500 11px " + FONT, MUTED);
    rr(g, 246, 182, 46, 18, 9);
    g.fillStyle = BLUE;
    g.fill();
    txt(g, "Send", 269, 194, "700 9.5px " + FONT, "#fff", "center");
  } else if (k === 3) {
    txt(g, "LIVE STORE TRAFFIC", 24, 38, "700 10.5px " + FONT, MUTED);
    txt(g, "48.2k", 24, 80, "700 38px " + FONT, INK);
    rr(g, 192, 48, 88, 28, 14);
    g.fillStyle = "#DCFCE7";
    g.fill();
    txt(g, "▲ +18.4%", 236, 66, "700 12px " + FONT, "#15803D", "center");
    const pts = [0.72, 0.56, 0.62, 0.38, 0.44, 0.26, 0.3, 0.1];
    g.beginPath();
    pts.forEach((v, i) => {
      const x = 24 + (i / 7) * 272;
      const y = 102 + v * 94;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.lineWidth = 3.8;
    g.lineJoin = "round";
    g.strokeStyle = BLUE;
    g.stroke();
    g.lineTo(296, 212);
    g.lineTo(24, 212);
    g.closePath();
    const gr = g.createLinearGradient(0, 104, 0, 212);
    gr.addColorStop(0, "rgba(10,108,255,.28)");
    gr.addColorStop(1, "rgba(10,108,255,0)");
    g.fillStyle = gr;
    g.fill();
  } else if (k === 4) {
    const rows = [
      ["Instant Order Alerts", "Real-time push & SMS"],
      ["Global Storefront Sync", "Multi-warehouse inventory"],
      ["Smart Fraud Shield", "Protected checkout"],
    ];
    rows.forEach(([title, sub], i) => {
      const y = 28 + i * 60;
      txt(g, title, 24, y + 20, "700 15px " + FONT, INK);
      txt(g, sub, 24, y + 36, "500 11px " + FONT, MUTED);
      const on = true;
      rr(g, 238, y + 8, 58, 30, 15);
      g.fillStyle = i === 1 ? "#4F46E5" : BLUE;
      g.fill();
      g.beginPath();
      g.arc(on ? 281 : 253, y + 23, 11.5, 0, Math.PI * 2);
      g.fillStyle = "#fff";
      g.fill();
    });
  } else if (k === 5) {
    const gr = g.createLinearGradient(24, 24, 88, 88);
    gr.addColorStop(0, "#38BDF8");
    gr.addColorStop(1, BLUE);
    g.beginPath();
    g.arc(56, 60, 32, 0, Math.PI * 2);
    g.fillStyle = gr;
    g.fill();
    txt(g, "M", 56, 71, "700 28px " + FONT, "#fff", "center");
    txt(g, "Maya Reyes", 102, 54, "700 20px " + FONT, INK);
    rr(g, 102, 63, 134, 20, 10);
    g.fillStyle = BLUE_SOFT;
    g.fill();
    txt(g, "★ Verified Flagship", 169, 77, "700 10px " + FONT, BLUE_DARK, "center");
    bar(g, 22, 114, 276, 1.5, BG_LINE);
    [
      ["1,420", "Orders"],
      ["4.98★", "Rating"],
      ["99.6%", "On-Time"],
    ].forEach(([val, lbl], i) => {
      txt(g, val, 32 + i * 94, 156, "700 21px " + FONT, INK);
      txt(g, lbl, 32 + i * 94, 176, "600 11px " + FONT, MUTED);
    });
  } else {
    const rows = ["Verify express order #SP-2048", "Print thermal shipping label", "Courier pickup scheduled"];
    rows.forEach((s, i) => {
      const y = 30 + i * 58;
      rr(g, 24, y + 4, 28, 28, 9);
      const checked = i < 2;
      g.fillStyle = checked ? BLUE : "#fff";
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = checked ? BLUE : BG_BAR;
      g.stroke();
      if (checked) {
        g.strokeStyle = "#fff";
        g.lineWidth = 3.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(31, y + 18);
        g.lineTo(36, y + 23);
        g.lineTo(45, y + 12);
        g.stroke();
      }
      txt(g, s, 66, y + 23, "600 15px " + FONT, checked ? MUTED : INK);
    });
  }
  g.restore();

  return resources.texture(c);
}

function shadowTexture(resources: Resources) {
  const c = resources.canvas(128, 128),
    g = c.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(10,50,140,.24)");
  gradient.addColorStop(0.6, "rgba(10,50,140,.08)");
  gradient.addColorStop(1, "rgba(10,50,140,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return resources.texture(c);
}

function createFramedCard(
  resources: Resources,
  kind: number,
  width = 1.62,
  height = 1.13,
  shadowTex?: THREE.Texture
) {
  const group = new THREE.Group();

  const slabGeo = new RoundedBoxGeometry(width + 0.04, height + 0.04, 0.036, 2, 0.018);
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity: 1,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.z = -0.02;
  group.add(slab);

  const faceGeo = new THREE.PlaneGeometry(width, height);
  const faceMat = new THREE.MeshBasicMaterial({
    map: cardTexture(resources, kind),
    transparent: true,
    opacity: 1,
    toneMapped: false,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.002;
  group.add(face);

  let shadeMat: THREE.MeshBasicMaterial | undefined;
  if (shadowTex) {
    shadeMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.34, height * 1.34), shadeMat);
    shade.position.set(0.04, -0.08, -0.05);
    group.add(shade);
  }

  function setOpacity(alpha: number) {
    const a = clamp01(alpha);
    group.visible = a > 0.01;
    faceMat.opacity = a;
    slabMat.opacity = a;
    if (shadeMat) shadeMat.opacity = a * 0.55;
  }

  return { group, faceMat, setOpacity };
}

type Pointer = { x: number; y: number };
type SceneUpdate = (p: number, time: number, reduced: boolean, pointer: Pointer) => void;

// --- SCENE 01: CLEAN 3D LAPTOP & LAYERED CARD TUNNEL (8 CHAPTERS, ZERO PARTICLES) ---
function laptopScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, resources: Resources): SceneUpdate {
  camera.fov = 32;
  scene.fog = new THREE.Fog(0xf4f7fc, 4.2, 13.8);

  const SW = 2.95,
    SH = 1.84,
    TH0 = 0.17;
  const rig = new THREE.Group();
  rig.rotation.x = -TH0;
  scene.add(rig);

  const shadowTex = shadowTexture(resources);

  // Soft studio floor shadow beneath the laptop
  const floorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 3.4),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  floorShadow.position.set(0, -1.05, 0.65);
  floorShadow.rotation.x = -Math.PI / 2;
  rig.add(floorShadow);

  const lap = new THREE.Group();
  rig.add(lap);

  const silver = new THREE.MeshStandardMaterial({
    color: 0xe2e8f3,
    roughness: 0.22,
    metalness: 0.78,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.7,
  });

  const hingeY = -(SH + 0.1) / 2;
  const hingeZ = -0.04;
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, hingeY, hingeZ);
  lap.add(lidPivot);

  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, -hingeY, -hingeZ);
  lidPivot.add(lidGroup);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.12, SH + 0.12, 0.065, 4, 0.045), silver);
  lid.position.z = -0.036;
  lidGroup.add(lid);

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(SW + 0.08, SH + 0.08),
    new THREE.MeshBasicMaterial({ color: 0x0f172a })
  );
  lidGroup.add(bezel);

  const notch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x0f172a })
  );
  notch.position.set(0, SH / 2 - 0.02, 0.006);
  lidGroup.add(notch);

  const camDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.01, 16),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  camDot.position.set(0.1, SH / 2 - 0.02, 0.008);
  lidGroup.add(camDot);

  const screenMat = new THREE.MeshBasicMaterial({
    map: dashboard(resources),
    transparent: true,
    toneMapped: false,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
  screen.position.z = 0.004;
  lidGroup.add(screen);

  const baseG = new THREE.Group();
  baseG.position.set(0, -(SH + 0.1) / 2, -0.04);
  baseG.rotation.x = TH0;
  lap.add(baseG);

  const slab = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.12, 0.085, 2.04, 4, 0.04), silver);
  slab.position.set(0, -0.042, 1.0);
  baseG.add(slab);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, SW * 0.72, 20), darkMetal);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.0, 0.02);
  baseG.add(hinge);

  const kC = resources.canvas(640, 256),
    kg = kC.getContext("2d")!;
  rr(kg, 0, 0, 640, 256, 18);
  kg.fillStyle = "#CBD5E1";
  kg.fill();
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 14; c++) {
      const kx = 12 + c * 44.2;
      const ky = 12 + r * 47;
      rr(kg, kx, ky, 38, 39, 6);
      kg.fillStyle = "#1E293B";
      kg.fill();
    }
  }
  const kb = new THREE.Mesh(
    new THREE.PlaneGeometry(SW - 0.26, 1.04),
    new THREE.MeshStandardMaterial({ map: resources.texture(kC), roughness: 0.45, metalness: 0.2 })
  );
  kb.rotation.x = -Math.PI / 2;
  kb.position.set(0, 0.002, 0.62);
  baseG.add(kb);

  const tp = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xd8e2f0, roughness: 0.3, metalness: 0.45 })
  );
  tp.rotation.x = -Math.PI / 2;
  tp.position.set(0, 0.002, 1.52);
  baseG.add(tp);

  // 4 clean floating UI cards flanking the laptop in Chapters 01 & 02
  const holoGroup = new THREE.Group();
  rig.add(holoGroup);

  const holoDefs = [
    { x: -2.2, y: 0.62, z: 0.45, rotY: 0.26, kind: 0, scale: 0.64 },
    { x: 2.24, y: 0.54, z: 0.35, rotY: -0.26, kind: 3, scale: 0.64 },
    { x: 2.1, y: -0.54, z: 0.78, rotY: -0.2, kind: 7, scale: 0.68 },
    { x: -2.05, y: -0.5, z: 0.68, rotY: 0.22, kind: 8, scale: 0.62 },
  ];

  const holoCards = holoDefs.map(d => {
    const cardObj = createFramedCard(resources, d.kind, 1.62, 1.13, shadowTex);
    cardObj.group.position.set(d.x, d.y, d.z);
    cardObj.group.rotation.y = d.rotY;
    cardObj.group.scale.setScalar(d.scale);
    holoGroup.add(cardObj.group);
    return { ...cardObj, base: new THREE.Vector3(d.x, d.y, d.z), rotY: d.rotY, scale: d.scale };
  });

  // Clean layered card tunnel behind the screen (12 cards spaced cleanly in Z so they never pile up or clip)
  const inner = new THREE.Group();
  rig.add(inner);

  // Each card is positioned well inside the camera frustum:
  // Right cards at x = +0.92..1.08, Left/Upper cards at x = -0.28..0.82 (above bottom-left copy), final card centered
  const spots: [number, number, number, number, number][] = [
    [-0.25, 0.26, -2.4, 0, 0.04],    // Layer 1A: Payment Received
    [0.98, -0.06, -4.8, 1, -0.1],    // Layer 1B: Dispatch Schedule
    [-0.28, 0.24, -7.2, 2, 0.04],    // Layer 2A: Live Buyer Chat
    [1.02, -0.04, -9.6, 3, -0.1],    // Layer 2B: Live Store Traffic
    [-0.24, 0.26, -12.0, 4, 0.04],   // Layer 3A: Smart Fraud & Sync Toggles
    [0.96, -0.05, -14.4, 5, -0.1],   // Layer 3B: Maya Reyes Verified Flagship
    [-0.26, 0.25, -16.8, 6, 0.04],   // Layer 4A: Fulfillment Checklist
    [1.0, -0.04, -19.2, 9, -0.1],    // Layer 4B: Real-Time Commerce Pulse
    [-0.25, 0.24, -21.6, 30, 0.04],  // Layer 5A: Neural AI Studio Engine
    [0.95, -0.06, -24.0, 8, -0.08],  // Layer 5B: Studio Flagship Edition
    [0.18, 0.14, -26.4, 7, 0],       // Final Hero Card: Golden Hour Collection
  ];

  const cardMeshes = spots.map(q => {
    const cardObj = createFramedCard(resources, q[3], 1.62, 1.13, shadowTex);
    cardObj.group.position.set(q[0], q[1], q[2]);
    cardObj.group.rotation.y = q[4];
    inner.add(cardObj.group);
    return { ...cardObj, basePos: new THREE.Vector3(q[0], q[1], q[2]), baseRotY: q[4] };
  });

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  let introStart = 0;

  return (p: number, time: number, reduced: boolean, pointer: Pointer) => {
    if (!introStart && time > 0) introStart = time;
    const introElapsed = introStart ? Math.max(0, time - introStart) : 0;
    const introOpen = reduced ? 1 : sm(0, 1.5, introElapsed);

    const mobile = camera.aspect < 0.8;
    const fovHalfRad = (camera.fov * Math.PI) / 360;
    const fillZ = Math.min(2.75, (SW * 0.94) / (2 * Math.tan(fovHalfRad) * camera.aspect));
    const z0 = mobile ? 9.4 : Math.max(6.8, 7.8 / Math.min(1.35, camera.aspect));

    // 8-Chapter held smootherstep camera keyframes:
    // Ch 0: Three-quarter laptop view (z0)
    // Ch 1: Closer front laptop view (4.5)
    // Ch 2: Screen fills frame (fillZ)
    // Ch 3..7: Smooth linear glide through the 11 layered cards inside the screen (-1.0 -> -22.8)
    const z = kf(p, [z0, 4.5, fillZ, -1.0, -6.2, -11.6, -17.2, -22.8]);
    const cx = kf(p, [mobile ? 0 : 2.35, 0, 0, 0, 0, 0, 0, 0]);
    const cy = kf(p, [1.05, 0.12, 0.02, 0, 0, 0, 0, 0]);
    const rotX = kf(p, [-TH0, -0.05, 0, 0, 0, 0, 0, 0]);
    const rotY = kf(p, [mobile ? -0.4 : -0.68, 0, 0, 0, 0, 0, 0, 0]);
    const lookX = kf(p, [mobile ? 0 : -0.55, 0, 0, 0, 0, 0, 0, 0]);
    const lookY = kf(p, [mobile ? 0 : -0.32, -0.04, 0, 0, 0, 0, 0, 0]);
    const sway = reduced ? 0 : 1;

    const scrollOpen = sm(0, 0.16, p);
    const openProgress = Math.max(introOpen, scrollOpen);
    const closedAngle = 1.55 * (1 - openProgress);
    lidPivot.rotation.x = closedAngle;

    rig.rotation.x = rotX + pointer.y * 0.035 * sway;
    rig.rotation.y = rotY + pointer.x * 0.045 * sway;
    rig.updateMatrixWorld(true);

    const tz = z > 3 ? 0 : z - 3.6;
    camera.position.copy(rig.localToWorld(vA.set(cx, cy, z)));
    camera.lookAt(rig.localToWorld(vB.set(lookX, lookY, tz)));

    // Fade the laptop screen glass as the camera crosses through it, then hide the laptop body
    screenMat.opacity = sm(0.15, 1.65, z);
    lap.visible = z > 1.2;
    floorShadow.visible = z > 1.6;

    // Flanking laptop cards fade out cleanly before the camera enters the screen
    const erupt = sm(0.15, 0.95, openProgress);
    const holoFade = sm(1.8, 3.4, z) * erupt;
    holoGroup.visible = holoFade > 0.01;
    if (holoGroup.visible) {
      holoCards.forEach((h, i) => {
        h.group.position.x = h.base.x * (mobile ? 0.68 : 1);
        h.group.position.y = h.base.y + (reduced ? 0 : Math.sin(time * 1.3 + i * 1.6) * 0.045);
        h.group.position.z = h.base.z;
        h.group.rotation.y = h.rotY + (reduced ? 0 : Math.cos(time * 1.0 + i) * 0.03);
        h.group.scale.setScalar(h.scale * (mobile ? 0.75 : 1));
        h.setOpacity(holoFade);
      });
    }

    // Layered cards inside the tunnel: fade in from distance, fade out before passing camera
    inner.visible = z < 3.4;
    if (inner.visible) {
      const tunnelAlpha = 1 - sm(1.5, 3.2, z);
      cardMeshes.forEach((c, i) => {
        // Distance ahead of the camera along -z
        const distAhead = z - c.basePos.z;
        // Fade out smoothly when closer than 2.0 units so cards never clip on the screen edge
        const nearFade = i === cardMeshes.length - 1 ? 1 : sm(0.85, 2.1, distAhead);
        // Fade in smoothly from the distant fog (between 13.5 and 9.5 units ahead)
        const farFade = 1 - sm(9.5, 13.5, distAhead);
        const alpha = tunnelAlpha * nearFade * farFade;

        c.setOpacity(alpha);
        if (alpha > 0.01) {
          const bob = reduced ? 0 : Math.sin(time * 1.2 + i * 1.4) * 0.035;
          c.group.position.x = c.basePos.x * (mobile ? 0.65 : 1);
          c.group.position.y = c.basePos.y + bob;
          c.group.position.z = c.basePos.z;
          c.group.rotation.y = c.baseRotY - pointer.x * 0.04 * sway;
          c.group.rotation.x = pointer.y * 0.03 * sway;
          c.group.scale.setScalar(mobile ? 0.8 : 1);
        }
      });
    }
  };
}

// --- SCENE 02: CLEAN CAMERA-ON-A-RAIL SCROLL SCENE (8 CHAPTERS, ZERO PARTICLES) ---
function railScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, resources: Resources): SceneUpdate {
  camera.fov = 44;
  scene.fog = new THREE.Fog(0xedf4ff, 5.0, 20.0);

  // Smooth 16-point Catmull-Rom spline snaking 54 units along -z with gentle x and y changes
  const curve = new THREE.CatmullRomCurve3(
    [
      [-2.6, 0.1, 6],
      [-1.2, 0.48, 2],
      [0.85, 0.12, -2],
      [2.2, -0.38, -6],
      [0.95, -0.08, -10],
      [-1.45, 0.42, -14],
      [-2.2, -0.05, -18],
      [0.05, -0.32, -22],
      [2.35, 0.25, -26],
      [1.2, 0.45, -30],
      [-1.1, 0.1, -34],
      [-2.25, -0.35, -38],
      [-0.4, -0.1, -42],
      [1.85, 0.35, -46],
      [2.1, 0.05, -50],
      [1.6, 0, -54],
    ].map(p => new THREE.Vector3(...p)),
    false,
    "centripetal"
  );

  // Clean accent-blue dotted route line below the camera path (faithful to the BrewedOps specification)
  const routePoints = curve.getSpacedPoints(260).map(p => p.setY(p.y - 0.28));
  const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
  const dotCanvas = resources.canvas(32, 32),
    dg = dotCanvas.getContext("2d")!;
  dg.fillStyle = "#ffffff";
  dg.beginPath();
  dg.arc(16, 16, 13, 0, Math.PI * 2);
  dg.fill();
  scene.add(
    new THREE.Points(
      routeGeo,
      new THREE.PointsMaterial({
        color: 0x0a6cff,
        size: 0.065,
        map: resources.texture(dotCanvas),
        alphaTest: 0.4,
      })
    )
  );

  const up = new THREE.Vector3(0, 1, 0);
  const sideways = new THREE.Vector3();
  const shadow = shadowTexture(resources);

  // 8 primary chapter stops (focus: 0..7) + 4 intermediate cards (focus: -1)
  const focusKinds = [10, 11, 12, 13, 14, 15, 16, 17];
  const extraKinds = [18, 24, 25, 32];
  const stops: { u: number; kind: number; focus: number }[] = [];
  for (let i = 0; i < 8; i++) {
    stops.push({ u: 0.1 + (i / 7) * 0.82, kind: focusKinds[i], focus: i });
  }
  for (let i = 0; i < 4; i++) {
    stops.push({ u: 0.16 + (i / 4) * 0.72, kind: extraKinds[i], focus: -1 });
  }

  const cards = stops.map((stop, i) => {
    const point = curve.getPointAt(stop.u);
    const tangent = curve.getTangentAt(stop.u);
    sideways.crossVectors(tangent, up).normalize();

    const cardObj = createFramedCard(resources, stop.kind, 1.54, 1.08, shadow);
    const sideDir = (i % 2 ? 1 : -1) * 1.35;
    cardObj.group.position.copy(point).addScaledVector(sideways, sideDir);
    cardObj.group.position.y += 0.3;
    cardObj.group.lookAt(point.clone().addScaledVector(tangent, -2.4));
    scene.add(cardObj.group);

    return {
      ...cardObj,
      u: stop.u,
      point: point.clone(),
      offset: sideways.clone().multiplyScalar(sideDir),
      y: cardObj.group.position.y,
      focus: stop.focus,
    };
  });

  const point = new THREE.Vector3();
  const look = new THREE.Vector3();

  return (p: number, time: number, reduced: boolean, pointer: Pointer) => {
    const mobile = camera.aspect < 0.8;
    const fov = mobile ? 56 : 44;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const u = 0.02 + p * 0.86;
    curve.getPointAt(u, point);
    curve.getPointAt(Math.min(1, u + 0.045), look);

    const sway = reduced ? 0 : 1;
    camera.position.set(point.x + pointer.x * 0.12 * sway, point.y + 0.16 - pointer.y * 0.08 * sway, point.z);
    camera.lookAt(look.x + pointer.x * 0.25 * sway, look.y + 0.05 - pointer.y * 0.14 * sway, look.z);

    const current = p * 7;

    cards.forEach(c => {
      // Fade out smoothly right as the camera passes the card so it never clips on the screen edge
      const du = c.u - u;
      const nearFade = sm(-0.005, 0.028, du);
      const farFade = 1 - sm(0.28, 0.38, du);
      const alpha = nearFade * farFade;
      c.setOpacity(alpha);

      if (alpha > 0.01) {
        const lift = c.focus < 0 ? 0 : 1 - sm(0, 0.55, Math.abs(current - c.focus));
        c.group.position.copy(c.point).addScaledVector(c.offset, mobile ? 0.58 : 1);
        c.group.scale.setScalar((mobile ? 0.8 : 1) * (1 + lift * 0.2));
        c.group.position.y = c.y + (reduced ? 0 : Math.sin(time * 1.2 + c.u * 12) * 0.045);
      }
    });
  };
}


export function mountScrollScene(root: HTMLElement, kind: SceneKind, chapterCount: number) {
  const stage = root.querySelector<HTMLElement>("[data-stage]")!,
    host = root.querySelector<HTMLElement>("[data-canvas]")!;
  const copies = [...root.querySelectorAll<HTMLElement>("[data-copy]")];
  const fills = [...root.querySelectorAll<HTMLElement>("[data-progress]")];
  const stopBtns = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  const resources = new Resources(),
    scene = new THREE.Scene();

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x7b96c5, 2.6);
  const light = new THREE.DirectionalLight(0xffffff, 3.4);
  light.position.set(3, 6, 5);
  scene.add(hemisphere, light);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.025, 100);
  let renderer: THREE.WebGLRenderer | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let updateScene: SceneUpdate | undefined;
  root.dataset.enhanced = "true";

  let frame = 0,
    warmup = 0,
    target = 0,
    progress = 0,
    visible = false,
    disposed = false;
  let initialized = false,
    contextReady = true,
    last = 0;
  let travel = 1,
    width = 1,
    height = 1,
    quality = 1,
    frameAverage = 16.7,
    movingFrames = 0;
  const pointer = { x: 0, y: 0 },
    pointerTarget = { x: 0, y: 0 };

  function setResolution() {
    if (!renderer) return;
    const ratio = Math.min(window.devicePixelRatio, 1.65, Math.sqrt(1_800_000 / (width * height))) * quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    root.dataset.renderScale = ratio.toFixed(2);
  }

  function initialize() {
    warmup = 0;
    if (disposed || initialized) return;
    initialized = true;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      const pmrem = new THREE.PMREMGenerator(renderer),
        room = new RoomEnvironment();
      environment = pmrem.fromScene(room, 0.04);
      room.dispose();
      pmrem.dispose();
      scene.environment = environment.texture;
      scene.environmentIntensity = kind === "laptop" ? 1.1 : 0.9;
      if (kind === "laptop") {
        hemisphere.intensity = 0.75;
        light.intensity = 1.45;
        updateScene = laptopScene(scene, camera, resources);
      } else {
        updateScene = railScene(scene, camera, resources);
      }
      camera.updateProjectionMatrix();
      setResolution();
      resources.textures.forEach(t => renderer!.initTexture(t));
      renderer.compile(scene, camera);
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
      host.appendChild(renderer.domElement);
      root.dataset.webgl = "ready";
    } catch {
      resources.dispose(scene);
      renderer?.dispose();
      renderer = undefined;
      updateScene = undefined;
      root.dataset.webgl = "unavailable";
    }
    progress = target;
    schedule();
  }

  function prepare() {
    if (initialized || warmup) return;
    if ("requestIdleCallback" in window) warmup = window.requestIdleCallback(initialize, { timeout: 500 });
    else initialize();
  }

  function draw(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden || !initialized || !contextReady) return;
    const elapsed = last ? time - last : 16.7;
    const dt = Math.min(0.08, elapsed / 1000);
    last = time;

    const rawVel = target - progress;
    progress += rawVel * (1 - Math.exp(-dt * 6.0));
    if (Math.abs(progress - target) < 0.00005) progress = target;

    const ease = 1 - Math.exp(-dt * 4.5);
    pointer.x += (pointerTarget.x - pointer.x) * ease;
    pointer.y += (pointerTarget.y - pointer.y) * ease;

    root.style.setProperty("--px", pointer.x.toFixed(3));
    root.style.setProperty("--py", pointer.y.toFixed(3));

    const idx = progress * (chapterCount - 1);
    const activeChapter = Math.round(idx);
    root.dataset.chapter = String(activeChapter);

    stopBtns.forEach((btn, i) => {
      btn.dataset.active = String(i === activeChapter);
    });

    copies.forEach((copy, i) => {
      const o = 1 - sm(0.12, 0.48, Math.abs(idx - i));
      const direction = idx < i ? 1 : -1;
      const yOffset = (direction * 24 * (1 - o)).toFixed(1);
      const scaleVal = (0.96 + o * 0.04).toFixed(3);
      copy.style.setProperty("--o", o.toFixed(3));
      copy.style.setProperty("--y", `${yOffset}px`);
      copy.style.setProperty("--scale", scaleVal);
      copy.style.visibility = o < 0.01 ? "hidden" : "visible";
      copy.setAttribute("aria-hidden", String(o < 0.5));
      copy.inert = o < 0.5;
    });

    fills.forEach(el => {
      if (el.dataset.orientation === "horizontal") {
        el.style.transform = `scaleX(${progress.toFixed(4)})`;
      } else {
        el.style.transform = `scaleY(${progress.toFixed(4)})`;
      }
    });

    const hintOpacity = 1 - sm(0.01, 0.08, progress);
    root.style.setProperty("--hint-opacity", hintOpacity.toFixed(2));

    updateScene?.(progress, time / 1000, false, pointer);

    renderer?.render(scene, camera);

    if (renderer) {
      frameAverage = frameAverage * 0.9 + elapsed * 0.1;
      if (++movingFrames >= 45) {
        if (frameAverage > 24 && quality > 0.6) {
          quality = Math.max(0.6, quality * 0.85);
          setResolution();
        }
        movingFrames = 0;
      }
      frame = requestAnimationFrame(draw);
    }
  }

  function schedule() {
    if (!frame && visible && !document.hidden && initialized && contextReady) {
      frame = requestAnimationFrame(draw);
    }
  }

  function onPointer(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  function onScroll() {
    target = clamp01(-root.getBoundingClientRect().top / travel);
    schedule();
  }

  function measure() {
    travel = Math.max(1, root.offsetHeight - stage.clientHeight);
    const nextWidth = stage.clientWidth,
      nextHeight = stage.clientHeight;
    if (width !== nextWidth || height !== nextHeight) {
      width = nextWidth;
      height = nextHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      setResolution();
    }
    onScroll();
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function visibility() {
    if (document.hidden) stop();
    else {
      progress = target;
      schedule();
    }
  }

  function contextLost(event: Event) {
    event.preventDefault();
    contextReady = false;
    stop();
    root.dataset.webgl = "unavailable";
  }

  function contextRestored() {
    contextReady = true;
    root.dataset.webgl = "ready";
    schedule();
  }

  const warmupObserver = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting) prepare();
    },
    { rootMargin: "250px" }
  );
  warmupObserver.observe(stage);

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) {
      last = 0;
      onScroll();
      progress = target;
      prepare();
      schedule();
    } else {
      stop();
    }
  });
  observer.observe(stage);

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  resizeObserver.observe(root);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", visibility);

  void document.fonts.ready.then(() => {
    if (!disposed) measure();
  });
  measure();

  return () => {
    disposed = true;
    stop();
    if (warmup) window.cancelIdleCallback(warmup);
    warmupObserver.disconnect();
    observer.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", measure);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", visibility);
    renderer?.domElement.removeEventListener("webglcontextlost", contextLost);
    renderer?.domElement.removeEventListener("webglcontextrestored", contextRestored);
    environment?.dispose();
    resources.dispose(scene);
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  };
}
