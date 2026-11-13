// Three.js scene for the Shopply delivery journey.
// Loaded lazily (dynamic import) by DeliveryJourney.tsx, never on the server.
// Everything rendered is a pure function of scroll progress p in [0, 1].

import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PH_ISLANDS } from "./phOutline";
import { buildCar, buildJeepney, buildPerson, buildPlane, drawJeepneySide } from "./journeyActors";
import { createSuburb, SX } from "./journeySuburb";
import { loadHuman } from "./journeyHuman";
import {
  ANCHOR_COUNT,
  ANCHOR_STRIDE,
  CHECKPOINTS,
  MAP_CITIES,
  SERVICE_SIGNS,
  TIMELINE as T,
  type ServiceIcon,
} from "./journeyData";

export interface JourneyScene {
  /** Draw the frame for progress p with pointer parallax in -1..1, and refresh `anchors`. */
  render(p: number, pointerX: number, pointerY: number): void;
  resize(width: number, height: number): void;
  /** Per anchor: [x px, y px, alpha 0..1, flag]. Checkpoints first, then map cities. */
  readonly anchors: Float32Array;
  readonly canvas: HTMLCanvasElement;
  dispose(): void;
}

interface SceneOptions {
  onContextLost?: () => void;
  /** Called when late-loading models arrive and the frame should be redrawn. */
  onAssetsReady?: () => void;
}

/* ------------------------------------------------------------------ */
/* Math helpers                                                        */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fritsch-Carlson monotone cubic interpolation (no overshoot, smooth speed). */
function monotoneCubic(xs: number[], ys: number[]) {
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

/* ------------------------------------------------------------------ */
/* World layout                                                        */
/* ------------------------------------------------------------------ */

const FOV = 34;
const XI = 56; // x of the intersection centre
const ROAD_HALF = 3.5;
const LANE = 1.6; // right-hand traffic lane offset
const TURN_R = 3.4;
const CX = XI - LANE - TURN_R; // where the right turn starts
const L1 = CX; // van starts at x = 0
const ARC = (Math.PI * TURN_R) / 2;
const SEG2_Z0 = LANE + TURN_R;
const VAN_FRONT = 2.45;
const VAN_STOP_Z = 19.5;
const S_END = L1 + ARC + (VAN_STOP_Z - SEG2_Z0);
const MARKER_Z = [9, 13.5, 18];
const MARKER_X = XI + ROAD_HALF + 0.6;
const HUB_W = 12;
const HUB_D = 15;
const HUB_H = 6.4;
const HUB_X = XI - ROAD_HALF - 3.2 - HUB_W / 2;
const HUB_Z = VAN_STOP_Z + 1;
const MAP_CENTER = new THREE.Vector3(XI, 0, 16.5);
const MAP_K = 5.5;
const LON_C = 121.75;
const LAT_C = 12.85;
const LON_SCALE = Math.cos(LAT_C * DEG);
const ISLAND_TOP = 1.55;
const FLOOR = 3.2; // metres per storey; the van is ~3.2 m tall
const BASE_Y = 0.22; // top of the kerb platforms

const COLORS = {
  cityBg: new THREE.Color("#F2F1EC"),
  mapBg: new THREE.Color("#E7EEEA"),
  duskBg: new THREE.Color("#F6E8D8"),
  ink: "#111827",
  green: "#059669",
  greenSoft: "#10B981",
};

const vanS = monotoneCubic(
  [0, 0.05, 0.19, 0.235, 0.3, 0.395, 1],
  [0, 0.8, 3.0, 26, L1 + ARC + 0.8, S_END, S_END]
);

interface PathPoint {
  x: number;
  z: number;
  tx: number;
  tz: number;
}

function pathAt(s: number, out: PathPoint) {
  if (s <= L1) {
    out.x = s;
    out.z = LANE;
    out.tx = 1;
    out.tz = 0;
  } else if (s <= L1 + ARC) {
    const phi = (s - L1) / TURN_R;
    out.x = CX + TURN_R * Math.sin(phi);
    out.z = LANE + TURN_R - TURN_R * Math.cos(phi);
    out.tx = Math.cos(phi);
    out.tz = Math.sin(phi);
  } else {
    out.x = CX + TURN_R;
    out.z = SEG2_Z0 + (s - L1 - ARC);
    out.tx = 0;
    out.tz = 1;
  }
  return out;
}

interface Layout {
  compact: boolean;
  rIntro: number;
  rSide: number;
  rTrack: number;
  rMap: number;
  thetaIntro: number;
  thetaSide: number;
  leadIntro: number;
  leadSide: number;
  introY: number;
  sideY: number;
  trackTarget: THREE.Vector3;
  mapTarget: THREE.Vector3;
  rHub: number;
  thetaHub: number;
  phiHub: number;
  hubTarget: THREE.Vector3;
  rSubTop: number;
  rChase: number;
  thetaChase: number;
  rArrive: number;
  thetaArrive: number;
  phiArrive: number;
  arriveShift: number;
  arriveLift: number;
}

function computeLayout(width: number, height: number): Layout {
  const aspect = width / Math.max(1, height);
  const compact = width < 760 || aspect < 0.95;
  const t2 = 2 * Math.tan((FOV * DEG) / 2);
  const fitW = (u: number) => u / (t2 * aspect);
  const fitH = (u: number) => u / t2;

  const rSide = compact ? Math.max(fitW(11.5), fitH(15)) : Math.max(fitW(25), fitH(12.5));
  const rTrack = compact ? Math.max(fitW(17), fitH(24)) : Math.max(fitW(37), fitH(19));
  const rMap = compact ? Math.max(fitW(66), fitH(150)) : Math.max(fitW(115), fitH(106));
  const visHMap = rMap * t2;
  const visWMap = visHMap * aspect;

  return {
    compact,
    rIntro: rSide * (compact ? 0.74 : 0.74),
    rSide,
    rTrack,
    rMap,
    thetaIntro: (compact ? 16 : 4) * DEG,
    thetaSide: (compact ? 32 : 14) * DEG,
    leadIntro: compact ? 1.6 : -2.4,
    leadSide: compact ? 1.4 : 7,
    introY: compact ? 6 : 3.1,
    sideY: compact ? -0.6 : 2.2,
    trackTarget: compact ? new THREE.Vector3(XI - 0.4, 0, 11.5) : new THREE.Vector3(XI - 1.6, 0, 16.5),
    mapTarget: compact
      ? new THREE.Vector3(MAP_CENTER.x, 0, MAP_CENTER.z - visHMap * 0.15)
      : new THREE.Vector3(MAP_CENTER.x - visWMap * 0.2, 0, MAP_CENTER.z),
    rHub: compact ? Math.max(fitW(24), fitH(20)) : Math.max(fitW(38), fitH(17)),
    thetaHub: (compact ? 40 : 30) * DEG,
    phiHub: (compact ? 42 : 50) * DEG,
    hubTarget: compact ? new THREE.Vector3(HUB_X + 5, 1.5, HUB_Z + 1) : new THREE.Vector3(HUB_X + 1.6, 2, HUB_Z + 4.2),
    rSubTop: compact ? 60 : 44,
    rChase: compact ? 13 : 10,
    thetaChase: (compact ? 17 : 14) * DEG,
    rArrive: compact ? 17 : 13.5,
    thetaArrive: (compact ? 12 : 9) * DEG,
    phiArrive: (compact ? -50 : -58) * DEG,
    arriveShift: compact ? 0 : 2.9,
    arriveLift: compact ? 1.9 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Canvas drawing helpers                                              */
/* ------------------------------------------------------------------ */

const FONT = '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBag(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = "round";
  roundRect(ctx, x, y + size * 0.3, size, size * 0.7, size * 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.32, size * 0.22, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: ServiceIcon, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = s * 0.1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const h = s / 2;
  if (icon === "store") {
    ctx.strokeRect(cx - h * 0.8, cy - h * 0.05, h * 1.6, h * 0.95);
    ctx.beginPath();
    ctx.moveTo(cx - h, cy - h * 0.05);
    ctx.lineTo(cx - h * 0.8, cy - h * 0.75);
    ctx.lineTo(cx + h * 0.8, cy - h * 0.75);
    ctx.lineTo(cx + h, cy - h * 0.05);
    ctx.stroke();
    ctx.strokeRect(cx - h * 0.2, cy + h * 0.35, h * 0.4, h * 0.55);
  } else if (icon === "chat") {
    roundRect(ctx, cx - h, cy - h * 0.75, h * 2, h * 1.3, h * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.45, cy + h * 0.55);
    ctx.lineTo(cx - h * 0.6, cy + h * 0.95);
    ctx.lineTo(cx - h * 0.05, cy + h * 0.55);
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(cx + i * h * 0.5, cy - h * 0.1, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (icon === "wallet") {
    roundRect(ctx, cx - h, cy - h * 0.65, h * 2, h * 1.45, h * 0.25);
    ctx.stroke();
    roundRect(ctx, cx + h * 0.2, cy - h * 0.2, h * 0.8, h * 0.55, h * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + h * 0.55, cy + h * 0.07, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + h * 0.85, cy - h * 0.6);
    ctx.quadraticCurveTo(cx + h * 0.85, cy + h * 0.55, cx, cy + h);
    ctx.quadraticCurveTo(cx - h * 0.85, cy + h * 0.55, cx - h * 0.85, cy - h * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.38, cy);
    ctx.lineTo(cx - h * 0.05, cy + h * 0.32);
    ctx.lineTo(cx + h * 0.42, cy - h * 0.28);
    ctx.stroke();
  }
  ctx.restore();
}

/** Window bay: one storey (3.2 m) by 3.2 m of facade. Wall is white so vertex colours tint it. */
function drawFacade(ctx: CanvasRenderingContext2D) {
  const S = 256;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, S, S);
  // floor slab line + soft dirt gradient at the base of each storey
  const dirt = ctx.createLinearGradient(0, S - 26, 0, S);
  dirt.addColorStop(0, "rgba(0,0,0,0)");
  dirt.addColorStop(1, "rgba(60,50,40,0.10)");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, S - 26, S, 26);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, 0, S, 5);
  // frame
  const wx = 52;
  const wy = 46;
  const ww = 152;
  const wh = 146;
  ctx.fillStyle = "#D9DCE0";
  ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
  // glass with sky reflection
  const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
  glass.addColorStop(0, "#506A80");
  glass.addColorStop(0.55, "#7F97AA");
  glass.addColorStop(1, "#A9BAC6");
  ctx.fillStyle = glass;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, ww, wh);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(wx + 20, wy + wh);
  ctx.lineTo(wx + 70, wy);
  ctx.lineTo(wx + 100, wy);
  ctx.lineTo(wx + 50, wy + wh);
  ctx.fill();
  ctx.restore();
  // mullions + transom
  ctx.fillStyle = "#E7E9EC";
  ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh);
  ctx.fillRect(wx, wy + 40, ww, 5);
  // sill
  ctx.fillStyle = "#C8CCD2";
  ctx.fillRect(wx - 14, wy + wh + 8, ww + 28, 9);
}

/** Shopfront bay: 4 m wide ground floor with sign band (tinted per shop), glazing and a door. */
function drawShopfront(ctx: CanvasRenderingContext2D) {
  const W = 512;
  const H = 256;
  ctx.fillStyle = "#3A3F47";
  ctx.fillRect(0, 0, W, H);
  // sign band (white so the vertex colour shows through)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, 58);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 4; i++) ctx.fillRect(40 + i * 110, 22, 70, 12);
  // display windows
  const glass = ctx.createLinearGradient(0, 70, 0, H);
  glass.addColorStop(0, "#2E3A46");
  glass.addColorStop(1, "#5B6B7A");
  ctx.fillStyle = glass;
  ctx.fillRect(18, 72, 300, H - 90);
  // goods on shelves
  const goods = ["#E7C9A9", "#C9D9E7", "#E8B4A0", "#BFD8C0", "#F0DFA8"];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = goods[(r * 3 + c) % goods.length];
      ctx.fillRect(30 + c * 36, 96 + r * 46, 24, 26);
    }
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(22, 124 + r * 46, 292, 3);
  }
  // door
  ctx.fillStyle = "#1F242B";
  ctx.fillRect(350, 72, 130, H - 72);
  ctx.fillStyle = "#4E5D6C";
  ctx.fillRect(362, 86, 106, H - 100);
  ctx.fillStyle = "#D1D5DB";
  ctx.fillRect(452, 150, 6, 40);
  // reflections
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(60, H);
  ctx.lineTo(140, 72);
  ctx.lineTo(180, 72);
  ctx.lineTo(100, H);
  ctx.fill();
}

/** Flat concrete roof seen from above, with parapet lip and stains. */
function drawRoof(ctx: CanvasRenderingContext2D, rand: () => number) {
  const S = 256;
  ctx.fillStyle = "#CFCBC2";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(${90 + rand() * 40},${85 + rand() * 30},${70 + rand() * 30},${0.04 + rand() * 0.05})`;
    ctx.beginPath();
    ctx.arc(rand() * S, rand() * S, 8 + rand() * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo((S * i) / 6, 0);
    ctx.lineTo((S * i) / 6, S);
    ctx.stroke();
  }
  ctx.strokeStyle = "#E9E6DF";
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, S - 16, S - 16);
  ctx.strokeStyle = "rgba(0,0,0,0.14)";
  ctx.lineWidth = 3;
  ctx.strokeRect(17, 17, S - 34, S - 34);
}

/** Palm frond with transparent gaps between leaflets (used with alphaTest). */
function drawFrond(ctx: CanvasRenderingContext2D, rand: () => number) {
  const W = 128;
  const H = 512;
  ctx.clearRect(0, 0, W, H);
  const greens = ["#4F7F3C", "#5C8C45", "#679A4E", "#76A758", "#83B263"];
  for (let i = 0; i < 46; i++) {
    const v = 0.05 + i * 0.0205; // along the frond, 0 = base
    const y = H * (1 - v);
    const len = 62 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.06)), 0.55);
    for (const side of [-1, 1]) {
      const l = len * (0.85 + rand() * 0.15);
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
      ctx.beginPath();
      ctx.moveTo(64, y + 4);
      ctx.quadraticCurveTo(64 + side * l * 0.55, y - 6, 64 + side * l, y - 24 - rand() * 6);
      ctx.quadraticCurveTo(64 + side * l * 0.5, y - 2, 64, y - 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#8B9452";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(64, H);
  ctx.lineTo(64, 6);
  ctx.stroke();
}

function drawBark(ctx: CanvasRenderingContext2D) {
  const W = 64;
  const H = 256;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#8C7A66");
  g.addColorStop(0.5, "#A8957F");
  g.addColorStop(1, "#8C7A66");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 16) {
    ctx.fillStyle = "rgba(60,48,36,0.35)";
    ctx.fillRect(0, y, W, 3);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, y + 4, W, 2);
  }
}

/* ------------------------------------------------------------------ */
/* Procedural geometry                                                 */
/* ------------------------------------------------------------------ */

interface Bld {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  shop: boolean;
  pitched: boolean;
  tint: string;
  roof?: string;
}

interface BlockOut {
  geo: THREE.BufferGeometry;
  tanks: THREE.Matrix4[];
  units: THREE.Matrix4[];
  roofs: { m: THREE.Matrix4; color: string }[];
  awnings: { m: THREE.Matrix4; color: string }[];
}

const ROOF_COLORS = ["#9C5B45", "#7E8B80", "#5F6E7E", "#A8724C", "#8A4F42"];
const AWNING_COLORS = ["#2F6B4F", "#9C4A3A", "#1F3A5F", "#B8892E", "#5F6B73", "#0F766E"];
const SIGN_COLORS = ["#FDE68A", "#BFDBFE", "#FECACA", "#BBF7D0", "#FFFFFF", "#E9D5FF", "#FED7AA"];

/**
 * One merged mesh for a set of buildings, with world-scaled UVs so window bays
 * keep a real-world size. Groups: 0 facade, 1 roof, 2 shopfront.
 */
function buildBlocks(list: Bld[], rand: () => number): BlockOut {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const groups: number[][] = [[], [], []];
  const c = new THREE.Color();
  const out: BlockOut = { geo: new THREE.BufferGeometry(), tanks: [], units: [], roofs: [], awnings: [] };
  let vc = 0;

  const quad = (
    group: number,
    pts: [number, number, number][],
    n: [number, number, number],
    uvs: [number, number][],
    color: THREE.Color
  ) => {
    for (let i = 0; i < 4; i++) {
      pos.push(...pts[i]);
      nor.push(...n);
      uv.push(...uvs[i]);
      col.push(color.r, color.g, color.b);
    }
    groups[group].push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    vc += 4;
  };

  const q = new THREE.Quaternion();
  const awningTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.38);
  for (const b of list) {
    const hw = b.w / 2;
    const hd = b.d / 2;
    const y0 = BASE_Y - 0.02;
    const top = y0 + b.floors * FLOOR + (b.pitched ? 0 : 0.5);
    const vTop = (top - y0) / FLOOR;
    const uW = b.w / FLOOR;
    const uD = b.d / FLOOR;
    c.set(b.tint);
    const { x, z } = b;
    // +z
    quad(0, [[x - hw, y0, z + hd], [x + hw, y0, z + hd], [x + hw, top, z + hd], [x - hw, top, z + hd]], [0, 0, 1], [[0, 0], [uW, 0], [uW, vTop], [0, vTop]], c);
    // -z
    quad(0, [[x + hw, y0, z - hd], [x - hw, y0, z - hd], [x - hw, top, z - hd], [x + hw, top, z - hd]], [0, 0, -1], [[0, 0], [uW, 0], [uW, vTop], [0, vTop]], c);
    // +x
    quad(0, [[x + hw, y0, z + hd], [x + hw, y0, z - hd], [x + hw, top, z - hd], [x + hw, top, z + hd]], [1, 0, 0], [[0, 0], [uD, 0], [uD, vTop], [0, vTop]], c);
    // -x
    quad(0, [[x - hw, y0, z - hd], [x - hw, y0, z + hd], [x - hw, top, z + hd], [x - hw, top, z - hd]], [-1, 0, 0], [[0, 0], [uD, 0], [uD, vTop], [0, vTop]], c);

    if (b.pitched) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, top, z),
        q,
        new THREE.Vector3((hw + 0.38) / Math.SQRT1_2, 1.25 + rand() * 0.4, (hd + 0.38) / Math.SQRT1_2)
      );
      out.roofs.push({ m, color: b.roof ?? ROOF_COLORS[Math.floor(rand() * ROOF_COLORS.length)] });
    } else {
      const shade = 0.93 + rand() * 0.07;
      quad(1, [[x - hw, top, z + hd], [x + hw, top, z + hd], [x + hw, top, z - hd], [x - hw, top, z - hd]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], new THREE.Color(shade, shade, shade));
      // rooftop water tank (very common on Philippine roofs) and AC units
      if (b.w > 3 && b.d > 3) {
        const tx = x + (rand() - 0.5) * (b.w - 2);
        const tz = z + (rand() - 0.5) * (b.d - 2);
        out.tanks.push(new THREE.Matrix4().compose(new THREE.Vector3(tx, top, tz), q, new THREE.Vector3(1, 0.9 + rand() * 0.4, 1)));
        const units = 1 + Math.floor(rand() * 2);
        for (let i = 0; i < units; i++) {
          const ux = x + (rand() - 0.5) * (b.w - 1.6);
          const uz = z + (rand() - 0.5) * (b.d - 1.6);
          if (Math.hypot(ux - tx, uz - tz) < 1.3) continue;
          out.units.push(new THREE.Matrix4().compose(new THREE.Vector3(ux, top, uz), q, new THREE.Vector3(1, 1, 1)));
        }
      }
    }

    if (b.shop) {
      const sw = b.w - 0.3;
      const sc = new THREE.Color(SIGN_COLORS[Math.floor(rand() * SIGN_COLORS.length)]);
      const zf = z + hd + 0.04;
      quad(
        2,
        [[x - sw / 2, y0, zf], [x + sw / 2, y0, zf], [x + sw / 2, y0 + 3.0, zf], [x - sw / 2, y0 + 3.0, zf]],
        [0, 0, 1],
        [[0, 0], [sw / 4, 0], [sw / 4, 1], [0, 1]],
        sc
      );
      const am = new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + 2.18, z + hd + 0.55), awningTilt, new THREE.Vector3(sw - 0.3, 1, 1));
      out.awnings.push({ m: am, color: AWNING_COLORS[Math.floor(rand() * AWNING_COLORS.length)] });
    }
  }

  const geo = out.geo;
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const index = [...groups[0], ...groups[1], ...groups[2]];
  geo.setIndex(index);
  geo.addGroup(0, groups[0].length, 0);
  geo.addGroup(groups[0].length, groups[1].length, 1);
  geo.addGroup(groups[0].length + groups[1].length, groups[2].length, 2);
  geo.computeBoundingSphere();
  return out;
}

/** Coconut palm frond: arched ribbon folded into an inverted V, UVs for the leaflet texture. */
function frondGeometry(length: number, rise: number, droop: number, width: number) {
  const N = 14;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= N; r++) {
    const t = r / N;
    const px = length * t;
    const py = length * (rise * t - droop * t * t);
    const w = width * Math.max(0.12, Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.04)), 0.7));
    const hang = w * 0.42;
    pos.push(px, py - hang, -w, px, py + 0.05, 0, px, py - hang, w);
    uv.push(0, t, 0.5, t, 1, t);
    if (r < N) {
      const a = r * 3;
      const b = a + 3;
      idx.push(a, a + 1, b + 1, a, b + 1, b, a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Smooth lumpy canopy from several displaced spheres, shaded darker underneath. */
function canopyGeometry(blobs: [number, number, number, number][], base: string, seed: number) {
  const parts: THREE.BufferGeometry[] = [];
  const baseColor = new THREE.Color(base);
  const tmp = new THREE.Color();
  blobs.forEach(([bx, by, bz, r], bi) => {
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 3);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    g = mergeVertices(g);
    const p = g.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n =
        1 +
        0.13 * Math.sin(x * 3.1 + y * 2.3 + seed + bi) * Math.cos(z * 2.7 - y * 1.9) +
        0.06 * Math.sin(x * 7.3 - z * 6.1 + bi * 3);
      p.setXYZ(i, bx + x * n, by + y * n * 0.92, bz + z * n);
      const light = 0.62 + 0.5 * clamp01((y / r + 1) / 2) + 0.06 * Math.sin(x * 5 + z * 4);
      tmp.copy(baseColor).multiplyScalar(light);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    parts.push(g);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

/* ------------------------------------------------------------------ */
/* Scene factory                                                       */
/* ------------------------------------------------------------------ */

export function createJourneyScene(host: HTMLElement, options: SceneOptions = {}): JourneyScene {
  const width0 = Math.max(1, host.clientWidth);
  const height0 = Math.max(1, host.clientHeight);
  let layout = computeLayout(width0, height0);

  // Throws if WebGL is unavailable; the caller falls back to the static layout.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, layout.compact ? 1.5 : 1.75));
  renderer.setSize(width0, height0, false);
  renderer.setClearColor(COLORS.cityBg, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.setAttribute("aria-hidden", "true");

  const handleLost = (event: Event) => {
    event.preventDefault();
    options.onContextLost?.();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const makeTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (ctx) draw(ctx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    textures.push(tex);
    return tex;
  };

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.cityBg.clone(), 18, 90);

  const camera = new THREE.PerspectiveCamera(FOV, width0 / height0, 0.8, 900);

  /* Lights ---------------------------------------------------------- */
  const hemi = new THREE.HemisphereLight(0xfdfbf6, 0xcfc6b4, 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
  const SUN_OFFSET = new THREE.Vector3(-26, 50, 34);
  const SHADOW_HALF = 34;
  sun.castShadow = true;
  sun.shadow.mapSize.set(layout.compact ? 1024 : 2048, layout.compact ? 1024 : 2048);
  sun.shadow.camera.left = -SHADOW_HALF;
  sun.shadow.camera.right = SHADOW_HALF;
  sun.shadow.camera.top = SHADOW_HALF;
  sun.shadow.camera.bottom = -SHADOW_HALF;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.35);
  fill.position.set(40, 25, -30);
  scene.add(fill);
  // Fixed light-space basis so the shadow focus can be snapped to texels (no shimmering).
  const sunZ = SUN_OFFSET.clone().normalize();
  const sunX = new THREE.Vector3(0, 1, 0).cross(sunZ).normalize();
  const sunY = sunZ.clone().cross(sunX).normalize();
  // Day light for the city, low golden light for the last-mile ride.
  const SUN_DAY = SUN_OFFSET.clone();
  const SUN_GOLD = new THREE.Vector3(-40, 27, 30);
  let sunMode = 0;
  const setSunMode = (mode: number) => {
    if (mode === sunMode) return;
    sunMode = mode;
    SUN_OFFSET.copy(mode ? SUN_GOLD : SUN_DAY);
    sunZ.copy(SUN_OFFSET).normalize();
    sunX.set(0, 1, 0).cross(sunZ).normalize();
    sunY.copy(sunZ).cross(sunX).normalize();
    sun.color.set(mode ? 0xffd2a1 : 0xfff3e0);
    sun.intensity = mode ? 2.5 : 2.1;
    hemi.color.set(mode ? 0xffeedd : 0xfdfbf6);
    hemi.groundColor.set(mode ? 0xc9b08f : 0xcfc6b4);
    hemi.intensity = mode ? 1.3 : 1.45;
  };

  const city = new THREE.Group();
  scene.add(city);
  const rand = mulberry32(20261113);

  const cast = (o: THREE.Object3D, receive = true) => {
    o.castShadow = true;
    o.receiveShadow = receive;
    return o;
  };

  /* Ground, platforms, roads --------------------------------------- */
  const groundMat = new THREE.MeshLambertMaterial({ color: "#E6E2D8" });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(XI, 0, 10);
  ground.receiveShadow = true;
  city.add(ground);

  const pavingTex = makeTexture(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = "#F4F2EC";
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "rgba(120,110,95,0.16)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 128; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 128);
        ctx.moveTo(0, i);
        ctx.lineTo(128, i);
        ctx.stroke();
      }
    },
    true
  );
  pavingTex.repeat.set(0.5, 0.5);
  const platformCap = new THREE.MeshLambertMaterial({ map: pavingTex });
  const platformSide = new THREE.MeshLambertMaterial({ color: "#C9C4B8" });
  const roundedRectShape = (w: number, d: number, r: number) => {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const addPlatform = (x0: number, x1: number, z0: number, z1: number, parent: THREE.Object3D = city) => {
    const g = new THREE.ExtrudeGeometry(roundedRectShape(x1 - x0, z1 - z0, 1.4), {
      depth: BASE_Y,
      bevelEnabled: false,
      curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, [platformCap, platformSide]);
    m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    m.receiveShadow = true;
    parent.add(m);
  };
  addPlatform(-90, XI - ROAD_HALF, -70, -ROAD_HALF);
  addPlatform(XI + ROAD_HALF, XI + 90, -70, -ROAD_HALF);
  addPlatform(-90, XI - ROAD_HALF, ROAD_HALF, 90);
  addPlatform(XI + ROAD_HALF, XI + 90, ROAD_HALF, 90);

  const asphaltTex = makeTexture(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = "#2E3138";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) {
        const v = Math.floor(rand() * 40);
        ctx.fillStyle = `rgba(${70 + v},${72 + v},${78 + v},0.35)`;
        ctx.fillRect(rand() * 256, rand() * 256, 1.5, 1.5);
      }
    },
    true
  );
  asphaltTex.repeat.set(0.25, 0.25);
  const asphalt = new THREE.MeshLambertMaterial({ map: asphaltTex });
  const addRoad = (x0: number, x1: number, z0: number, z1: number, parent: THREE.Object3D = city) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    // world-space UVs so the grain does not stretch
    const uvAttr = g.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) uvAttr.setXY(i, uvAttr.getX(i) * (x1 - x0), uvAttr.getY(i) * (z1 - z0));
    const m = new THREE.Mesh(g, asphalt);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2);
    m.receiveShadow = true;
    parent.add(m);
  };
  addRoad(-90, XI - ROAD_HALF, -ROAD_HALF, ROAD_HALF);
  addRoad(XI + ROAD_HALF, XI + 90, -ROAD_HALF, ROAD_HALF);
  addRoad(XI - ROAD_HALF, XI + ROAD_HALF, -70, 90);

  // Road markings: lane dashes, edge lines and crosswalks in one instanced mesh.
  const markingMat = new THREE.MeshLambertMaterial({
    color: "#F1F0EA",
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const markingGeo = new THREE.PlaneGeometry(1, 1);
  markingGeo.rotateX(-Math.PI / 2);
  const markings: THREE.Matrix4[] = [];
  const mq = new THREE.Quaternion();
  const mAlongZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const addMark = (x: number, z: number, len: number, wid: number, alongZ: boolean) => {
    const mat = new THREE.Matrix4();
    mat.compose(new THREE.Vector3(x, 0.02, z), alongZ ? mAlongZ : mq, new THREE.Vector3(len, 1, wid));
    markings.push(mat);
  };
  for (let x = -60; x < XI - ROAD_HALF - 2.5; x += 3.4) addMark(x, 0, 1.7, 0.16, false);
  for (let x = XI + ROAD_HALF + 3; x < XI + 70; x += 3.4) addMark(x, 0, 1.7, 0.16, false);
  for (let z = ROAD_HALF + 3; z < 80; z += 3.4) addMark(XI, z, 1.7, 0.16, true);
  for (let z = -ROAD_HALF - 3; z > -60; z -= 3.4) addMark(XI, z, 1.7, 0.16, true);
  const edgeLen = XI - ROAD_HALF - 1.6 + 70;
  addMark(-70 + edgeLen / 2, ROAD_HALF - 0.32, edgeLen, 0.12, false);
  addMark(-70 + edgeLen / 2, -ROAD_HALF + 0.32, edgeLen, 0.12, false);
  addMark(XI - ROAD_HALF + 0.32, ROAD_HALF + 1.6 + 35, 70, 0.12, true);
  addMark(XI + ROAD_HALF - 0.32, ROAD_HALF + 1.6 + 35, 70, 0.12, true);
  for (let i = 0; i < 6; i++) {
    const o = -2.5 + i;
    addMark(XI + o, ROAD_HALF + 1.25, 0.5, 1.5, false);
    addMark(XI + o, -ROAD_HALF - 1.25, 0.5, 1.5, false);
    addMark(XI - ROAD_HALF - 1.25, o, 1.5, 0.5, false);
    addMark(XI + ROAD_HALF + 1.25, o, 1.5, 0.5, false);
  }
  const markingMesh = new THREE.InstancedMesh(markingGeo, markingMat, markings.length);
  markings.forEach((m, i) => markingMesh.setMatrixAt(i, m));
  markingMesh.receiveShadow = true;
  city.add(markingMesh);

  /* Buildings ------------------------------------------------------- */
  const facadeTex = makeTexture(256, 256, drawFacade, true);
  const shopTex = makeTexture(512, 256, drawShopfront, true);
  const roofTex = makeTexture(256, 256, (ctx) => drawRoof(ctx, rand));
  const facadeMat = new THREE.MeshLambertMaterial({ map: facadeTex, vertexColors: true });
  const roofMat = new THREE.MeshLambertMaterial({ map: roofTex, vertexColors: true });
  const shopMat = new THREE.MeshLambertMaterial({ map: shopTex, vertexColors: true });
  const blockMats = [facadeMat, roofMat, shopMat];
  const tints = ["#EFE7D8", "#E6DCCB", "#F2EDE4", "#DCE3DF", "#EAD9C6", "#E3E6EA", "#F0E2CF", "#D9D2C6"];
  const tint = () => tints[Math.floor(rand() * tints.length)];

  const tankGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.05, 16);
  tankGeo.translate(0, 0.62, 0);
  const tankMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const tankColors = ["#2F5D8A", "#E5E7EB", "#1F2937", "#2F5D8A"];
  const unitGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
  unitGeo.translate(0, 0.25, 0);
  const unitMat = new THREE.MeshLambertMaterial({ color: "#D4D7DC" });
  const hipGeo = new THREE.ConeGeometry(1, 1, 4, 1);
  hipGeo.rotateY(Math.PI / 4);
  hipGeo.translate(0, 0.5, 0);
  const hipMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const awningGeo = new THREE.BoxGeometry(1, 0.08, 1.15);
  const awningMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const tmpColor = new THREE.Color();

  const addBlocks = (list: Bld[], parent: THREE.Object3D) => {
    const out = buildBlocks(list, rand);
    parent.add(cast(new THREE.Mesh(out.geo, blockMats)));
    if (out.tanks.length) {
      const tanks = new THREE.InstancedMesh(tankGeo, tankMat, out.tanks.length);
      out.tanks.forEach((m, i) => {
        tanks.setMatrixAt(i, m);
        tanks.setColorAt(i, tmpColor.set(tankColors[Math.floor(rand() * tankColors.length)]));
      });
      parent.add(cast(tanks));
    }
    if (out.units.length) {
      const units = new THREE.InstancedMesh(unitGeo, unitMat, out.units.length);
      out.units.forEach((m, i) => units.setMatrixAt(i, m));
      parent.add(cast(units));
    }
    if (out.roofs.length) {
      const roofs = new THREE.InstancedMesh(hipGeo, hipMat, out.roofs.length);
      out.roofs.forEach((r, i) => {
        roofs.setMatrixAt(i, r.m);
        roofs.setColorAt(i, tmpColor.set(r.color));
      });
      parent.add(cast(roofs));
    }
    if (out.awnings.length) {
      const aw = new THREE.InstancedMesh(awningGeo, awningMat, out.awnings.length);
      out.awnings.forEach((a, i) => {
        aw.setMatrixAt(i, a.m);
        aw.setColorAt(i, tmpColor.set(a.color));
      });
      parent.add(cast(aw));
    }
  };

  const farBlocks: Bld[] = [];
  const addRow = (x0: number, x1: number, front: number, dMin: number, dMax: number, fMin: number, fMax: number, shop: boolean) => {
    let x = x0;
    while (x < x1) {
      const w = 4 + rand() * 4;
      const d = dMin + rand() * (dMax - dMin);
      if (x + w > x1) break;
      farBlocks.push({
        x: x + w / 2,
        z: front - d / 2,
        w,
        d,
        floors: fMin + Math.floor(rand() * (fMax - fMin + 1)),
        shop,
        pitched: false,
        tint: tint(),
      });
      x += w + 0.25 + rand() * 0.9;
    }
  };
  addRow(-48, XI - ROAD_HALF - 2.5, -6.2, 5, 7, 2, 3, true);
  addRow(-48, XI - ROAD_HALF - 2.5, -14.4, 6, 8, 3, 5, false);
  addRow(-48, XI - ROAD_HALF - 2.5, -24, 7, 9, 4, 6, false);
  addRow(XI + ROAD_HALF + 2.5, XI + 60, -6.2, 5, 7, 2, 3, true);
  addRow(XI + ROAD_HALF + 2.5, XI + 60, -14.4, 6, 8, 3, 5, false);
  addBlocks(farBlocks, city);

  /* Palms ----------------------------------------------------------- */
  const barkTex = makeTexture(64, 256, drawBark, true);
  barkTex.repeat.set(1, 7);
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.26, 8, 10, 16);
  trunkGeo.translate(0, 4, 0);
  {
    const p = trunkGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const bulge = y < 0.8 ? 1 + (0.8 - y) * 0.35 : 1;
      p.setXYZ(i, p.getX(i) * bulge + Math.pow(y / 8, 2) * 1.1, y, p.getZ(i) * bulge);
    }
    trunkGeo.computeVertexNormals();
  }
  const CROWN = new THREE.Vector3(1.1, 7.95, 0);
  const frondTex = makeTexture(128, 512, (ctx) => drawFrond(ctx, rand));
  const frondParts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 12; k++) {
    const young = k % 4 === 0;
    const g = young
      ? frondGeometry(2.9 + rand() * 0.4, 0.95, 0.55, 0.55)
      : frondGeometry(3.9 + rand() * 0.6, 0.45 + rand() * 0.2, 1.0 + rand() * 0.35, 0.72);
    g.rotateX((rand() - 0.5) * 0.35);
    g.rotateY((k * Math.PI * 2) / 12 + rand() * 0.25);
    g.translate(CROWN.x, CROWN.y, CROWN.z);
    frondParts.push(g);
  }
  const frondGeo = mergeGeometries(frondParts);
  frondParts.forEach((g) => g.dispose());
  const nutParts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const g = new THREE.SphereGeometry(0.17, 10, 8);
    const a = (k / 5) * Math.PI * 2;
    g.translate(CROWN.x + Math.cos(a) * 0.24, CROWN.y - 0.32 - (k % 2) * 0.12, Math.sin(a) * 0.24);
    nutParts.push(g);
  }
  const nutGeo = mergeGeometries(nutParts);
  nutParts.forEach((g) => g.dispose());
  const trunkMat = new THREE.MeshLambertMaterial({ map: barkTex });
  const frondMat = new THREE.MeshLambertMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide });
  const nutMat = new THREE.MeshLambertMaterial({ color: "#6E6A33" });

  interface Plant {
    x: number;
    z: number;
    s: number;
    r: number;
  }
  const addPalms = (list: Plant[], parent: THREE.Object3D) => {
    if (!list.length) return;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
    const fronds = new THREE.InstancedMesh(frondGeo, frondMat, list.length);
    const nuts = new THREE.InstancedMesh(nutGeo, nutMat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((pl, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.r);
      m.compose(new THREE.Vector3(pl.x, BASE_Y, pl.z), q, new THREE.Vector3(pl.s, pl.s, pl.s));
      trunks.setMatrixAt(i, m);
      fronds.setMatrixAt(i, m);
      nuts.setMatrixAt(i, m);
    });
    parent.add(cast(trunks), cast(fronds), cast(nuts));
  };

  /* Broadleaf trees and bushes --------------------------------------- */
  const treeCanopy = canopyGeometry(
    [
      [0, 4.1, 0, 1.55],
      [1.05, 3.6, 0.45, 1.15],
      [-0.95, 3.7, -0.35, 1.2],
      [0.25, 3.45, -1.05, 1.05],
      [-0.35, 3.5, 1.0, 1.05],
      [0.1, 4.85, 0.2, 1.0],
    ],
    "#6F9C5C",
    1.7
  );
  const treeTrunkParts: THREE.BufferGeometry[] = [];
  {
    const main = new THREE.CylinderGeometry(0.13, 0.22, 3.4, 8);
    main.translate(0, 1.7, 0);
    treeTrunkParts.push(main);
    for (const [ang, tilt] of [
      [0.4, 0.6],
      [2.5, 0.55],
      [4.4, 0.65],
    ]) {
      const br = new THREE.CylinderGeometry(0.05, 0.09, 1.5, 6);
      br.translate(0, 0.75, 0);
      br.rotateZ(tilt);
      br.rotateY(ang);
      br.translate(0, 2.4, 0);
      treeTrunkParts.push(br);
    }
  }
  const treeTrunkGeo = mergeGeometries(treeTrunkParts);
  treeTrunkParts.forEach((g) => g.dispose());
  const bushGeo = canopyGeometry(
    [
      [0, 0.62, 0, 0.75],
      [0.62, 0.48, 0.18, 0.55],
      [-0.58, 0.5, -0.12, 0.58],
      [0.05, 0.45, 0.6, 0.5],
    ],
    "#6D9A58",
    4.2
  );
  const foliageMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const woodMat = new THREE.MeshLambertMaterial({ color: "#6B5643" });
  const greenTints = ["#FFFFFF", "#E8F2DE", "#F4F7E8", "#DDEBD3", "#FAF6E6"];

  const addTrees = (list: Plant[], parent: THREE.Object3D) => {
    if (!list.length) return;
    const crowns = new THREE.InstancedMesh(treeCanopy, foliageMat, list.length);
    const trunks = new THREE.InstancedMesh(treeTrunkGeo, woodMat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((pl, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.r);
      m.compose(new THREE.Vector3(pl.x, BASE_Y, pl.z), q, new THREE.Vector3(pl.s, pl.s, pl.s));
      crowns.setMatrixAt(i, m);
      trunks.setMatrixAt(i, m);
      crowns.setColorAt(i, tmpColor.set(greenTints[Math.floor(rand() * greenTints.length)]));
    });
    parent.add(cast(crowns), cast(trunks));
  };
  const addBushes = (list: Plant[], parent: THREE.Object3D) => {
    if (!list.length) return;
    const bushes = new THREE.InstancedMesh(bushGeo, foliageMat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((pl, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.r);
      m.compose(new THREE.Vector3(pl.x, BASE_Y - 0.05, pl.z), q, new THREE.Vector3(pl.s, pl.s * 0.9, pl.s));
      bushes.setMatrixAt(i, m);
      bushes.setColorAt(i, tmpColor.set(greenTints[Math.floor(rand() * greenTints.length)]));
    });
    parent.add(cast(bushes));
  };

  const farPalms: Plant[] = [];
  for (let x = -40; x < XI - ROAD_HALF - 3; x += 7.5 + rand() * 4) {
    farPalms.push({ x, z: -4.75, s: 0.88 + rand() * 0.25, r: rand() * Math.PI * 2 });
  }
  for (let x = XI + ROAD_HALF + 5; x < XI + 50; x += 8 + rand() * 4) {
    farPalms.push({ x, z: -4.75, s: 0.85 + rand() * 0.25, r: rand() * Math.PI * 2 });
  }
  addPalms(farPalms, city);

  // Street lamps along the far kerb.
  {
    const parts: THREE.BufferGeometry[] = [];
    const pole = new THREE.CylinderGeometry(0.06, 0.09, 5.6, 8);
    pole.translate(0, 2.8, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.5);
    arm.translate(0, 5.5, 0.72);
    const head = new THREE.BoxGeometry(0.34, 0.12, 0.56);
    head.translate(0, 5.44, 1.4);
    parts.push(pole, arm, head);
    const lampGeo = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    const lampPositions: number[] = [];
    for (let x = -36; x < XI - ROAD_HALF - 3; x += 13) lampPositions.push(x + 3.2);
    const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshLambertMaterial({ color: "#5B626C" }), lampPositions.length);
    const m = new THREE.Matrix4();
    lampPositions.forEach((x, i) => {
      m.makeTranslation(x, BASE_Y, -4.1);
      lamps.setMatrixAt(i, m);
    });
    city.add(cast(lamps));
  }

  // Low hedges along the near kerb so the side view has a foreground.
  const nearBushes: Plant[] = [];
  for (let x = -30; x < 40; x += 3.5 + rand() * 3.5) {
    if (x > -3 && x < 21) continue; // keep the sign area clean
    nearBushes.push({ x, z: 5.0 + rand() * 0.8, s: 0.75 + rand() * 0.35, r: rand() * 6 });
  }
  addBushes(nearBushes, city);

  /* Big background lettering --------------------------------------- */
  const letterTex = makeTexture(2048, 256, (ctx) => {
    ctx.clearRect(0, 0, 2048, 256);
    const text = "Shop local. Ship nationwide.";
    let size = 190;
    ctx.font = `800 ${size}px ${FONT}`;
    const w = ctx.measureText(text).width;
    if (w > 1980) {
      size = Math.floor((size * 1980) / w);
      ctx.font = `800 ${size}px ${FONT}`;
    }
    ctx.fillStyle = "#D9D3C6";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 20, 134);
  });
  const letterMat = new THREE.MeshBasicMaterial({ map: letterTex, transparent: true, fog: false, depthWrite: false });
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(110, 13.75), letterMat);
  letters.position.set(30, 21, -44);
  letters.renderOrder = -1;
  city.add(letters);

  /* Service signboards --------------------------------------------- */
  const POST = 0.55;
  const signBoardGeo = new THREE.BoxGeometry(2.9, 1.9, 0.12);
  const signFaceGeo = new THREE.PlaneGeometry(2.84, 1.84);
  const postGeo = new THREE.CylinderGeometry(0.055, 0.055, POST + 0.9, 8);
  postGeo.translate(0, (POST + 0.9) / 2, 0);
  const signBackMat = new THREE.MeshLambertMaterial({ color: "#111827" });
  const postMat = new THREE.MeshLambertMaterial({ color: "#7B8494" });
  const signs = SERVICE_SIGNS.map((info) => {
    const tex = makeTexture(640, 416, (ctx) => {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, 640, 416);
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(84, 86, 46, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, info.icon, 84, 86, 48);
      ctx.fillStyle = "#6EE7B7";
      ctx.font = `700 34px ${FONT}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(info.num, 596, 86);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 58px ${FONT}`;
      ctx.fillText(info.title, 40, 236);
      ctx.fillStyle = "#CBD5E1";
      ctx.font = `500 34px ${FONT}`;
      ctx.fillText(info.lines[0], 40, 296);
      ctx.fillText(info.lines[1], 40, 342);
      ctx.fillStyle = "#10B981";
      ctx.fillRect(0, 404, 640, 12);
    });
    const group = new THREE.Group();
    const inner = new THREE.Group();
    const board = new THREE.Mesh(signBoardGeo, signBackMat);
    board.position.y = BASE_Y + POST + 0.95;
    const face = new THREE.Mesh(signFaceGeo, new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(0, board.position.y, 0.061);
    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-0.95, BASE_Y, -0.02);
    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(0.95, BASE_Y, -0.02);
    inner.add(cast(board, false), face, cast(postL, false), cast(postR, false));
    group.add(inner);
    city.add(group);
    return { group, inner };
  });
  const placeSigns = () => {
    signs.forEach((sg, i) => {
      if (layout.compact) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        sg.group.position.set(3.4 + (col - 0.5) * 4.1, 0, 8.4 + row * 5);
        sg.group.scale.setScalar(1.3);
      } else {
        sg.group.position.set(10.9 + (i - 1.5) * 3.22, 0, 10.4);
        sg.group.scale.setScalar(1);
      }
    });
  };
  placeSigns();

  /* Delivery van ----------------------------------------------------- */
  const logoTex = makeTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = "#111827";
    roundRect(ctx, 70, 120, 200, 200, 44);
    ctx.fill();
    drawBag(ctx, 115, 158, 110, "#FFFFFF");
    ctx.fillStyle = "#111827";
    ctx.font = `800 150px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Shopply", 305, 272);
    ctx.fillStyle = "#059669";
    ctx.font = `700 50px ${FONT}`;
    ctx.fillText("Delivered nationwide", 310, 352);
  });
  const vanRoofTex = makeTexture(512, 300, (ctx) => {
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 512, 300);
    ctx.fillStyle = "#059669";
    ctx.fillRect(0, 0, 512, 26);
    ctx.fillRect(0, 274, 512, 26);
    ctx.fillStyle = "#111827";
    roundRect(ctx, 196, 90, 120, 120, 26);
    ctx.fill();
    drawBag(ctx, 223, 113, 66, "#FFFFFF");
  });
  const buildVan = () => {
  const van = new THREE.Group();
  const vanBody = new THREE.Group();
  van.add(vanBody);
  const whiteMat = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.42 });
  const cabMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.38, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#2C3A4F", roughness: 0.12, metalness: 0.35 });
  const greenMat = new THREE.MeshStandardMaterial({ color: "#059669", roughness: 0.45 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#1C1D21", roughness: 0.92 });
  const hubMat = new THREE.MeshStandardMaterial({ color: "#C9CED6", roughness: 0.4, metalness: 0.3 });
  const lampMat = new THREE.MeshBasicMaterial({ color: "#FFF6D5" });
  const tailMat = new THREE.MeshBasicMaterial({ color: "#E11D48" });
  {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.32, 1.86), cabMat);
    chassis.position.set(0, 0.74, 0);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.3, 2.1), whiteMat);
    cargo.position.set(-0.8, 2.04, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.16, 2.12), greenMat);
    stripe.position.set(-0.8, 1.02, 0);
    const logoGeo = new THREE.PlaneGeometry(3.2, 1.6);
    const logoMat = new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.5 });
    const logoR = new THREE.Mesh(logoGeo, logoMat);
    logoR.position.set(-0.8, 2.12, 1.052);
    const logoL = new THREE.Mesh(logoGeo, logoMat);
    logoL.position.set(-0.8, 2.12, -1.052);
    logoL.rotation.y = Math.PI;
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.94), new THREE.MeshStandardMaterial({ map: vanRoofTex, roughness: 0.5 }));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(-0.8, 3.192, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.62, 2.0), cabMat);
    cab.position.set(1.72, 1.6, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 1.96), cabMat);
    hood.position.set(2.48, 1.12, 0);
    const shield = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.66), glassMat);
    shield.position.set(2.475, 1.95, 0);
    shield.rotation.y = Math.PI / 2;
    const winGeo = new THREE.PlaneGeometry(0.95, 0.6);
    const winR = new THREE.Mesh(winGeo, glassMat);
    winR.position.set(1.85, 1.95, 1.003);
    const winL = new THREE.Mesh(winGeo, glassMat);
    winL.position.set(1.85, 1.95, -1.003);
    winL.rotation.y = Math.PI;
    const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 2.02), greenMat);
    cabStripe.position.set(1.72, 1.02, 0);
    const lampGeo = new THREE.BoxGeometry(0.06, 0.18, 0.42);
    const lampR = new THREE.Mesh(lampGeo, lampMat);
    lampR.position.set(2.74, 1.2, 0.68);
    const lampL = lampR.clone();
    lampL.position.z = -0.68;
    const tailGeo = new THREE.BoxGeometry(0.06, 0.34, 0.16);
    const tailR = new THREE.Mesh(tailGeo, tailMat);
    tailR.position.set(-2.51, 1.3, 0.86);
    const tailL = tailR.clone();
    tailL.position.z = -0.86;
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 2.02), tireMat);
    bumper.position.set(2.76, 0.78, 0);
    for (const part of [chassis, cargo, cab, hood]) cast(part, false);
    vanBody.add(chassis, cargo, stripe, logoR, logoL, roof, cab, hood, shield, winR, winL, cabStripe, lampR, lampL, tailR, tailL, bumper);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 24);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.36, 12);
  hubGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.36, 0.08, 0.37);
  const wheels: THREE.Group[] = [];
  for (const [x, z] of [
    [1.62, 0.86],
    [1.62, -0.86],
    [-1.6, 0.86],
    [-1.6, -0.86],
  ]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(hubGeo, hubMat), new THREE.Mesh(spokeGeo, tireMat));
    w.position.set(x, 0.47, z);
    van.add(w);
    wheels.push(w);
  }
  const shadowTex = makeTexture(256, 128, (ctx) => {
    const g = ctx.createRadialGradient(128, 64, 8, 128, 64, 124);
    g.addColorStop(0, "rgba(17,24,39,0.5)");
    g.addColorStop(0.55, "rgba(17,24,39,0.18)");
    g.addColorStop(1, "rgba(17,24,39,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.translate(0, 64);
    ctx.fillRect(0, 0, 256, 256);
    ctx.restore();
  });
  const blobMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.7 });
  const vanShadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.9), blobMat);
  vanShadow.rotation.x = -Math.PI / 2;
  vanShadow.position.y = 0.03;
  van.add(vanShadow);
  return { van, vanBody, wheels };
  };
  const { van, vanBody, wheels } = buildVan();
  city.add(van);

  /* Route trail (top-down view) ------------------------------------- */
  const TRAIL_S0 = L1 - 16;
  const TRAIL_N = 180;
  const trailGeo = new THREE.BufferGeometry();
  {
    const verts = new Float32Array(TRAIL_N * 2 * 3);
    const idx: number[] = [];
    const pt: PathPoint = { x: 0, z: 0, tx: 1, tz: 0 };
    for (let i = 0; i < TRAIL_N; i++) {
      const s = TRAIL_S0 + ((S_END - TRAIL_S0) * i) / (TRAIL_N - 1);
      pathAt(s, pt);
      const nx = -pt.tz * 0.17;
      const nz = pt.tx * 0.17;
      verts.set([pt.x + nx, 0.025, pt.z + nz, pt.x - nx, 0.025, pt.z - nz], i * 6);
      if (i < TRAIL_N - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    trailGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    trailGeo.setIndex(idx);
  }
  const trailMat = new THREE.MeshBasicMaterial({
    color: COLORS.greenSoft,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.renderOrder = 1;
  city.add(trail);

  /* Tracking markers -------------------------------------------------- */
  const markerBaseGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 28);
  const markerDotGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 18);
  const markerIdle = new THREE.Color("#C5CCD6");
  const markerDone = new THREE.Color(COLORS.green);
  const markers = MARKER_Z.map((z) => {
    const mat = new THREE.MeshLambertMaterial({ color: markerIdle.clone() });
    const base = new THREE.Mesh(markerBaseGeo, mat);
    const dot = new THREE.Mesh(markerDotGeo, new THREE.MeshBasicMaterial({ color: "#FFFFFF" }));
    base.position.set(MARKER_X, 0.3, z);
    dot.position.set(MARKER_X, 0.32, z);
    city.add(base, dot);
    return mat;
  });

  /* Neighbourhood that grows in around the second road --------------- */
  const grow = new THREE.Group();
  city.add(grow);
  const hubShutter = new THREE.Group();
  {
    const blocks: Bld[] = [];
    const trees: Plant[] = [];
    const bushes: Plant[] = [];
    const palms: Plant[] = [];
    const blocked = (x: number, z: number) =>
      (x > HUB_X - HUB_W / 2 - 4 && x < XI - ROAD_HALF && z > HUB_Z - HUB_D / 2 - 4 && z < HUB_Z + HUB_D / 2 + 6.5) ||
      (x > XI + ROAD_HALF && x < XI + ROAD_HALF + 2.6);
    for (let gx = XI - 32; gx < XI + 38; gx += 7) {
      for (let gz = 8.5; gz < 64; gz += 7) {
        const x = gx + (rand() - 0.5) * 1.0;
        const z = gz + (rand() - 0.5) * 1.0;
        if (Math.abs(x - XI) < ROAD_HALF + 5) continue;
        if (blocked(x, z)) continue;
        const roll = rand();
        if (roll < 0.6) {
          const floors = 1 + Math.floor(rand() * 3);
          blocks.push({
            x,
            z,
            w: 4 + rand() * 2.2,
            d: 4 + rand() * 2.2,
            floors,
            shop: false,
            pitched: floors <= 2 && rand() < 0.6,
            tint: tint(),
          });
          if (rand() < 0.5) bushes.push({ x: x + 3.1, z: z + 2.6, s: 0.7 + rand() * 0.3, r: rand() * 6 });
        } else if (roll < 0.88) {
          trees.push({ x, z, s: 0.8 + rand() * 0.35, r: rand() * 6 });
          if (rand() < 0.6) trees.push({ x: x + 2.4, z: z + 1.6, s: 0.6 + rand() * 0.3, r: rand() * 6 });
        }
      }
    }
    for (let z = 10; z < 62; z += 9) {
      if (z < HUB_Z - HUB_D / 2 - 1 || z > HUB_Z + HUB_D / 2 + 1) palms.push({ x: XI - ROAD_HALF - 1.2, z, s: 0.82 + rand() * 0.18, r: rand() * 6 });
    }
    addBlocks(blocks, grow);
    addTrees(trees, grow);
    addBushes(bushes, grow);
    addPalms(palms, grow);

    // Shopply sorting hub: warehouse with a loading dock facing the road.
    const hub = new THREE.Group();
    const wallTex = makeTexture(
      256,
      256,
      (ctx) => {
        ctx.fillStyle = "#E3E8EC";
        ctx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 16) {
          ctx.fillStyle = "rgba(60,70,80,0.10)";
          ctx.fillRect(x, 0, 3, 256);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillRect(x + 3, 0, 2, 256);
        }
      },
      true
    );
    wallTex.repeat.set(3, 1);
    const hubRoofTex = makeTexture(512, 640, (ctx) => {
      ctx.fillStyle = "#D5DADF";
      ctx.fillRect(0, 0, 512, 640);
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 3;
      for (let y = 40; y < 640; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#059669";
      ctx.fillRect(0, 0, 512, 22);
      ctx.fillRect(0, 618, 512, 22);
      ctx.fillStyle = "#111827";
      roundRect(ctx, 156, 130, 200, 200, 44);
      ctx.fill();
      drawBag(ctx, 201, 168, 110, "#FFFFFF");
      ctx.textAlign = "center";
      ctx.fillStyle = "#111827";
      ctx.font = `800 92px ${FONT}`;
      ctx.fillText("Shopply", 256, 430);
      ctx.fillStyle = "#059669";
      ctx.font = `800 64px ${FONT}`;
      ctx.fillText("SORTING HUB", 256, 506);
    });
    const hubSignTex = makeTexture(512, 128, (ctx) => {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, 512, 128);
      drawBag(ctx, 28, 26, 74, "#FFFFFF");
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 62px ${FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillText("Shopply", 122, 68);
      ctx.fillStyle = "#34D399";
      ctx.fillText("Hub", 378, 68);
    });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const steel = new THREE.MeshLambertMaterial({ color: "#2A2F36" });
    const concrete = new THREE.MeshLambertMaterial({ color: "#CFCBC2" });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(HUB_W, HUB_H, HUB_D), wallMat);
    walls.position.y = BASE_Y + HUB_H / 2;
    const band = new THREE.Mesh(new THREE.BoxGeometry(HUB_W + 0.12, 0.7, HUB_D + 0.12), new THREE.MeshLambertMaterial({ color: "#059669" }));
    band.position.y = BASE_Y + HUB_H - 0.55;
    const hubRoof = new THREE.Mesh(new THREE.PlaneGeometry(HUB_W, HUB_D), new THREE.MeshLambertMaterial({ map: hubRoofTex }));
    hubRoof.rotation.x = -Math.PI / 2;
    hubRoof.position.y = BASE_Y + HUB_H + 0.01;
    hubRoof.receiveShadow = true;
    hub.add(cast(walls), band, hubRoof);
    const EAST = HUB_W / 2;
    for (const bz of [-1.5, 4.2]) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.1, 3.7), steel);
      bay.position.set(EAST + 0.02, BASE_Y + 2.05, bz);
      hub.add(bay);
    }
    const shutterMat = new THREE.MeshLambertMaterial({ color: "#B8C0C8" });
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 3.5), shutterMat);
    shutter.position.y = -2.0;
    hubShutter.add(shutter);
    hubShutter.position.set(EAST + 0.08, BASE_Y + 4.05, -1.5);
    const shutterB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 3.5), shutterMat);
    shutterB.position.set(EAST + 0.08, BASE_Y + 2.05, 4.2);
    const hubSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: hubSignTex }));
    hubSign.rotation.y = Math.PI / 2;
    hubSign.position.set(EAST + 0.09, BASE_Y + 5.1, 1.35);
    const dock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 9.4), concrete);
    dock.position.set(EAST + 1.1, BASE_Y + 0.25, 1.35);
    const dockEdge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 9.4), new THREE.MeshLambertMaterial({ color: "#FACC15" }));
    dockEdge.position.set(EAST + 2.08, BASE_Y + 0.51, 1.35);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 9.8), steel);
    canopy.position.set(EAST + 1.35, BASE_Y + 4.5, 1.35);
    hub.add(hubShutter, shutterB, hubSign, cast(dock), dockEdge, cast(canopy));
    const stack = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.6, 0.75), new THREE.MeshLambertMaterial({ color: "#C9A57A" }), 9);
    const sm = new THREE.Matrix4();
    const sq = new THREE.Quaternion();
    for (let i = 0; i < 9; i++) {
      const layer = i < 5 ? 0 : i < 8 ? 1 : 2;
      const col = layer === 0 ? i : layer === 1 ? i - 5 + 0.5 : 1.5;
      sq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.4);
      sm.compose(new THREE.Vector3(EAST + 0.75 + (rand() - 0.5) * 0.2, BASE_Y + 0.8 + layer * 0.6, 2.6 + col * 0.82), sq, new THREE.Vector3(1, 1, 1));
      stack.setMatrixAt(i, sm);
    }
    hub.add(cast(stack));
    hub.position.set(HUB_X, 0, HUB_Z);
    grow.add(hub);
    const spare = buildVan().van;
    spare.position.set(HUB_X + 1.5, BASE_Y, HUB_Z + HUB_D / 2 + 3.0);
    grow.add(spare);
  }

  // Parcel that hops from the van to the door.
  const parcelGeo = new THREE.BoxGeometry(0.75, 0.6, 0.75);
  const parcelMat = new THREE.MeshLambertMaterial({ color: "#C9A57A" });
  const tapeMat = new THREE.MeshLambertMaterial({ color: "#059669" });
  const makeParcel = (scale: number) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(parcelGeo, parcelMat);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.61, 0.16), tapeMat);
    g.add(cast(box, false), tape);
    g.scale.setScalar(scale);
    return g;
  };
  const parcel = makeParcel(1);
  city.add(parcel);

  /* Clouds ----------------------------------------------------------- */
  const cloudTex = makeTexture(256, 256, (ctx) => {
    const blob = (x: number, y: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.6, `rgba(255,255,255,${a * 0.55})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(128, 140, 110, 0.9);
    blob(85, 120, 70, 0.9);
    blob(170, 112, 76, 0.9);
    blob(128, 92, 66, 0.85);
    blob(60, 150, 50, 0.8);
    blob(196, 150, 50, 0.8);
  });
  const clouds = new THREE.Group();
  scene.add(clouds);
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.95 });
    const sp = new THREE.Sprite(mat);
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * 30;
    sp.position.set(MAP_CENTER.x + Math.cos(a) * r, 44 + i * 5.6 + rand() * 3, MAP_CENTER.z + Math.sin(a) * r);
    const sc = 34 + rand() * 40;
    sp.scale.set(sc, sc * 0.75, 1);
    clouds.add(sp);
  }

  /* Philippine map ---------------------------------------------------- */
  const map = new THREE.Group();
  map.position.copy(MAP_CENTER);
  scene.add(map);
  const toMap = (lon: number, lat: number) => ({ x: (lon - LON_C) * MAP_K * LON_SCALE, z: -(lat - LAT_C) * MAP_K });
  {
    const shapes = PH_ISLANDS.map((ring) => {
      const pts = ring.map(([lon, lat]) => {
        const m = toMap(lon, lat);
        return new THREE.Vector2(m.x, -m.z);
      });
      return new THREE.Shape(pts);
    });
    const islandGeo = new THREE.ExtrudeGeometry(shapes, {
      depth: 1.05,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.22,
      bevelSegments: 2,
      curveSegments: 4,
    });
    islandGeo.rotateX(-Math.PI / 2);
    islandGeo.translate(0, 0.2, 0);
    const islands = new THREE.Mesh(islandGeo, [
      new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: "#CFE3D7", roughness: 0.9 }),
    ]);
    map.add(islands);

    const shadowGeo = new THREE.ShapeGeometry(shapes);
    shadowGeo.rotateX(-Math.PI / 2);
    const islandShadow = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ color: "#9EB6AA", transparent: true, opacity: 0.35, depthWrite: false, fog: false })
    );
    islandShadow.position.set(0.9, 0.01, 0.9);
    map.add(islandShadow);

    const dots: number[] = [];
    for (let x = -160; x <= 160; x += 4.5) {
      for (let z = -160; z <= 160; z += 4.5) dots.push(x, 0, z);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dots, 3));
    const dotMat = new THREE.PointsMaterial({ color: "#C3D2CA", size: 2.2, sizeAttenuation: false, fog: false });
    map.add(new THREE.Points(dotGeo, dotMat));
  }
  const cityPts = MAP_CITIES.map((c) => {
    const m = toMap(c.lon, c.lat);
    return new THREE.Vector3(m.x, ISLAND_TOP, m.z);
  });
  const routeCurve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < cityPts.length - 1; i++) {
    const a = cityPts[i];
    const b = cityPts[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y = ISLAND_TOP + a.distanceTo(b) * 0.38;
    routeCurve.add(new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone()));
  }
  const ROUTE_SEG = 220;
  const ROUTE_RAD = 8;
  const routeGeo = new THREE.TubeGeometry(routeCurve, ROUTE_SEG, 0.42, ROUTE_RAD, false);
  const route = new THREE.Mesh(
    routeGeo,
    new THREE.MeshStandardMaterial({ color: COLORS.green, emissive: "#047857", emissiveIntensity: 0.35, roughness: 0.5 })
  );
  map.add(route);
  const routeIndexCount = routeGeo.index ? routeGeo.index.count : 0;
  const plane = buildPlane();
  plane.rotation.order = "YZX";
  map.add(plane);
  const planeShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: "#5E7A6C", transparent: true, opacity: 0.26, depthWrite: false })
  );
  planeShadow.geometry.rotateX(-Math.PI / 2);
  map.add(planeShadow);

  const pinHeadGeo = new THREE.SphereGeometry(0.95, 24, 16);
  const pinConeGeo = new THREE.ConeGeometry(0.62, 1.8, 20);
  pinConeGeo.rotateX(Math.PI);
  pinConeGeo.translate(0, 0.9, 0);
  const ringGeo = new THREE.RingGeometry(1.1, 1.6, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const pins = cityPts.map((pt, i) => {
    const color = i === cityPts.length - 1 ? COLORS.green : COLORS.ink;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const g = new THREE.Group();
    const cone = new THREE.Mesh(pinConeGeo, mat);
    const head = new THREE.Mesh(pinHeadGeo, mat);
    head.position.y = 2.2;
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.greenSoft, transparent: true, opacity: 0.55, depthWrite: false })
    );
    ring.position.y = 0.02;
    g.add(cone, head, ring);
    g.position.copy(pt);
    map.add(g);
    return g;
  });

  /* Seller handing over the parcel (intro) ----------------------------- */
  const SELLER = new THREE.Vector3(4.6, BASE_Y, -4.2);
  const seller = buildPerson({ cast, shirt: "#0F766E", pants: "#374151" });
  seller.group.position.copy(SELLER);
  seller.group.rotation.y = -Math.PI / 2;
  city.add(seller.group);
  const pickupParcel = makeParcel(0.8);
  city.add(pickupParcel);
  const badgeTex = makeTexture(384, 112, (ctx) => {
    ctx.clearRect(0, 0, 384, 112);
    ctx.fillStyle = "#059669";
    roundRect(ctx, 4, 4, 376, 104, 52);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(58, 56, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(44, 57);
    ctx.lineTo(54, 68);
    ctx.lineTo(73, 45);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 40px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText("Verified seller", 104, 58);
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.85), new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true }));
  badge.position.set(SELLER.x, 3.0, SELLER.z + 0.1);
  city.add(badge);

  /* City traffic --------------------------------------------------------- */
  const jeepTex = makeTexture(512, 192, (ctx) => drawJeepneySide(ctx, "#E8EAED"));
  const jeep = buildJeepney({ cast, sideTexture: jeepTex, color: "#E8EAED" });
  jeep.group.rotation.y = Math.PI;
  const carA = buildCar({ cast, color: "#1D4ED8" });
  carA.group.rotation.y = Math.PI;
  const carB = buildCar({ cast, color: "#F59E0B" });
  carB.group.rotation.y = Math.PI / 2;
  city.add(jeep.group, carA.group, carB.group);

  // Traffic light over the van's lane at the intersection.
  const lampRedOn = new THREE.Color("#EF4444");
  const lampRedOff = new THREE.Color("#4A1D1D");
  const lampGreenOn = new THREE.Color("#22C55E");
  const lampGreenOff = new THREE.Color("#163D24");
  const lampRed = new THREE.MeshBasicMaterial({ color: lampRedOn.clone() });
  const lampGreen = new THREE.MeshBasicMaterial({ color: lampGreenOff.clone() });
  {
    const steel = new THREE.MeshLambertMaterial({ color: "#4B5563" });
    const px = XI + ROAD_HALF + 0.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.6, 10), steel);
    pole.position.set(px, BASE_Y + 2.8, -ROAD_HALF - 0.7);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 6.2), steel);
    arm.position.set(px, BASE_Y + 5.5, -ROAD_HALF - 0.7 + 3.1);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: "#1F2937" }));
    housing.position.set(px, BASE_Y + 4.9, LANE);
    city.add(cast(pole), cast(arm), cast(housing));
    const lampGeo = new THREE.SphereGeometry(0.15, 14, 10);
    const amber = new THREE.MeshBasicMaterial({ color: "#4A3A12" });
    [lampRed, amber, lampGreen].forEach((mat, i) => {
      const lamp = new THREE.Mesh(lampGeo, mat);
      lamp.scale.set(1.5, 1, 1.5);
      lamp.position.set(px, BASE_Y + 5.25 - i * 0.35, LANE);
      city.add(lamp);
    });
  }

  /* Last-mile neighbourhood ----------------------------------------------- */
  const boxTex = makeTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#059669";
    ctx.fillRect(0, 0, 256, 34);
    drawBag(ctx, 88, 62, 80, "#FFFFFF");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Shopply", 128, 206);
  });
  const suburb = createSuburb({
    rand,
    cast,
    makeTexture,
    addBlocks,
    addPalms,
    addTrees,
    addBushes,
    addPlatform,
    addRoad,
    makeParcel,
    markingGeo,
    markingMat,
    tint,
    baseY: BASE_Y,
    boxTexture: boxTex,
  });
  suburb.group.visible = false;
  scene.add(suburb.group);

  /* Per-frame state ---------------------------------------------------- */
  const anchors = new Float32Array(ANCHOR_COUNT * ANCHOR_STRIDE);
  const pt: PathPoint = { x: 0, z: 0, tx: 1, tz: 0 };
  const target = new THREE.Vector3();
  const sideTarget = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const bg = new THREE.Color();
  const davao = cityPts[cityPts.length - 1].clone().add(MAP_CENTER);
  const VERTICAL = Math.PI / 2;
  let width = width0;
  let height = height0;
  let fovNow = FOV;
  let disposed = false;

  const project = (world: THREE.Vector3, slot: number, alpha: number, flag: number) => {
    tmpV.copy(world).project(camera);
    const onScreen = tmpV.z > -1 && tmpV.z < 1 && Math.abs(tmpV.x) < 1.15 && Math.abs(tmpV.y) < 1.15;
    const o = slot * ANCHOR_STRIDE;
    anchors[o] = ((tmpV.x + 1) / 2) * width;
    anchors[o + 1] = ((1 - tmpV.y) / 2) * height;
    anchors[o + 2] = onScreen ? alpha : 0;
    anchors[o + 3] = flag;
  };

  function render(p: number, pointerX: number, pointerY: number) {
    if (disposed) return;
    p = clamp01(p);
    const cityOn = p < T.swapMap;
    const subOn = p >= T.swapSuburb;
    const mapOn = !cityOn && !subOn;

    /* Van along its path */
    const s = vanS(p);
    pathAt(s, pt);
    van.position.set(pt.x, 0.01, pt.z);
    van.rotation.y = Math.atan2(-pt.tz, pt.tx);
    const spin = -s / 0.46;
    for (const w of wheels) w.rotation.z = spin;
    vanBody.position.y = Math.sin(s * 2.4) * 0.025;
    vanBody.rotation.x = Math.sin(s * 1.7) * 0.006;

    /* Seller hands the parcel to the courier */
    const pick = easeInOut(range(p, T.pickupStart, T.pickupEnd));
    const hold = 1 - range(pick, 0.04, 0.3);
    const wave = range(p, T.pickupEnd, T.pickupEnd + 0.006) * (1 - range(p, 0.07, 0.085));
    seller.walk(0, 0);
    seller.reach(hold * 1.15, hold * 1.15 + wave * (1.7 + Math.sin(p * 1400) * 0.3));
    pickupParcel.visible = pick < 1;
    if (pickupParcel.visible) {
      pickupParcel.position.set(
        lerp(SELLER.x, pt.x - 0.6, pick),
        lerp(BASE_Y + 1.12, 2.0, pick) + Math.sin(Math.PI * pick) * 2.3,
        lerp(SELLER.z + 0.42, 0.62, pick)
      );
      pickupParcel.rotation.set(pick * 2.4, pick * 3.1, 0);
      pickupParcel.scale.setScalar(0.8 * (1 - range(pick, 0.88, 1)) + 0.001);
    }
    badge.position.y = 3.0 + Math.sin(p * 260) * 0.05;
    badge.material.opacity = 1 - range(p, 0.19, 0.21);

    /* Traffic */
    const jx = lerp(54, -42, range(p, 0.07, 0.185));
    jeep.group.position.set(jx, 0.01, -LANE);
    for (const w of jeep.wheels) w.rotation.z = jx / 0.42;
    const ax = lerp(86, -8, range(p, 0.185, 0.27));
    carA.group.position.set(ax, 0.01, -LANE);
    for (const w of carA.wheels) w.rotation.z = ax / 0.34;
    const bz = lerp(60, -36, range(p, 0.29, 0.41));
    carB.group.position.set(XI + LANE, 0.01, bz);
    for (const w of carB.wheels) w.rotation.z = bz / 0.34;
    const go = p >= 0.262;
    lampRed.color.copy(go ? lampRedOff : lampRedOn);
    lampGreen.color.copy(go ? lampGreenOn : lampGreenOff);

    /* Signboards rise out of the kerb */
    signs.forEach((sg, i) => {
      const t = range(p, T.signsStart + i * T.signStep, T.signsStart + i * T.signStep + T.signPop);
      sg.group.visible = t > 0;
      const e = easeOutBack(t);
      sg.inner.position.y = lerp(-3.6, 0, e);
      sg.inner.rotation.z = (1 - easeOut(t)) * 0.12 * (i % 2 ? 1 : -1);
    });

    /* Camera tilt amount drives several fades */
    const tilt = easeInOut(range(p, T.tiltStart, T.tiltEnd));
    letterMat.opacity = 1 - range(tilt, 0.05, 0.4);
    letters.visible = letterMat.opacity > 0.001;
    letters.position.x = 36 - p * 70;

    const growT = range(p, T.tiltStart + 0.045, T.tiltEnd + 0.004);
    grow.visible = growT > 0;
    grow.scale.set(1, Math.max(0.001, easeOutBack(growT)), 1);

    trailMat.opacity = 0.85 * range(p, T.tiltStart + 0.03, T.tiltStart + 0.075);
    trail.visible = trailMat.opacity > 0.001;
    const trailFrac = clamp01((s - TRAIL_S0) / (S_END - TRAIL_S0));
    trailGeo.setDrawRange(0, Math.max(0, Math.floor(trailFrac * (TRAIL_N - 1))) * 6);

    /* Markers + checkpoint anchors */
    const front = pt.z + (pt.tz > 0.5 ? VAN_FRONT : -99);
    const trackAlpha = range(p, T.tiltEnd - 0.02, T.tiltEnd) * (1 - range(p, T.hubStart - 0.014, T.hubStart + 0.006));
    let latest = -1;
    MARKER_Z.forEach((z, i) => {
      if (front >= z) latest = i;
      markers[i].color.lerpColors(markerIdle, markerDone, clamp01((front - z) / 0.6 + 0.0001));
    });

    /* Sorting hub: shutter opens, parcel goes from the van onto the dock */
    hubShutter.scale.y = 1 - 0.86 * easeInOut(range(p, T.hubStart - 0.02, T.hubStart + 0.004));
    parcel.visible = p >= T.dockStart && cityOn;
    if (parcel.visible) {
      const e = easeInOut(range(p, T.dockStart, T.dockEnd));
      const slide = easeInOut(range(p, T.dockEnd + 0.002, T.dockEnd + 0.016));
      parcel.position.set(
        lerp(pt.x - 1.3, HUB_X + HUB_W / 2 + 1.1, e) - slide * 2.6,
        lerp(1.4, BASE_Y + 0.8, e) + Math.sin(Math.PI * e) * 1.5,
        lerp(VAN_STOP_Z - 0.4, HUB_Z - 1.5, e)
      );
      parcel.rotation.y = e * Math.PI * 0.5;
    }

    /* World swaps happen behind the cloud veil */
    city.visible = cityOn;
    map.visible = mapOn;
    suburb.group.visible = subOn;
    setSunMode(subOn ? 1 : 0);
    if (p > T.descendStart) suburb.update(p);
    const swoop = subOn ? easeInOut(range(p, T.swoopStart, T.swoopEnd)) : 0;
    const arrive = subOn ? easeInOut(range(p, T.arriveStart, T.arriveEnd)) : 0;
    clouds.visible =
      (p > T.riseStart - 0.01 && p < T.riseEnd + 0.03) || (p > T.descendStart - 0.01 && p < T.descendEnd + 0.03);
    bg.copy(subOn ? COLORS.duskBg : mapOn ? COLORS.mapBg : COLORS.cityBg);
    renderer.setClearColor(bg, 1);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = mapOn ? 900 : subOn ? lerp(80, 24, swoop) : lerp(18, 70, tilt);
    fog.far = mapOn ? 1800 : subOn ? lerp(240, 135, swoop) : lerp(92, 170, tilt);

    /* Cargo flight across the archipelago */
    const routeT = range(p, T.routeStart, T.routeEnd);
    const tubeSegs = Math.floor(routeT * ROUTE_SEG);
    routeGeo.setDrawRange(0, Math.min(routeIndexCount, tubeSegs * ROUTE_RAD * 6));
    route.visible = tubeSegs > 0;
    plane.visible = mapOn && routeT > 0.001 && routeT < 0.999;
    planeShadow.visible = plane.visible;
    if (plane.visible) {
      routeCurve.getPointAt(routeT, tmpV2);
      routeCurve.getTangentAt(routeT, tmpV);
      const lift = 2.4 + Math.sin(Math.PI * routeT) * 2.2;
      plane.position.set(tmpV2.x, tmpV2.y + lift, tmpV2.z);
      plane.rotation.set(Math.sin(routeT * 9) * 0.12, Math.atan2(-tmpV.z, tmpV.x), Math.asin(Math.max(-0.6, Math.min(0.6, tmpV.y))));
      const grow01 = Math.min(1, routeT * 14, (1 - routeT) * 14);
      plane.scale.setScalar(2.5 * Math.max(0.001, grow01));
      planeShadow.position.set(tmpV2.x + 1.4, ISLAND_TOP + 0.06, tmpV2.z + 1.4);
      planeShadow.rotation.y = plane.rotation.y;
      planeShadow.scale.set(7 * grow01 + 0.001, 1, 4.2 * grow01 + 0.001);
    }
    pins.forEach((pin, i) => {
      const at = T.routeStart + MAP_CITIES[i].at * (T.routeEnd - T.routeStart);
      const t = range(p, at - 0.004, at + 0.02);
      pin.visible = t > 0;
      pin.scale.setScalar(Math.max(0.001, easeOutBack(t)));
    });

    /* Camera rig: orbit by elevation (theta) and yaw (phi) around a target */
    const introE = easeInOut(range(p, 0, T.introEnd + 0.03));
    const lead = lerp(layout.leadIntro, layout.leadSide, introE);
    sideTarget.set(pt.x + lead, lerp(layout.introY, layout.sideY, introE), 2);
    if (pt.tz > 0.001 || s > L1) sideTarget.x = Math.min(sideTarget.x, CX + TURN_R + lead);
    const thetaSide = lerp(layout.thetaIntro, layout.thetaSide, introE);
    const rSide = lerp(layout.rIntro, layout.rSide, introE);

    let theta = lerp(thetaSide, VERTICAL, tilt);
    let radius = lerp(rSide, layout.rTrack, tilt);
    let phi = 0;
    let fovTarget = FOV;
    let shadowLead = lerp(9, 0, tilt);
    target.lerpVectors(sideTarget, layout.trackTarget, easeInOut(range(p, T.tiltStart + 0.02, T.tiltEnd)));

    // Hub beat: drop to a three-quarter view of the loading dock.
    const hubE = easeInOut(range(p, T.hubStart, T.hubStart + 0.03)) * (1 - easeInOut(range(p, T.hubEnd - 0.028, T.hubEnd)));
    if (hubE > 0) {
      theta = lerp(theta, layout.thetaHub, hubE);
      radius = lerp(radius, layout.rHub, hubE);
      phi = layout.phiHub * hubE;
      target.lerp(layout.hubTarget, hubE);
    }

    // Rise through the clouds to the national map.
    const rise = easeInOut(range(p, T.riseStart, T.riseEnd));
    if (rise > 0) {
      radius = layout.rTrack * Math.pow(layout.rMap / layout.rTrack, rise);
      target.lerp(layout.mapTarget, rise);
      theta = VERTICAL;
      phi = 0;
    }

    clouds.position.set(0, 0, 0);
    if (p >= T.descendStart) {
      theta = VERTICAL;
      phi = 0;
      if (!subOn) {
        // Dive towards Davao on the map.
        const d = Math.pow(range(p, T.descendStart, T.swapSuburb), 2);
        target.lerpVectors(layout.mapTarget, davao, d);
        target.y = 0;
        radius = layout.rMap * Math.pow(64 / layout.rMap, d);
      } else {
        // Drone drops from top-down to a chase view behind the rider.
        const r = suburb.rider;
        const d2 = easeOut(range(p, T.swapSuburb, T.descendEnd));
        target.set(lerp(SX, lerp(SX, r.x, 0.6), swoop), 0.7 * swoop, r.z - lerp(6, 2.6, swoop));
        target.y += Math.sin(suburb.distance * 1.3) * 0.03 * suburb.speed * swoop;
        radius = lerp(lerp(64, layout.rSubTop, d2), layout.rChase, swoop);
        theta = lerp(VERTICAL, layout.thetaChase, swoop);
        phi = Math.sin(suburb.distance * 0.07) * 0.035 * swoop;
        fovTarget = FOV + 8 * suburb.speed * swoop * (1 - arrive);
        shadowLead = 16 * swoop * (1 - arrive);
        if (arrive > 0) {
          // Orbit to face the gate for the hand-off.
          tmpV.copy(suburb.arriveTarget);
          tmpV.x -= Math.cos(layout.phiArrive) * layout.arriveShift;
          tmpV.z += Math.sin(layout.phiArrive) * layout.arriveShift;
          tmpV.y += layout.arriveLift;
          target.lerp(tmpV, arrive);
          radius = lerp(radius, layout.rArrive, arrive) * (1 - 0.07 * range(p, T.confettiStart, 1));
          theta = lerp(theta, layout.thetaArrive, arrive);
          phi = lerp(phi, layout.phiArrive, arrive);
        }
      }
      clouds.position.set(target.x - MAP_CENTER.x, 0, target.z - MAP_CENTER.z);
    }

    if (Math.abs(fovTarget - fovNow) > 0.01) {
      fovNow = fovTarget;
      camera.fov = fovNow;
      camera.updateProjectionMatrix();
    }
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    const par = radius * 0.022;
    const px = pointerX * par;
    const py = pointerY * par;
    camera.position.set(
      target.x + radius * cosT * sinP + px * cosP - py * sinT * sinP,
      target.y + radius * sinT + py * cosT,
      target.z + radius * cosT * cosP - px * sinP - py * sinT * cosP
    );
    camera.up.set(-sinT * sinP, cosT, -sinT * cosP);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    /* Sun follows the visible area; focus snapped to shadow texels */
    focus.set(target.x, 0, target.z - shadowLead);
    const texel = (SHADOW_HALF * 2) / sun.shadow.mapSize.x;
    const fx = Math.round(focus.dot(sunX) / texel) * texel;
    const fy = Math.round(focus.dot(sunY) / texel) * texel;
    const fz = focus.dot(sunZ);
    focus.copy(sunX).multiplyScalar(fx).addScaledVector(sunY, fy).addScaledVector(sunZ, fz);
    sun.target.position.copy(focus);
    sun.position.copy(focus).add(SUN_OFFSET);
    sun.target.updateMatrixWorld();

    renderer.render(scene, camera);

    /* Screen anchors for the HTML overlays */
    MARKER_Z.forEach((z, i) => {
      const appear = clamp01((front - (z - 3.2)) / 1.4);
      const flag = i === latest ? 2 : front >= z ? 1 : 0;
      project(tmpV2.set(MARKER_X, 0.36, z), i, cityOn ? appear * trackAlpha : 0, flag);
    });
    cityPts.forEach((cp, i) => {
      const slot = CHECKPOINTS.length + i;
      tmpV2.copy(cp).add(map.position);
      tmpV2.y += 3.4;
      const at = T.routeStart + MAP_CITIES[i].at * (T.routeEnd - T.routeStart);
      const vis = mapOn ? range(p, at, at + 0.016) * (1 - range(p, T.descendStart, T.descendStart + 0.012)) : 0;
      project(tmpV2, slot, vis, routeT >= MAP_CITIES[i].at ? 1 : 0);
    });
  }

  function resize(w: number, h: number) {
    if (disposed) return;
    width = Math.max(1, Math.floor(w));
    height = Math.max(1, Math.floor(h));
    layout = computeLayout(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, layout.compact ? 1.5 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    placeSigns();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener("webglcontextlost", handleLost);
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => mats.add(x));
      else if (m) mats.add(m);
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  host.appendChild(canvas);

  // Real human model for the rider, buyer, seller and neighbours. The block
  // figures stay in place if the file cannot be loaded.
  loadHuman()
    .then((template) => {
      if (!disposed) {
        seller.useRig(template.instantiate({ helmet: false, jacket: "#0F766E" }));
        suburb.useHumans(template);
        options.onAssetsReady?.();
      }
      template.dispose();
    })
    .catch(() => undefined);

  return { render, resize, anchors, canvas, dispose };
}
