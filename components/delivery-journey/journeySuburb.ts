// Residential street for the last-mile chapter: a motorcycle rider carries the
// parcel past houses, traffic and neighbours to the buyer's gate.
// The street runs along z; the rider travels towards -z (up the screen in the
// top-down view, away from the chase camera).

import * as THREE from "three";
import { buildCar, buildMotorcycle, buildPerson, buildTricycle, type Cast } from "./journeyActors";
import { TIMELINE as T } from "./journeyData";
import type { HumanTemplate } from "./journeyHuman";

export interface Plant {
  x: number;
  z: number;
  s: number;
  r: number;
}

export interface Bld {
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

export interface WorldKit {
  rand: () => number;
  cast: Cast;
  makeTexture: (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: boolean) => THREE.CanvasTexture;
  addBlocks: (list: Bld[], parent: THREE.Object3D) => void;
  addPalms: (list: Plant[], parent: THREE.Object3D) => void;
  addTrees: (list: Plant[], parent: THREE.Object3D) => void;
  addBushes: (list: Plant[], parent: THREE.Object3D) => void;
  addPlatform: (x0: number, x1: number, z0: number, z1: number, parent: THREE.Object3D) => void;
  addRoad: (x0: number, x1: number, z0: number, z1: number, parent: THREE.Object3D) => void;
  makeParcel: (scale: number) => THREE.Group;
  markingGeo: THREE.BufferGeometry;
  markingMat: THREE.Material;
  tint: () => string;
  baseY: number;
  boxTexture: THREE.Texture;
}

export interface Suburb {
  group: THREE.Group;
  /** Current rider position (world). */
  rider: THREE.Vector3;
  /** Distance ridden so far, for camera sway. */
  distance: number;
  /** 0..1 how fast the rider is going right now. */
  speed: number;
  /** Where the camera looks during the hand-off. */
  arriveTarget: THREE.Vector3;
  update(p: number): void;
  /** Swap every placeholder person for the loaded human model. */
  useHumans(template: HumanTemplate): void;
}

export const SX = 400; // street centre line
const ROAD = 3;
const LANE = 1.3;
const Z_START = 52;
const HOUSE_Z = -40;
const GATE_Z = HOUSE_Z + 0.75;
const FENCE_X = SX + 4.9;
const HOUSE_CX = SX + 11.8;
const DOOR_X = HOUSE_CX - 3.1;
const STOP_X = SX + 2.35;
const RIDE_LEN = Z_START - HOUSE_Z;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const easeOutBack = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2);
};
const bell = (u: number) => (Math.abs(u) < 1 ? (Math.cos(Math.PI * u) + 1) / 2 : 0);

/** Rider lane: swerves left around a parked car, then pulls over at the gate. */
function riderX(z: number) {
  return SX + LANE - 1.3 * bell((z - 8) / 13) + (STOP_X - SX - LANE) * ease(clamp01((-27 - z) / 11));
}

export function createSuburb(kit: WorldKit): Suburb {
  const { rand, cast, baseY } = kit;
  const group = new THREE.Group();
  const lam = (color: string) => new THREE.MeshLambertMaterial({ color });

  /* Ground, street, kerbs ------------------------------------------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lam("#E3DCCD"));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SX, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);
  kit.addRoad(SX - ROAD, SX + ROAD, -110, 110, group);
  kit.addPlatform(SX - 80, SX - ROAD, -110, 110, group);
  kit.addPlatform(SX + ROAD, SX + 80, -110, 110, group);
  {
    const dashes: number[] = [];
    for (let z = -100; z < 100; z += 4) dashes.push(z);
    const mesh = new THREE.InstancedMesh(kit.markingGeo, kit.markingMat, dashes.length);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const m = new THREE.Matrix4();
    dashes.forEach((z, i) => {
      m.compose(new THREE.Vector3(SX, 0.02, z), q, new THREE.Vector3(1.8, 1, 0.13));
      mesh.setMatrixAt(i, m);
    });
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  /* Lots: houses, lawns, fences, plants ------------------------------- */
  const blocks: Bld[] = [];
  const trees: Plant[] = [];
  const bushes: Plant[] = [];
  const palms: Plant[] = [];
  const lawns: THREE.Matrix4[] = [];
  const fences: THREE.Matrix4[] = [];
  const mq = new THREE.Quaternion();
  const roofs = ["#9C5B45", "#7E8B80", "#5F6E7E", "#A8724C", "#8A4F42", "#B4532F"];
  const box = (list: THREE.Matrix4[], x: number, y: number, z: number, w: number, h: number, d: number) => {
    list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), mq, new THREE.Vector3(w, h, d)));
  };
  const fenceLot = (side: number, zc: number, gateZ: number) => {
    const x = SX + side * 4.9;
    const z0 = zc - 6.2;
    const z1 = zc + 6.2;
    const g0 = gateZ - 0.9;
    const g1 = gateZ + 0.9;
    box(fences, x, baseY + 0.48, (z0 + g0) / 2, 0.14, 0.96, g0 - z0);
    box(fences, x, baseY + 0.48, (g1 + z1) / 2, 0.14, 0.96, z1 - g1);
    box(fences, x, baseY + 0.62, g0 - 0.08, 0.24, 1.24, 0.24);
    box(fences, x, baseY + 0.62, g1 + 0.08, 0.24, 1.24, 0.24);
    box(fences, x + side * 6.6, baseY + 0.48, z0, 13.2, 0.96, 0.14);
  };
  const lot = (side: number, zc: number) => {
    const cx = SX + side * (11.6 + rand() * 0.8);
    const floors = rand() < 0.35 ? 2 : 1;
    blocks.push({
      x: cx,
      z: zc,
      w: 5.6 + rand() * 1.2,
      d: 6.2 + rand() * 1.8,
      floors,
      shop: false,
      pitched: rand() < 0.85,
      tint: kit.tint(),
      roof: roofs[Math.floor(rand() * roofs.length)],
    });
    box(lawns, SX + side * 11.6, baseY + 0.012, zc, 13.2, 0.024, 12.4);
    fenceLot(side, zc, zc + (rand() - 0.5) * 4);
    if (rand() < 0.75) trees.push({ x: SX + side * (6.8 + rand() * 1.2), z: zc + 4.2 + rand(), s: 0.7 + rand() * 0.35, r: rand() * 6 });
    if (rand() < 0.4) palms.push({ x: SX + side * (7 + rand()), z: zc - 4.4, s: 0.7 + rand() * 0.25, r: rand() * 6 });
    bushes.push({ x: SX + side * 5.7, z: zc - 2.2 - rand() * 2, s: 0.55 + rand() * 0.3, r: rand() * 6 });
    if (rand() < 0.6) bushes.push({ x: SX + side * 5.8, z: zc + 2.4 + rand() * 2, s: 0.5 + rand() * 0.3, r: rand() * 6 });
  };
  for (const z of [46, 18, 4, -10, -24, -56, -70, -84]) lot(1, z);
  for (const z of [48, 34, 20, 6, -8, -22, -64, -78]) lot(-1, z);
  // corner sari-sari store on the right (shopfront faces the approaching rider)
  blocks.push({ x: SX + 8.4, z: 31.5, w: 6.4, d: 5.4, floors: 2, shop: true, pitched: false, tint: "#F0E2CF" });
  // back rows for depth
  for (const side of [-1, 1]) {
    for (let z = -90; z < 60; z += 13 + rand() * 4) {
      blocks.push({
        x: SX + side * (27 + rand() * 3),
        z,
        w: 6 + rand() * 2,
        d: 7 + rand() * 2,
        floors: 1 + Math.floor(rand() * 3),
        shop: false,
        pitched: rand() < 0.6,
        tint: kit.tint(),
      });
      if (rand() < 0.6) trees.push({ x: SX + side * (20 + rand() * 2), z: z + 5, s: 0.9 + rand() * 0.4, r: rand() * 6 });
    }
  }
  // the buyer's home
  blocks.push({ x: HOUSE_CX, z: HOUSE_Z, w: 6.2, d: 7.4, floors: 1, shop: false, pitched: true, tint: "#F4EBDD", roof: "#B4532F" });
  box(lawns, SX + 11.6, baseY + 0.012, HOUSE_Z, 13.2, 0.024, 12.4);
  fenceLot(1, HOUSE_Z, GATE_Z);
  trees.push({ x: SX + 16.6, z: HOUSE_Z + 4.6, s: 0.85, r: 1.2 });
  palms.push({ x: SX + 6.3, z: HOUSE_Z - 4.6, s: 0.72, r: 2 });
  bushes.push(
    { x: DOOR_X - 0.7, z: GATE_Z + 1.9, s: 0.5, r: 1 },
    { x: DOOR_X - 0.7, z: GATE_Z - 1.9, s: 0.55, r: 2 },
    { x: SX + 5.8, z: HOUSE_Z + 4.6, s: 0.6, r: 3 },
    { x: SX + 5.7, z: HOUSE_Z - 2.6, s: 0.5, r: 4 }
  );
  // trees around the open court lot
  trees.push({ x: SX - 19, z: -30, s: 1.05, r: 1 }, { x: SX - 20.5, z: -47, s: 0.95, r: 2 }, { x: SX - 5.2, z: -53.5, s: 0.8, r: 3 });

  kit.addBlocks(blocks, group);
  kit.addTrees(trees, group);
  kit.addBushes(bushes, group);
  kit.addPalms(palms, group);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const instanced = (list: THREE.Matrix4[], mat: THREE.Material, shadow: boolean) => {
    const mesh = new THREE.InstancedMesh(unit, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    if (shadow) cast(mesh);
    else mesh.receiveShadow = true;
    group.add(mesh);
  };
  instanced(lawns, lam("#B4CB9B"), false);
  instanced(fences, lam("#EFE8DA"), true);

  /* Basketball court on the open lot --------------------------------- */
  {
    const tex = kit.makeTexture(256, 384, (ctx) => {
      ctx.fillStyle = "#3F8F7B";
      ctx.fillRect(0, 0, 256, 384);
      ctx.strokeStyle = "#F4F4F0";
      ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, 236, 364);
      ctx.fillStyle = "#C96F4A";
      ctx.fillRect(88, 250, 80, 124);
      ctx.strokeRect(88, 250, 80, 124);
      ctx.beginPath();
      ctx.arc(128, 250, 40, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(128, 374, 150, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(128, 10, 44, 0, Math.PI);
      ctx.stroke();
    });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(15, 22.5), new THREE.MeshLambertMaterial({ map: tex }));
    court.rotation.x = -Math.PI / 2;
    court.position.set(SX - 12.2, baseY + 0.02, -40.5);
    court.receiveShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 10), lam("#4B5563"));
    pole.position.set(SX - 12.2, baseY + 1.7, -52.6);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.0), lam("#4B5563"));
    arm.position.set(SX - 12.2, baseY + 3.3, -52.1);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.06), lam("#F8FAFC"));
    board.position.set(SX - 12.2, baseY + 3.5, -51.6);
    const square = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.07), lam("#DC2626"));
    square.position.set(SX - 12.2, baseY + 3.3, -51.59);
    const ringGeo = new THREE.TorusGeometry(0.23, 0.02, 8, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, lam("#EA580C"));
    ring.position.set(SX - 12.2, baseY + 3.05, -51.3);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), lam("#D9662B"));
    ball.position.set(SX - 9.4, baseY + 0.14, -45);
    group.add(court, cast(pole), arm, cast(board), square, ring, cast(ball));
  }

  /* Electric poles and wires ------------------------------------------ */
  {
    const poleZ = [62, 38, 14, -10, -25.5, -53.5, -78];
    const px = SX - 3.6;
    const parts = new THREE.InstancedMesh(unit, lam("#5A4636"), poleZ.length * 2);
    const m = new THREE.Matrix4();
    poleZ.forEach((z, i) => {
      m.compose(new THREE.Vector3(px, baseY + 4.2, z), mq, new THREE.Vector3(0.2, 8.4, 0.2));
      parts.setMatrixAt(i * 2, m);
      m.compose(new THREE.Vector3(px, baseY + 7.7, z), mq, new THREE.Vector3(1.9, 0.12, 0.12));
      parts.setMatrixAt(i * 2 + 1, m);
    });
    group.add(cast(parts));
    const pts: number[] = [];
    for (let i = 0; i < poleZ.length - 1; i++) {
      for (const ox of [-0.8, 0, 0.8]) {
        const SEG = 10;
        for (let k = 0; k < SEG; k++) {
          for (const t of [k / SEG, (k + 1) / SEG]) {
            const sag = 0.55 * 4 * t * (1 - t);
            pts.push(px + ox, baseY + 7.85 - sag, lerp(poleZ[i], poleZ[i + 1], t));
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#3B3B3B" })));
  }

  /* Buyer's porch, door, path ------------------------------------------ */
  const doorPivot = new THREE.Group();
  {
    const trim = lam("#FFFFFF");
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 1.26), trim);
    frame.position.set(DOOR_X - 0.02, baseY + 1.15, GATE_Z);
    const dark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.1, 1.0), lam("#2B2620"));
    dark.position.set(DOOR_X - 0.04, baseY + 1.05, GATE_Z);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.1, 1.0), lam("#6B4630"));
    door.position.set(0, 1.05, 0.5);
    doorPivot.add(cast(door, false));
    doorPivot.position.set(DOOR_X - 0.09, baseY, GATE_Z - 0.5);
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 2.6), lam("#9C5B45"));
    porchRoof.position.set(DOOR_X - 0.8, baseY + 2.6, GATE_Z);
    porchRoof.rotation.z = 0.16;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.45, 8);
    const postA = new THREE.Mesh(postGeo, trim);
    postA.position.set(DOOR_X - 1.5, baseY + 1.22, GATE_Z + 1.15);
    const postB = postA.clone();
    postB.position.z = GATE_Z - 1.15;
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 2.6), lam("#D6D0C4"));
    step.position.set(DOOR_X - 0.8, baseY + 0.08, GATE_Z);
    const path = new THREE.Mesh(new THREE.BoxGeometry(DOOR_X - 1.6 - FENCE_X + 0.6, 0.04, 1.2), lam("#D9D3C7"));
    path.position.set((DOOR_X - 1.6 + FENCE_X - 0.6) / 2, baseY + 0.03, GATE_Z);
    path.receiveShadow = true;
    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.4), lam("#DC2626"));
    mailbox.position.set(FENCE_X, baseY + 1.38, GATE_Z + 1.25);
    group.add(frame, dark, doorPivot, cast(porchRoof), cast(postA), cast(postB), step, path, mailbox);
  }

  /* Actors ------------------------------------------------------------- */
  const bike = buildMotorcycle({ cast, boxTexture: kit.boxTexture });
  group.add(bike.group);

  const trike = buildTricycle({ cast, color: "#2563EB" });
  trike.group.rotation.y = -Math.PI / 2;
  group.add(trike.group);

  const parkedA = buildCar({ cast, color: "#B91C1C" });
  parkedA.group.position.set(SX + 2.05, 0.01, 8);
  parkedA.group.rotation.y = Math.PI / 2;
  const parkedB = buildCar({ cast, color: "#E5E7EB" });
  parkedB.group.position.set(SX - 2.05, 0.01, -15);
  parkedB.group.rotation.y = -Math.PI / 2;
  group.add(parkedA.group, parkedB.group);

  const walkerA = buildPerson({ cast, shirt: "#2563EB", pants: "#374151" });
  walkerA.group.rotation.y = -Math.PI / 2;
  const walkerB = buildPerson({ cast, shirt: "#DB2777", pants: "#1F2937", hair: "#1A1410" });
  walkerB.group.rotation.y = Math.PI / 2;
  group.add(walkerA.group, walkerB.group);

  const customer = buildPerson({ cast, shirt: "#F59E0B", pants: "#374151" });
  customer.group.rotation.y = Math.PI;
  group.add(customer.group);

  const parcel = kit.makeParcel(0.72);
  group.add(parcel);

  /* Confetti ------------------------------------------------------------ */
  const CONFETTI = 150;
  const confettiGeo = new THREE.PlaneGeometry(0.17, 0.1);
  const confetti = new THREE.InstancedMesh(confettiGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), CONFETTI);
  confetti.frustumCulled = false;
  const confettiSeed: { vx: number; vy: number; vz: number; ax: THREE.Vector3; spin: number; land: number }[] = [];
  const ORIGIN = new THREE.Vector3(SX + 3.6, baseY + 2.1, GATE_Z);
  const GRAV = 9;
  {
    const colors = ["#10B981", "#FACC15", "#F472B6", "#60A5FA", "#FFFFFF", "#F97316"];
    const c = new THREE.Color();
    for (let i = 0; i < CONFETTI; i++) {
      const a = rand() * Math.PI * 2;
      const sp = 1.2 + rand() * 3.4;
      const vy = 4 + rand() * 5;
      const h = ORIGIN.y - baseY - 0.03;
      const land = (vy + Math.sqrt(vy * vy + 4 * GRAV * h)) / (2 * GRAV);
      confettiSeed.push({
        vx: Math.cos(a) * sp,
        vy,
        vz: Math.sin(a) * sp,
        ax: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
        spin: 6 + rand() * 14,
        land,
      });
      confetti.setColorAt(i, c.set(colors[i % colors.length]));
    }
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;
  }
  group.add(confetti);

  /* Per-frame ----------------------------------------------------------- */
  const rider = new THREE.Vector3(SX + LANE, 0, Z_START);
  const arriveTarget = new THREE.Vector3(SX + 4.3, 1.45, HOUSE_Z + 0.4);
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const useHumans = (template: HumanTemplate) => {
    bike.mountRider(template.instantiate());
    trike.mountRider(template.instantiate({ jacket: "#7F1D1D", helmetColor: "#1F2937" }));
    walkerA.useRig(template.instantiate({ helmet: false }));
    walkerB.useRig(template.instantiate({ helmet: false, jacket: "#BE185D", jeans: "#1F2937" }));
    customer.useRig(template.instantiate({ helmet: false, jacket: "#D97706" }));
  };
  const state: Suburb = { group, rider, distance: 0, speed: 0, arriveTarget, update, useHumans };

  function update(p: number) {
    /* Rider */
    const r = range(p, T.rideStart, T.rideEnd);
    const e = ease(r);
    const z = lerp(Z_START, HOUSE_Z, e);
    const x = riderX(z);
    const dxdz = (riderX(z - 0.4) - riderX(z + 0.4)) / 0.8; // lateral change per unit travelled
    state.distance = e * RIDE_LEN;
    state.speed = 4 * r * (1 - r);
    rider.set(x, 0, z);
    bike.group.position.set(x, 0.01, z);
    bike.group.rotation.y = Math.atan2(1, dxdz);
    bike.body.rotation.x = Math.max(-0.32, Math.min(0.32, dxdz * 2.4)) * state.speed;
    bike.body.position.y = Math.sin(state.distance * 2.1) * 0.012;
    const spin = -state.distance / 0.345;
    for (const w of bike.wheels) w.rotation.z = spin;

    /* Oncoming tricycle */
    const tz = lerp(-78, 72, range(p, 0.735, 0.875));
    trike.group.position.set(SX - 1.55, 0.01, tz);
    for (const w of trike.wheels) w.rotation.z = -(tz + 78) / 0.345;

    /* Neighbours walking */
    const w = range(p, 0.69, 0.94);
    walkerA.group.position.set(SX + 3.95, baseY, 26 + w * 10);
    walkerA.walk(w * 46);
    walkerB.group.position.set(SX - 3.95, baseY, 2 - w * 9);
    walkerB.walk(w * 42 + 1);

    /* Door + customer walking to the gate */
    const open = ease(range(p, T.walkStart - 0.016, T.walkStart + 0.004));
    doorPivot.rotation.y = -open * 1.45;
    const walk = range(p, T.walkStart, T.handStart - 0.004);
    const c = range(p, T.confettiStart, 0.998);
    customer.group.visible = open > 0.02;
    customer.group.position.set(lerp(DOOR_X - 0.45, FENCE_X - 0.15, ease(walk)), baseY + Math.abs(Math.sin(c * 26)) * 0.09 * (1 - c), GATE_Z);
    customer.walk(walk * 15, Math.sin(Math.PI * walk));
    const reach = ease(range(p, T.handStart - 0.008, T.handStart + 0.01));
    const wave = c > 0 ? Math.sin(c * 30) * 0.35 * (1 - c * 0.6) : 0;
    customer.reach(reach * 1.15, reach * 1.15 + (c > 0 ? 1.3 * Math.min(1, c * 8) + wave : 0));

    /* Parcel: rider's box -> buyer's hands */
    const h = ease(range(p, T.handStart, T.handEnd));
    parcel.visible = p >= T.handStart;
    if (parcel.visible) {
      const hx = FENCE_X - 0.62;
      parcel.position.set(lerp(STOP_X, hx, h), lerp(1.66, baseY + 0.98, h) + Math.sin(Math.PI * h) * 0.45, lerp(HOUSE_Z + 0.78, GATE_Z, h));
      parcel.position.y += Math.abs(Math.sin(c * 26)) * 0.09 * (1 - c);
      parcel.rotation.y = h * 1.2;
      parcel.scale.setScalar(0.72 * Math.min(1, range(p, T.handStart, T.handStart + 0.004) + 0.001));
    }

    /* Confetti burst that settles on the ground */
    confetti.visible = c > 0;
    if (confetti.visible) {
      const time = c * 2.6;
      const pop = easeOutBack(Math.min(1, c * 10));
      for (let i = 0; i < CONFETTI; i++) {
        const s = confettiSeed[i];
        const t = Math.min(time, s.land);
        tmpP.set(ORIGIN.x + s.vx * t, ORIGIN.y + s.vy * t - GRAV * t * t, ORIGIN.z + s.vz * t);
        tmpQ.setFromAxisAngle(s.ax, t * s.spin);
        tmpS.setScalar(pop);
        tmpM.compose(tmpP, tmpQ, tmpS);
        confetti.setMatrixAt(i, tmpM);
      }
      confetti.instanceMatrix.needsUpdate = true;
    }
  }

  return state;
}
