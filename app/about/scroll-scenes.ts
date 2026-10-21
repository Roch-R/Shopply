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
    t.anisotropy = 8;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
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
  const c = resources.canvas(960, 672),
    g = c.getContext("2d")!;
  const t = resources.texture(c);

  const renderCard = (imgObj?: HTMLImageElement) => {
    g.setTransform(3, 0, 0, 3, 0, 0);
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
  const c = resources.canvas(960, 672),
    g = c.getContext("2d")!;
  g.setTransform(3, 0, 0, 3, 0, 0);
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

  const c = resources.canvas(960, 672),
    g = c.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 960, 672);
  g.scale(3, 3);

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
  width = 1.38,
  height = 0.96,
  shadowTex?: THREE.Texture
) {
  const group = new THREE.Group();

  // Outer brushed metallic-silver chassis for real 3D thickness
  const rimGeo = new RoundedBoxGeometry(width + 0.058, height + 0.058, 0.044, 3, 0.022);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xdbe7f8,
    roughness: 0.24,
    metalness: 0.58,
    transparent: true,
    opacity: 1,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.z = -0.024;
  group.add(rim);

  // Inner ceramic-white bevel slab
  const slabGeo = new RoundedBoxGeometry(width + 0.022, height + 0.022, 0.032, 3, 0.014);
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.08,
    transparent: true,
    opacity: 1,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.z = -0.012;
  group.add(slab);

  // Floating 3D cobalt accent pill above the top edge for multi-layer parallax
  const badgeBarGeo = new RoundedBoxGeometry(width * 0.34, 0.022, 0.016, 2, 0.008);
  const badgeBarMat = new THREE.MeshStandardMaterial({
    color: 0x0a6cff,
    roughness: 0.2,
    metalness: 0.4,
    transparent: true,
    opacity: 1,
  });
  const badgeBar = new THREE.Mesh(badgeBarGeo, badgeBarMat);
  badgeBar.position.set(-width * 0.26, height * 0.5 + 0.012, 0.016);
  group.add(badgeBar);

  const faceGeo = new THREE.PlaneGeometry(width, height);
  const faceMat = new THREE.MeshBasicMaterial({
    map: cardTexture(resources, kind),
    transparent: true,
    opacity: 1,
    toneMapped: false,
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = 0.005;
  group.add(face);

  let shadeMat: THREE.MeshBasicMaterial | undefined;
  if (shadowTex) {
    shadeMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    });
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.32, height * 1.32), shadeMat);
    shade.position.set(0.035, -0.07, -0.055);
    group.add(shade);
  }

  function setOpacity(alpha: number) {
    const a = clamp01(alpha);
    group.visible = a > 0.01;
    faceMat.opacity = a;
    slabMat.opacity = a;
    rimMat.opacity = a;
    badgeBarMat.opacity = a;
    if (shadeMat) shadeMat.opacity = a * 0.52;
  }

  return { group, faceMat, setOpacity };
}

function setGroupOpacity(group: THREE.Group, alpha: number) {
  const a = clamp01(alpha);
  group.visible = a > 0.01;
  if (!group.visible) return;
  group.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (m.userData.baseOpacity === undefined) {
          m.userData.baseOpacity = m.opacity ?? 1;
        }
        m.transparent = true;
        m.opacity = m.userData.baseOpacity * a;
      });
    }
  });
}

function runwayFloorTexture(resources: Resources) {
  const c = resources.canvas(512, 1024),
    g = c.getContext("2d")!;
  g.clearRect(0, 0, 512, 1024);

  // Soft studio runway base with feathered edges
  const sideFade = g.createLinearGradient(0, 0, 512, 0);
  sideFade.addColorStop(0, "rgba(244,247,252,0)");
  sideFade.addColorStop(0.18, "rgba(226,236,252,0.55)");
  sideFade.addColorStop(0.5, "rgba(238,244,255,0.85)");
  sideFade.addColorStop(0.82, "rgba(226,236,252,0.55)");
  sideFade.addColorStop(1, "rgba(244,247,252,0)");
  g.fillStyle = sideFade;
  g.fillRect(0, 0, 512, 1024);

  // Longitudinal perspective guide lines
  [96, 176, 256, 336, 416].forEach((x, idx) => {
    g.strokeStyle = idx === 2 ? "rgba(10,108,255,0.32)" : "rgba(100,116,139,0.16)";
    g.lineWidth = idx === 2 ? 2.5 : 1.5;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 1024);
    g.stroke();
  });

  // Cross-ties along the runway
  for (let y = 32; y < 1024; y += 64) {
    g.strokeStyle = y % 128 === 32 ? "rgba(10,108,255,0.22)" : "rgba(100,116,139,0.12)";
    g.lineWidth = y % 128 === 32 ? 2 : 1;
    g.beginPath();
    g.moveTo(72, y);
    g.lineTo(440, y);
    g.stroke();
  }

  return resources.texture(c);
}

function phoneScreenTexture(resources: Resources) {
  const c = resources.canvas(360, 720),
    g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 360, 720);
  gr.addColorStop(0, "#0F172A");
  gr.addColorStop(0.5, "#1E293B");
  gr.addColorStop(1, "#0A6CFF");
  g.fillStyle = gr;
  g.fillRect(0, 0, 360, 720);

  rr(g, 28, 72, 304, 180, 24);
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fill();
  txt(g, "SHOPPLY EXPRESS PAY", 52, 114, "700 14px " + FONT, "#38BDF8");
  txt(g, "PHP 1,280.00", 52, 168, "700 38px " + FONT, "#FFFFFF");
  txt(g, "✓ Biometric Passkey Verified", 52, 212, "600 14px " + FONT, "#4ADE80");

  rr(g, 28, 284, 304, 240, 24);
  g.fillStyle = "#FFFFFF";
  g.fill();
  txt(g, "Instant Escrow Settlement", 52, 330, "700 18px " + FONT, INK);
  bar(g, 52, 356, 256, 10, BG_BAR2);
  bar(g, 52, 356, 212, 10, BLUE);
  txt(g, "Courier Dispatch", 52, 412, "700 16px " + FONT, INK);
  txt(g, "Same-Day Priority • #SP-2048", 52, 438, "500 13px " + FONT, MUTED);

  rr(g, 52, 462, 256, 42, 21);
  g.fillStyle = BLUE;
  g.fill();
  txt(g, "APPROVED • 0.2S", 180, 488, "700 14px " + FONT, "#FFFFFF", "center");

  return resources.texture(c);
}

export type LensMode = "cinema" | "wide" | "orbit";
type Pointer = { x: number; y: number };
type SceneUpdate = (
  p: number,
  time: number,
  reduced: boolean,
  pointer: Pointer,
  lens: LensMode
) => { depthMeters: number };

// --- SCENE 01: 3D STUDIO LAPTOP, ARCHITECTURAL RUNWAY & 5 SCULPTURAL 3D STAGES (ZERO PARTICLES) ---
function laptopScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, resources: Resources): SceneUpdate {
  camera.fov = 32;
  scene.fog = new THREE.Fog(0xf4f7fc, 5.2, 15.8);

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
  const cobaltMetal = new THREE.MeshStandardMaterial({
    color: 0x0a6cff,
    roughness: 0.24,
    metalness: 0.52,
  });
  const skyMetal = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.45,
  });
  const goldMetal = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.75,
  });
  const ceramicWhite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.1,
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

  // 4 floating UI cards flanking the laptop in Chapters 01 & 02
  const holoGroup = new THREE.Group();
  rig.add(holoGroup);

  const holoDefs = [
    { x: -2.2, y: 0.62, z: 0.45, rotY: 0.26, kind: 0, scale: 0.72 },
    { x: 2.24, y: 0.54, z: 0.35, rotY: -0.26, kind: 3, scale: 0.72 },
    { x: 2.1, y: -0.54, z: 0.78, rotY: -0.2, kind: 7, scale: 0.76 },
    { x: -2.05, y: -0.5, z: 0.68, rotY: 0.22, kind: 8, scale: 0.7 },
  ];

  const holoCards = holoDefs.map(d => {
    const cardObj = createFramedCard(resources, d.kind, 1.38, 0.96, shadowTex);
    cardObj.group.position.set(d.x, d.y, d.z);
    cardObj.group.rotation.y = d.rotY;
    cardObj.group.scale.setScalar(d.scale);
    holoGroup.add(cardObj.group);
    return { ...cardObj, base: new THREE.Vector3(d.x, d.y, d.z), rotY: d.rotY, scale: d.scale };
  });

  // --- 3D ARCHITECTURAL RUNWAY & SCULPTURAL HARDWARE STAGES INSIDE THE SCREEN ---
  const inner = new THREE.Group();
  rig.add(inner);

  // Architectural perspective runway floor
  const runwayFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 28),
    new THREE.MeshBasicMaterial({
      map: runwayFloorTexture(resources),
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  runwayFloor.rotation.x = -Math.PI / 2;
  runwayFloor.position.set(0, -1.16, -14.5);
  inner.add(runwayFloor);

  // 6 Brushed-Silver Architectural Portal Arches framing the periphery (zero clutter in center)
  const archGroup = new THREE.Group();
  inner.add(archGroup);
  const pillarGeo = new RoundedBoxGeometry(0.065, 2.42, 0.065, 2, 0.018);
  const beamGeo = new RoundedBoxGeometry(4.42, 0.065, 0.065, 2, 0.018);
  const stripGeo = new THREE.BoxGeometry(0.018, 1.9, 0.024);

  const arches = [-3.4, -7.8, -12.2, -16.6, -21.0, -25.4].map(az => {
    const g = new THREE.Group();
    g.position.z = az;

    const leftP = new THREE.Mesh(pillarGeo, silver.clone());
    leftP.position.set(-2.18, 0.05, 0);
    const rightP = new THREE.Mesh(pillarGeo, silver.clone());
    rightP.position.set(2.18, 0.05, 0);
    const topB = new THREE.Mesh(beamGeo, silver.clone());
    topB.position.set(0, 1.26, 0);

    const leftStrip = new THREE.Mesh(stripGeo, cobaltMetal.clone());
    leftStrip.position.set(-2.13, 0.05, 0);
    const rightStrip = new THREE.Mesh(stripGeo, cobaltMetal.clone());
    rightStrip.position.set(2.13, 0.05, 0);

    g.add(leftP, rightP, topB, leftStrip, rightStrip);
    archGroup.add(g);
    return { group: g, z: az };
  });

  // --- 5 BESPOKE 3D SCULPTURAL HARDWARE STAGES ---
  // Stage 1 (z = -3.8): 3D Titanium Smartphone + Floating Metallic NFC Card
  const phoneStage = new THREE.Group();
  phoneStage.position.set(-0.62, 0.24, -3.8);
  inner.add(phoneStage);

  const phoneBody = new THREE.Group();
  phoneBody.rotation.set(-0.08, 0.32, -0.05);
  phoneStage.add(phoneBody);

  const phoneChassis = new THREE.Mesh(
    new RoundedBoxGeometry(0.64, 1.28, 0.058, 4, 0.03),
    darkMetal.clone()
  );
  const phoneRim = new THREE.Mesh(
    new RoundedBoxGeometry(0.66, 1.3, 0.048, 4, 0.03),
    silver.clone()
  );
  phoneRim.position.z = -0.004;
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 1.2),
    new THREE.MeshBasicMaterial({ map: phoneScreenTexture(resources), transparent: true })
  );
  phoneScreen.position.z = 0.031;
  phoneBody.add(phoneRim, phoneChassis, phoneScreen);

  const nfcCard = new THREE.Group();
  nfcCard.position.set(0.28, -0.14, 0.24);
  nfcCard.rotation.set(0.12, -0.24, 0.14);
  const nfcSlab = new THREE.Mesh(
    new RoundedBoxGeometry(0.58, 0.36, 0.022, 3, 0.01),
    cobaltMetal.clone()
  );
  const nfcChip = new THREE.Mesh(
    new RoundedBoxGeometry(0.09, 0.07, 0.026, 2, 0.005),
    goldMetal.clone()
  );
  nfcChip.position.set(-0.16, 0.02, 0.004);
  nfcCard.add(nfcSlab, nfcChip);
  phoneStage.add(nfcCard);

  // Stage 2 (z = -8.6): 3D Scroll-Reactive Extruded Analytics Bar Sculpture
  const chartStage = new THREE.Group();
  chartStage.position.set(-0.62, 0.14, -8.6);
  chartStage.rotation.y = 0.26;
  inner.add(chartStage);

  const chartBase = new THREE.Mesh(
    new RoundedBoxGeometry(1.16, 0.075, 0.44, 3, 0.022),
    silver.clone()
  );
  chartBase.position.y = -0.42;
  chartStage.add(chartBase);

  const barHeights = [0.36, 0.52, 0.46, 0.68, 0.84, 1.02];
  const barMeshes = barHeights.map((bh, idx) => {
    const mat = idx >= 4 ? cobaltMetal.clone() : idx >= 2 ? skyMetal.clone() : silver.clone();
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.115, 0.8, 0.115, 2, 0.02), mat);
    m.position.set(-0.42 + idx * 0.168, -0.38 + (bh * 0.8) / 2, 0);
    chartStage.add(m);
    return { mesh: m, targetH: bh };
  });

  // Stage 3 (z = -13.4): 3D Precision Authentic Shield & Rotating Vault Lock
  const shieldStage = new THREE.Group();
  shieldStage.position.set(-0.6, 0.24, -13.4);
  shieldStage.rotation.y = 0.24;
  inner.add(shieldStage);

  const outerVaultRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.042, 18, 48),
    silver.clone()
  );
  const innerVaultRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.022, 14, 40),
    cobaltMetal.clone()
  );
  const shieldCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.055, 8),
    cobaltMetal.clone()
  );
  shieldCore.rotation.x = Math.PI / 2;

  const checkGroup = new THREE.Group();
  checkGroup.position.z = 0.038;
  const checkShort = new THREE.Mesh(
    new RoundedBoxGeometry(0.055, 0.16, 0.03, 2, 0.01),
    ceramicWhite.clone()
  );
  checkShort.position.set(-0.06, -0.03, 0);
  checkShort.rotation.z = 0.72;
  const checkLong = new THREE.Mesh(
    new RoundedBoxGeometry(0.055, 0.28, 0.03, 2, 0.01),
    ceramicWhite.clone()
  );
  checkLong.position.set(0.05, 0.02, 0);
  checkLong.rotation.z = -0.68;
  checkGroup.add(checkShort, checkLong);
  shieldStage.add(outerVaultRing, innerVaultRing, shieldCore, checkGroup);

  // Stage 4 (z = -18.2): 3D Studio Turntable + Isometric Express Parcel + Ring-Light
  const parcelStage = new THREE.Group();
  parcelStage.position.set(-0.62, 0.14, -18.2);
  inner.add(parcelStage);

  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.58, 0.08, 36),
    silver.clone()
  );
  turntable.position.y = -0.34;
  const turntableRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.018, 12, 36),
    cobaltMetal.clone()
  );
  turntableRim.rotation.x = Math.PI / 2;
  turntableRim.position.y = -0.3;
  parcelStage.add(turntable, turntableRim);

  const parcelBoxGroup = new THREE.Group();
  parcelBoxGroup.position.y = -0.05;
  const craftMat = new THREE.MeshStandardMaterial({
    color: 0xd9a066,
    roughness: 0.55,
    metalness: 0.08,
  });
  const boxMesh = new THREE.Mesh(
    new RoundedBoxGeometry(0.46, 0.42, 0.46, 3, 0.025),
    craftMat
  );
  const tapeTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.47, 0.04, 0.1),
    cobaltMetal.clone()
  );
  tapeTop.position.y = 0.2;
  const shippingLabel = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.47),
    ceramicWhite.clone()
  );
  shippingLabel.position.set(0.06, 0.04, 0);
  parcelBoxGroup.add(boxMesh, tapeTop, shippingLabel);
  parcelStage.add(parcelBoxGroup);

  const studioRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.022, 14, 36),
    skyMetal.clone()
  );
  studioRing.position.y = 0.02;
  parcelStage.add(studioRing);

  // Stage 5 (z = -26.4): Finale 3D Multi-Device Flagship Podium
  const finalePodium = new THREE.Group();
  finalePodium.position.set(0.18, -0.78, -26.4);
  inner.add(finalePodium);

  const podiumTier1 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.68, 0.09, 48),
    silver.clone()
  );
  const podiumTier2 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.28, 0.08, 48),
    ceramicWhite.clone()
  );
  podiumTier2.position.y = 0.07;
  const podiumRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.24, 0.02, 12, 48),
    cobaltMetal.clone()
  );
  podiumRing.rotation.x = Math.PI / 2;
  podiumRing.position.y = 0.1;
  finalePodium.add(podiumTier1, podiumTier2, podiumRing);

  // Left 3D Studio Tablet & Right 3D Smartphone on the Finale Podium
  const sideTablet = new THREE.Mesh(
    new RoundedBoxGeometry(0.68, 0.48, 0.036, 3, 0.018),
    darkMetal.clone()
  );
  sideTablet.position.set(-1.05, 0.56, 0.28);
  sideTablet.rotation.y = 0.35;
  const sidePhone = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.62, 0.034, 3, 0.016),
    cobaltMetal.clone()
  );
  sidePhone.position.set(1.05, 0.54, 0.28);
  sidePhone.rotation.y = -0.35;
  finalePodium.add(sideTablet, sidePhone);

  // Perfectly framed 3D UI cards along the runway (width 1.34, x within [-0.22, +0.66] so they NEVER clip)
  const spots: [number, number, number, number, number][] = [
    [0.64, 0.04, -2.5, 0, -0.12],    // Layer 1A: Payment Received
    [0.66, -0.04, -4.9, 1, -0.12],   // Layer 1B: Dispatch Schedule
    [0.64, 0.06, -7.3, 2, -0.12],    // Layer 2A: Live Buyer Chat
    [0.66, -0.04, -9.7, 3, -0.12],   // Layer 2B: Live Store Traffic
    [0.64, 0.06, -12.1, 4, -0.12],   // Layer 3A: Smart Fraud & Sync Toggles
    [0.66, -0.02, -14.5, 5, -0.12],  // Layer 3B: Maya Reyes Verified Flagship
    [0.64, 0.06, -16.9, 6, -0.12],   // Layer 4A: Fulfillment Checklist
    [0.66, -0.04, -19.3, 9, -0.12],  // Layer 4B: Real-Time Commerce Pulse
    [-0.22, 0.28, -21.7, 30, 0.08],  // Layer 5A: Neural AI Studio Engine
    [0.64, -0.02, -24.0, 8, -0.1],   // Layer 5B: Studio Flagship Edition
    [0.18, 0.14, -26.4, 7, 0],       // Final Hero Card: Golden Hour Collection
  ];

  const cardMeshes = spots.map((q, idx) => {
    const isFinal = idx === spots.length - 1;
    const cardObj = createFramedCard(
      resources,
      q[3],
      isFinal ? 1.48 : 1.32,
      isFinal ? 1.03 : 0.92,
      shadowTex
    );
    cardObj.group.position.set(q[0], q[1], q[2]);
    cardObj.group.rotation.y = q[4];
    inner.add(cardObj.group);
    return { ...cardObj, basePos: new THREE.Vector3(q[0], q[1], q[2]), baseRotY: q[4] };
  });

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  let introStart = 0;

  return (p: number, time: number, reduced: boolean, pointer: Pointer, lens: LensMode) => {
    if (!introStart && time > 0) introStart = time;
    const introElapsed = introStart ? Math.max(0, time - introStart) : 0;
    const introOpen = reduced ? 1 : sm(0, 1.5, introElapsed);

    const mobile = camera.aspect < 0.8;
    const baseFov = mobile ? 42 : 32;
    const tunnelBlend = 1 - sm(1.4, 3.4, kf(p, [7.8, 4.5, 2.5, -1.0, -6.2, -11.6, -17.2, -22.8]));
    const lensBonus = lens === "wide" ? 10 : lens === "orbit" ? 4 : 0;
    const targetFov = baseFov + tunnelBlend * (mobile ? 12 : 11) + lensBonus;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    const fovHalfRad = (32 * Math.PI) / 360;
    const fillZ = Math.min(2.75, (SW * 0.94) / (2 * Math.tan(fovHalfRad) * camera.aspect));
    const z0 = mobile ? 9.4 : Math.max(6.8, 7.8 / Math.min(1.35, camera.aspect));

    const z = kf(p, [z0, 4.5, fillZ, -1.0, -6.2, -11.6, -17.2, -22.8]);
    const orbitOffsetX = lens === "orbit" ? Math.sin(p * Math.PI * 2) * 0.42 : 0;
    const orbitOffsetY = lens === "orbit" ? 0.18 : 0;
    const cx = kf(p, [mobile ? 0 : 2.35, 0, 0, 0, 0, 0, 0, 0]) + orbitOffsetX;
    const cy = kf(p, [1.05, 0.12, 0.02, 0, 0, 0, 0, 0]) + orbitOffsetY;
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

    screenMat.opacity = sm(0.15, 1.65, z);
    lap.visible = z > 1.2;
    floorShadow.visible = z > 1.6;

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

    inner.visible = z < 3.4;
    if (inner.visible) {
      const tunnelAlpha = 1 - sm(1.5, 3.2, z);

      // Update architectural portal arches
      arches.forEach(a => {
        const dist = z - a.z;
        const alpha = tunnelAlpha * sm(0.6, 1.8, dist) * (1 - sm(11.5, 15.5, dist));
        setGroupOpacity(a.group, alpha);
      });

      // Animate & fade the 5 sculptural 3D hardware stages
      const stageAlpha = (sz: number, isFinale = false) => {
        const dist = z - sz;
        const near = isFinale ? 1 : sm(1.45, 2.65, dist);
        const far = 1 - sm(10.0, 14.2, dist);
        return tunnelAlpha * near * far;
      };

      // Stage 1: 3D Phone + NFC Card
      const s1 = stageAlpha(-3.8);
      setGroupOpacity(phoneStage, s1);
      if (s1 > 0.01) {
        phoneStage.position.x = -0.62 * (mobile ? 0.62 : 1);
        phoneBody.rotation.y = 0.32 + (reduced ? 0 : Math.sin(time * 1.1) * 0.08);
        nfcCard.position.y = -0.14 + (reduced ? 0 : Math.cos(time * 1.6) * 0.035);
        nfcCard.rotation.z = 0.14 + (reduced ? 0 : Math.sin(time * 1.4) * 0.05);
      }

      // Stage 2: 3D Extruded Bar Chart Sculpture
      const s2 = stageAlpha(-8.6);
      setGroupOpacity(chartStage, s2);
      if (s2 > 0.01) {
        chartStage.position.x = -0.62 * (mobile ? 0.62 : 1);
        chartStage.rotation.y = 0.26 + (reduced ? 0 : Math.sin(time * 0.9) * 0.06);
        const rise = sm(6.5, 2.2, Math.abs(z - -8.6));
        barMeshes.forEach((b, idx) => {
          const pulse = reduced ? 1 : 0.92 + Math.sin(time * 2.0 + idx * 0.7) * 0.08;
          const hScale = Math.max(0.15, b.targetH * (0.3 + 0.7 * rise) * pulse);
          b.mesh.scale.y = hScale;
          b.mesh.position.y = -0.38 + (hScale * 0.8) / 2;
        });
      }

      // Stage 3: 3D Authentic Shield & Rotating Vault Lock
      const s3 = stageAlpha(-13.4);
      setGroupOpacity(shieldStage, s3);
      if (s3 > 0.01) {
        shieldStage.position.x = -0.6 * (mobile ? 0.62 : 1);
        outerVaultRing.rotation.z = reduced ? 0 : time * 0.45;
        innerVaultRing.rotation.z = reduced ? 0 : -time * 0.75;
        shieldStage.position.y = 0.24 + (reduced ? 0 : Math.sin(time * 1.3) * 0.035);
      }

      // Stage 4: 3D Turntable + Express Parcel + Orbiting Ring-Light
      const s4 = stageAlpha(-18.2);
      setGroupOpacity(parcelStage, s4);
      if (s4 > 0.01) {
        parcelStage.position.x = -0.62 * (mobile ? 0.62 : 1);
        parcelBoxGroup.rotation.y = reduced ? 0.6 : time * 0.65;
        studioRing.rotation.y = reduced ? -0.4 : -time * 0.9;
        studioRing.rotation.x = 0.35 + (reduced ? 0 : Math.sin(time * 1.2) * 0.15);
      }

      // Stage 5: Finale 3D Multi-Device Flagship Podium
      const s5 = stageAlpha(-26.4, true);
      setGroupOpacity(finalePodium, s5);
      if (s5 > 0.01) {
        sideTablet.position.y = 0.56 + (reduced ? 0 : Math.sin(time * 1.3) * 0.03);
        sidePhone.position.y = 0.54 + (reduced ? 0 : Math.cos(time * 1.5) * 0.03);
      }

      // Layered 3D UI cards (properly sized and framed so they never clip on screen edges)
      cardMeshes.forEach((c, i) => {
        const distAhead = z - c.basePos.z;
        const nearFade = i === cardMeshes.length - 1 ? 1 : sm(1.55, 2.75, distAhead);
        const farFade = 1 - sm(9.8, 13.8, distAhead);
        const alpha = tunnelAlpha * nearFade * farFade;

        c.setOpacity(alpha);
        if (alpha > 0.01) {
          const bob = reduced ? 0 : Math.sin(time * 1.2 + i * 1.4) * 0.032;
          c.group.position.x = c.basePos.x * (mobile ? 0.58 : 1);
          c.group.position.y = c.basePos.y + bob;
          c.group.position.z = c.basePos.z;
          c.group.rotation.y = c.baseRotY - pointer.x * 0.04 * sway;
          c.group.rotation.x = pointer.y * 0.03 * sway;
          c.group.scale.setScalar(mobile ? 0.76 : 1);
        }
      });
    }

    return { depthMeters: z };
  };
}

// --- SCENE 02: 3D DUAL-RAIL MONORAIL COASTER & TURNTABLE PODIUMS (8 CHAPTERS, ZERO PARTICLES) ---
function railScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera, resources: Resources): SceneUpdate {
  camera.fov = 44;
  scene.fog = new THREE.Fog(0xedf4ff, 5.5, 21.5);

  // Smooth 16-point Catmull-Rom spline snaking 60 units along -z
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

  const up = new THREE.Vector3(0, 1, 0);
  const sideways = new THREE.Vector3();

  // Physical 3D Dual-Rail Monorail Track + Metallic Cross-Tie Sleepers
  const leftRailPts: THREE.Vector3[] = [];
  const rightRailPts: THREE.Vector3[] = [];
  const sampleCount = 80;
  for (let i = 0; i <= sampleCount; i++) {
    const u = i / sampleCount;
    const pt = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    sideways.crossVectors(tan, up).normalize();
    leftRailPts.push(pt.clone().addScaledVector(sideways, -0.28).setY(pt.y - 0.38));
    rightRailPts.push(pt.clone().addScaledVector(sideways, 0.28).setY(pt.y - 0.38));
  }

  const leftCurve = new THREE.CatmullRomCurve3(leftRailPts);
  const rightCurve = new THREE.CatmullRomCurve3(rightRailPts);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.25,
    metalness: 0.65,
  });
  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.6,
  });

  scene.add(new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 160, 0.02, 8, false), railMat));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 160, 0.02, 8, false), railMat));

  const sleeperGeo = new RoundedBoxGeometry(0.64, 0.02, 0.055, 2, 0.008);
  for (let i = 0; i < 46; i++) {
    const u = (i + 0.5) / 46;
    const pt = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
    sleeper.position.set(pt.x, pt.y - 0.39, pt.z);
    sleeper.lookAt(pt.x + tan.x, pt.y - 0.39 + tan.y, pt.z + tan.z);
    scene.add(sleeper);
  }

  // Central accent-blue dotted guide line along the monorail
  const routePoints = curve.getSpacedPoints(260).map(p => p.setY(p.y - 0.34));
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

  const shadow = shadowTexture(resources);
  const podiumGeo = new THREE.CylinderGeometry(0.62, 0.7, 0.08, 32);
  const podiumRimGeo = new THREE.TorusGeometry(0.66, 0.018, 12, 36);
  const podiumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.2,
  });
  const podiumRimMat = new THREE.MeshStandardMaterial({
    color: 0x0a6cff,
    roughness: 0.22,
    metalness: 0.55,
  });

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

    const cardObj = createFramedCard(resources, stop.kind, 1.42, 0.98, shadow);
    // Add a 3D circular studio turntable pedestal beneath each card
    const pod = new THREE.Mesh(podiumGeo, podiumMat.clone());
    pod.position.set(0, -0.62, -0.02);
    const podRim = new THREE.Mesh(podiumRimGeo, podiumRimMat.clone());
    podRim.rotation.x = Math.PI / 2;
    podRim.position.set(0, -0.58, -0.02);
    cardObj.group.add(pod, podRim);

    const sideDir = (i % 2 ? 1 : -1) * 1.28;
    cardObj.group.position.copy(point).addScaledVector(sideways, sideDir);
    cardObj.group.position.y += 0.28;
    cardObj.group.lookAt(point.clone().addScaledVector(tangent, -2.4));
    scene.add(cardObj.group);

    return {
      ...cardObj,
      podMat: pod.material as THREE.MeshStandardMaterial,
      podRimMat: podRim.material as THREE.MeshStandardMaterial,
      u: stop.u,
      point: point.clone(),
      offset: sideways.clone().multiplyScalar(sideDir),
      y: cardObj.group.position.y,
      focus: stop.focus,
    };
  });

  const point = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tanNow = new THREE.Vector3();
  const tanAhead = new THREE.Vector3();

  return (p: number, time: number, reduced: boolean, pointer: Pointer, lens: LensMode) => {
    const mobile = camera.aspect < 0.8;
    const lensBonus = lens === "wide" ? 10 : lens === "orbit" ? 4 : 0;
    const fov = (mobile ? 56 : 44) + lensBonus;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const u = 0.02 + p * 0.86;
    curve.getPointAt(u, point);
    curve.getPointAt(Math.min(1, u + 0.045), look);
    curve.getTangentAt(u, tanNow);
    curve.getTangentAt(Math.min(1, u + 0.03), tanAhead);

    const sway = reduced ? 0 : 1;
    const orbitSide = lens === "orbit" ? 0.48 : 0;
    const orbitUp = lens === "orbit" ? 0.22 : 0;

    camera.position.set(
      point.x + orbitSide + pointer.x * 0.12 * sway,
      point.y + 0.18 + orbitUp - pointer.y * 0.08 * sway,
      point.z
    );

    // Subtle smooth coaster banking around curves
    const turnRate = (tanAhead.x - tanNow.x) * (reduced ? 0 : 0.35);
    const bankAngle = Math.max(-0.085, Math.min(0.085, -turnRate));
    camera.up.set(Math.sin(bankAngle), Math.cos(bankAngle), 0);
    camera.lookAt(look.x + pointer.x * 0.25 * sway, look.y + 0.05 - pointer.y * 0.14 * sway, look.z);

    const current = p * 7;

    cards.forEach(c => {
      const du = c.u - u;
      const nearFade = sm(0.002, 0.032, du);
      const farFade = 1 - sm(0.28, 0.38, du);
      const alpha = nearFade * farFade;
      c.setOpacity(alpha);
      c.podMat.transparent = true;
      c.podMat.opacity = alpha;
      c.podRimMat.transparent = true;
      c.podRimMat.opacity = alpha;

      if (alpha > 0.01) {
        const lift = c.focus < 0 ? 0 : 1 - sm(0, 0.55, Math.abs(current - c.focus));
        c.group.position.copy(c.point).addScaledVector(c.offset, mobile ? 0.56 : 1);
        c.group.scale.setScalar((mobile ? 0.78 : 1) * (1 + lift * 0.16));
        c.group.position.y = c.y + lift * 0.08 + (reduced ? 0 : Math.sin(time * 1.2 + c.u * 12) * 0.04);
      }
    });

    return { depthMeters: point.z };
  };
}

export function mountScrollScene(root: HTMLElement, kind: SceneKind, chapterCount: number) {
  const stage = root.querySelector<HTMLElement>("[data-stage]")!,
    host = root.querySelector<HTMLElement>("[data-canvas]")!;
  const copies = [...root.querySelectorAll<HTMLElement>("[data-copy]")];
  const fills = [...root.querySelectorAll<HTMLElement>("[data-progress]")];
  const stopBtns = [...root.querySelectorAll<HTMLElement>("[data-stop]")];
  const telemetryEl = root.querySelector<HTMLElement>("[data-telemetry]");
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
    const ratio = Math.min(window.devicePixelRatio, 1.75, Math.sqrt(2_100_000 / (width * height))) * quality;
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
        hemisphere.intensity = 0.78;
        light.intensity = 1.5;
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

    const lensMode = (root.dataset.lens as LensMode) || "cinema";
    const info = updateScene?.(progress, time / 1000, false, pointer, lensMode);

    if (telemetryEl && info) {
      const pct = Math.round(progress * 100);
      const depthStr = info.depthMeters >= 0 ? `+${info.depthMeters.toFixed(1)}M` : `${info.depthMeters.toFixed(1)}M`;
      telemetryEl.textContent = `Z-DEPTH ${depthStr} • ${pct}%`;
    }

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

