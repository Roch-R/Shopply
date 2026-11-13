// Vehicles and people for the delivery journey. All models face +x, sit on
// y = 0 and are built from primitives so nothing has to be downloaded.

import * as THREE from "three";
import type { HumanRig } from "./journeyHuman";

export type Cast = (o: THREE.Object3D, receive?: boolean) => THREE.Object3D;

const lam = (color: string) => new THREE.MeshLambertMaterial({ color });
const std = (color: string, roughness = 0.5, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Capsule limb stretched between two points. */
function limb(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.01, len - radius * 2), 4, 8), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

function wheel(radius: number, width: number, tire: THREE.Material, hub: THREE.Material) {
  const g = new THREE.Group();
  const t = new THREE.CylinderGeometry(radius, radius, width, 22);
  t.rotateX(Math.PI / 2);
  const h = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.02, 12);
  h.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(t, tire), new THREE.Mesh(h, hub), new THREE.Mesh(new THREE.BoxGeometry(radius * 0.8, radius * 0.16, width + 0.03), tire));
  return g;
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export interface Person {
  group: THREE.Group;
  /** Swing legs and arms for a walk cycle phase (radians); amount 0..1. Resets the arms. */
  walk(phase: number, amount?: number): void;
  /** Raise the arms forward by the given angles (radians). Call after walk(). */
  reach(left: number, right: number): void;
  /** Replace the placeholder body with the loaded human model. */
  useRig(rig: HumanRig): void;
}

export function buildPerson(opts: { shirt: string; pants: string; skin?: string; hair?: string; cast: Cast }): Person {
  const skin = lam(opts.skin ?? "#C68E63");
  const shirt = lam(opts.shirt);
  const pants = lam(opts.pants);
  const hair = lam(opts.hair ?? "#2B1D14");
  const shoe = lam("#2A2A2E");
  const group = new THREE.Group();

  const makeLeg = (z: number) => {
    const g = new THREE.Group();
    const leg = new THREE.CapsuleGeometry(0.085, 0.62, 4, 8);
    leg.translate(0, -0.4, 0);
    const foot = new THREE.BoxGeometry(0.26, 0.09, 0.13);
    foot.translate(0.05, -0.84, 0);
    g.add(opts.cast(new THREE.Mesh(leg, pants), false), new THREE.Mesh(foot, shoe));
    g.position.set(0, 0.88, z);
    group.add(g);
    return g;
  };
  const makeArm = (z: number) => {
    const g = new THREE.Group();
    const sleeve = new THREE.CapsuleGeometry(0.07, 0.16, 4, 8);
    sleeve.translate(0, -0.12, 0);
    const arm = new THREE.CapsuleGeometry(0.055, 0.4, 4, 8);
    arm.translate(0, -0.36, 0);
    g.add(new THREE.Mesh(sleeve, shirt), opts.cast(new THREE.Mesh(arm, skin), false));
    g.position.set(0, 1.42, z);
    group.add(g);
    return g;
  };
  const legL = makeLeg(-0.1);
  const legR = makeLeg(0.1);
  const armL = makeArm(-0.25);
  const armR = makeArm(0.25);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.36, 4, 10), shirt);
  torso.scale.set(0.85, 1, 1.18);
  torso.position.y = 1.2;
  const neck = at(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skin), 0, 1.5, 0);
  const head = at(new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), skin), 0, 1.63, 0);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairMesh.position.set(-0.012, 1.64, 0);
  hairMesh.rotation.z = 0.25;
  group.add(opts.cast(torso, false), neck, opts.cast(head, false), hairMesh);

  let rig: HumanRig | null = null;
  const walk = (phase: number, amount = 1) => {
    const a = Math.sin(phase) * 0.55 * amount;
    if (rig) {
      // Model joints swing around x; negative is forward.
      rig.joint("leg_L").rotation.x = -a;
      rig.joint("leg_R").rotation.x = a;
      rig.joint("shin_L").rotation.x = Math.max(0, -a) * 0.3 + Math.max(0, a) * 0.9;
      rig.joint("shin_R").rotation.x = Math.max(0, a) * 0.3 + Math.max(0, -a) * 0.9;
      rig.joint("arm_L").rotation.x = a * 0.75;
      rig.joint("arm_R").rotation.x = -a * 0.75;
      rig.joint("forearm_L").rotation.x = -0.12 - Math.abs(a) * 0.4;
      rig.joint("forearm_R").rotation.x = -0.12 - Math.abs(a) * 0.4;
      rig.joint("upper_body").rotation.y = a * 0.12;
      return;
    }
    legL.rotation.z = a;
    legR.rotation.z = -a;
    armL.rotation.z = -a * 0.7;
    armR.rotation.z = a * 0.7;
  };
  const reach = (left: number, right: number) => {
    if (rig) {
      rig.joint("arm_L").rotation.x -= left;
      rig.joint("arm_R").rotation.x -= right;
      return;
    }
    armL.rotation.z += left;
    armR.rotation.z += right;
  };
  const useRig = (next: HumanRig) => {
    for (const child of [...group.children]) child.visible = false;
    rig = next;
    group.add(next.root);
  };
  return { group, walk, reach, useRig };
}

/* ------------------------------------------------------------------ */
/* Delivery motorcycle with rider                                      */
/* ------------------------------------------------------------------ */

export interface Motorcycle {
  group: THREE.Group;
  /** Rolls with the lean angle. */
  body: THREE.Group;
  wheels: THREE.Object3D[];
  /** World-space helper: local position of the delivery box lid. */
  boxTop: THREE.Vector3;
  /** Seat the loaded human model on the bike in place of the placeholder rider. */
  mountRider(rig: HumanRig): void;
}

export function buildMotorcycle(opts: {
  cast: Cast;
  boxTexture?: THREE.Texture;
  paint?: string;
  jacket?: string;
  helmet?: string;
  deliveryBox?: boolean;
}): Motorcycle {
  const paint = std(opts.paint ?? "#111827", 0.35, 0.2);
  const accent = std("#059669", 0.4, 0.1);
  const metal = std("#B9BEC7", 0.3, 0.6);
  const dark = std("#1B1C20", 0.8);
  const seatMat = std("#0E0F12", 0.9);
  const jacket = lam(opts.jacket ?? "#059669");
  const trousers = lam("#1F2937");
  const helmetMat = std(opts.helmet ?? "#F8FAFC", 0.25, 0.1);
  const visorMat = std("#22303F", 0.1, 0.5);
  const skin = lam("#C68E63");

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const R = 0.3;
  const wheels: THREE.Object3D[] = [];
  for (const x of [0.68, -0.62]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.07, 0.075, 10, 26), dark);
    const rimGeo = new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.05, 16);
    rimGeo.rotateX(Math.PI / 2);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry((R - 0.1) * 2, 0.04, 0.06), dark);
    w.add(opts.cast(tire, false), new THREE.Mesh(rimGeo, metal), spoke);
    w.position.set(x, R + 0.045, 0);
    body.add(w);
    wheels.push(w);
  }
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    body.add(shadow ? opts.cast(m, false) : m);
    return m;
  };
  // frame, engine, body panels
  add(new THREE.BoxGeometry(0.46, 0.26, 0.26), metal, 0.02, 0.44, 0);
  add(new THREE.BoxGeometry(0.95, 0.22, 0.3), paint, -0.2, 0.68, 0);
  add(new THREE.BoxGeometry(0.62, 0.2, 0.32), paint, -0.5, 0.78, 0, 0.12);
  add(new THREE.BoxGeometry(0.66, 0.09, 0.29), seatMat, -0.34, 0.93, 0, 0.04);
  add(new THREE.BoxGeometry(0.07, 0.6, 0.46), accent, 0.4, 0.74, 0, -0.3);
  add(new THREE.BoxGeometry(0.34, 0.05, 0.3), paint, 0.2, 0.5, 0); // footboard
  add(new THREE.BoxGeometry(0.5, 0.05, 0.15), paint, 0.68, 0.71, 0, -0.08); // front fender
  add(new THREE.BoxGeometry(0.46, 0.05, 0.15), paint, -0.62, 0.72, 0, 0.1); // rear fender
  // fork + handlebar
  body.add(limb(new THREE.Vector3(0.68, 0.36, 0.11), new THREE.Vector3(0.48, 1.04, 0.11), 0.028, metal));
  body.add(limb(new THREE.Vector3(0.68, 0.36, -0.11), new THREE.Vector3(0.48, 1.04, -0.11), 0.028, metal));
  body.add(limb(new THREE.Vector3(0.47, 1.1, -0.33), new THREE.Vector3(0.47, 1.1, 0.33), 0.024, dark));
  add(new THREE.BoxGeometry(0.16, 0.2, 0.3), paint, 0.5, 1.0, 0, -0.2);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshBasicMaterial({ color: "#FFF4CC" }));
  lamp.position.set(0.59, 0.99, 0);
  lamp.scale.set(0.5, 1, 1.2);
  body.add(lamp);
  add(new THREE.BoxGeometry(0.05, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: "#E11D48" }), -0.83, 0.8, 0, 0, false);
  body.add(limb(new THREE.Vector3(-0.1, 0.36, 0.19), new THREE.Vector3(-0.78, 0.44, 0.19), 0.05, metal)); // exhaust
  for (const z of [-0.3, 0.3]) {
    body.add(limb(new THREE.Vector3(0.47, 1.1, z), new THREE.Vector3(0.42, 1.3, z * 1.1), 0.012, dark));
    add(new THREE.BoxGeometry(0.02, 0.09, 0.13), dark, 0.42, 1.32, z * 1.1, 0, false);
  }

  // placeholder rider (replaced by the loaded human model when available)
  const riderParts = new THREE.Group();
  body.add(riderParts);
  const addRider = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0, shadow = true) => {
    const m = add(geo, mat, x, y, z, rz, shadow);
    riderParts.add(m);
    return m;
  };
  const hipL = new THREE.Vector3(-0.28, 1.0, -0.13);
  const hipR = new THREE.Vector3(-0.28, 1.0, 0.13);
  const kneeL = new THREE.Vector3(0.1, 0.88, -0.21);
  const kneeR = new THREE.Vector3(0.1, 0.88, 0.21);
  riderParts.add(opts.cast(limb(hipL, kneeL, 0.085, trousers), false), opts.cast(limb(hipR, kneeR, 0.085, trousers), false));
  riderParts.add(limb(kneeL, new THREE.Vector3(0.14, 0.56, -0.2), 0.07, trousers), limb(kneeR, new THREE.Vector3(0.14, 0.56, 0.2), 0.07, trousers));
  addRider(new THREE.BoxGeometry(0.26, 0.09, 0.12), dark, 0.2, 0.55, -0.2, 0, false);
  addRider(new THREE.BoxGeometry(0.26, 0.09, 0.12), dark, 0.2, 0.55, 0.2, 0, false);
  const torso = limb(new THREE.Vector3(-0.27, 1.02, 0), new THREE.Vector3(0.02, 1.56, 0), 0.17, jacket);
  torso.scale.z = 1.2;
  riderParts.add(opts.cast(torso, false));
  addRider(new THREE.BoxGeometry(0.03, 0.2, 0.26), new THREE.MeshLambertMaterial({ color: "#F8FAFC" }), -0.29, 1.36, 0, 0.5, false); // back patch
  const shL = new THREE.Vector3(0.0, 1.5, -0.22);
  const shR = new THREE.Vector3(0.0, 1.5, 0.22);
  const elL = new THREE.Vector3(0.22, 1.27, -0.29);
  const elR = new THREE.Vector3(0.22, 1.27, 0.29);
  riderParts.add(limb(shL, elL, 0.065, jacket), limb(shR, elR, 0.065, jacket));
  riderParts.add(limb(elL, new THREE.Vector3(0.45, 1.12, -0.29), 0.05, jacket), limb(elR, new THREE.Vector3(0.45, 1.12, 0.29), 0.05, jacket));
  addRider(new THREE.SphereGeometry(0.06, 10, 8), skin, 0.46, 1.12, -0.29, 0, false);
  addRider(new THREE.SphereGeometry(0.06, 10, 8), skin, 0.46, 1.12, 0.29, 0, false);
  const helmet = addRider(new THREE.SphereGeometry(0.175, 20, 16), helmetMat, 0.1, 1.76, 0);
  helmet.scale.set(1.08, 1, 1);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.34), visorMat);
  visor.position.set(0.13, 1.76, 0);
  visor.rotation.z = -Math.PI / 2;
  riderParts.add(visor);

  // insulated delivery box on the rear rack
  const boxTop = new THREE.Vector3(-0.78, 1.62, 0);
  if (opts.deliveryBox !== false) {
    add(new THREE.BoxGeometry(0.5, 0.04, 0.42), metal, -0.76, 0.98, 0);
    const side = opts.boxTexture
      ? new THREE.MeshStandardMaterial({ map: opts.boxTexture, roughness: 0.6 })
      : std("#111827", 0.6);
    const plain = std("#111827", 0.6);
    const lid = std("#059669", 0.5);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.56), [plain, side, lid, plain, side, side]);
    box.position.set(-0.78, 1.29, 0);
    body.add(opts.cast(box, false));
  }
  const mountRider = (rig: HumanRig) => {
    riderParts.visible = false;
    // Seated pose: thighs forward, shins down, arms out to the handlebar.
    rig.root.position.set(-0.3, 0.21, 0);
    rig.joint("leg_L").rotation.set(-1.32, 0, 0.16);
    rig.joint("leg_R").rotation.set(-1.32, 0, -0.16);
    rig.joint("shin_L").rotation.x = 1.3;
    rig.joint("shin_R").rotation.x = 1.3;
    rig.joint("upper_body").rotation.x = 0.26;
    rig.joint("arm_L").rotation.set(-1.02, 0, 0.1);
    rig.joint("arm_R").rotation.set(-1.02, 0, -0.1);
    rig.joint("forearm_L").rotation.x = -0.3;
    rig.joint("forearm_R").rotation.x = -0.3;
    rig.joint("neck_pivot").rotation.x = -0.2;
    body.add(rig.root);
  };
  return { group, body, wheels, boxTop, mountRider };
}

/** Passenger tricycle: motorcycle with a roofed sidecar on the right. */
export function buildTricycle(opts: { cast: Cast; color: string }): Motorcycle {
  const bike = buildMotorcycle({ cast: opts.cast, paint: "#374151", jacket: "#2563EB", helmet: "#1F2937", deliveryBox: false });
  const paint = std(opts.color, 0.45, 0.1);
  const trim = std("#F8FAFC", 0.5);
  const dark = std("#1B1C20", 0.8);
  const g = bike.group;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.82, 0.86), paint);
  cab.position.set(-0.05, 0.72, 0.82);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.84), paint);
  nose.position.set(0.86, 0.56, 0.82);
  nose.rotation.z = -0.35;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.88), trim);
  stripe.position.set(-0.05, 0.86, 0.82);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.62), paint);
  roof.position.set(-0.05, 1.92, 0.36);
  g.add(opts.cast(cab, false), opts.cast(nose, false), stripe, opts.cast(roof, false));
  for (const [x, z] of [
    [0.95, -0.38],
    [0.95, 1.1],
    [-1.05, -0.38],
    [-1.05, 1.1],
  ]) {
    g.add(limb(new THREE.Vector3(x, 1.1, z), new THREE.Vector3(x, 1.92, z), 0.02, dark));
  }
  const third = wheel(0.3, 0.14, dark, std("#B9BEC7", 0.3, 0.6));
  third.position.set(-0.3, 0.3, 1.3);
  g.add(third);
  bike.wheels.push(third);
  return bike;
}

/* ------------------------------------------------------------------ */
/* Four-wheelers                                                       */
/* ------------------------------------------------------------------ */

export interface Vehicle {
  group: THREE.Group;
  wheels: THREE.Object3D[];
}

function addWheels(group: THREE.Group, xs: number[], halfTrack: number, radius: number) {
  const tire = std("#1C1D21", 0.92);
  const hub = std("#C9CED6", 0.4, 0.3);
  const wheels: THREE.Object3D[] = [];
  for (const x of xs) {
    for (const z of [-halfTrack, halfTrack]) {
      const w = wheel(radius, 0.26, tire, hub);
      w.position.set(x, radius, z);
      group.add(w);
      wheels.push(w);
    }
  }
  return wheels;
}

export function buildCar(opts: { cast: Cast; color: string }): Vehicle {
  const paint = std(opts.color, 0.35, 0.25);
  const glass = std("#26323F", 0.12, 0.4);
  const dark = std("#1B1C20", 0.8);
  const group = new THREE.Group();
  const lower = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.62, 1.72), paint);
  lower.position.y = 0.66;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.58, 1.56), glass);
  cabin.position.set(-0.25, 1.24, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 1.5), paint);
  roof.position.set(-0.3, 1.55, 0);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.56, 1.58), paint);
  pillar.position.set(-0.3, 1.24, 0);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 1.74), dark);
  bumperF.position.set(2.06, 0.5, 0);
  const bumperR = bumperF.clone();
  bumperR.position.x = -2.06;
  group.add(opts.cast(lower, false), opts.cast(cabin, false), roof, pillar, bumperF, bumperR);
  for (const z of [-0.58, 0.58]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.36), new THREE.MeshBasicMaterial({ color: "#FFF4CC" }));
    head.position.set(2.06, 0.78, z);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.36), new THREE.MeshBasicMaterial({ color: "#E11D48" }));
    tail.position.set(-2.06, 0.8, z);
    group.add(head, tail);
  }
  const wheels = addWheels(group, [1.3, -1.3], 0.78, 0.34);
  return { group, wheels };
}

/** Jeepney: the classic Philippine street icon. `sideTexture` is the painted side panel. */
export function buildJeepney(opts: { cast: Cast; sideTexture: THREE.Texture; color: string }): Vehicle {
  const paint = std(opts.color, 0.4, 0.2);
  const chrome = std("#D6DAE0", 0.22, 0.7);
  const dark = std("#1B1C20", 0.8);
  const glass = std("#26323F", 0.12, 0.4);
  const side = new THREE.MeshStandardMaterial({ map: opts.sideTexture, roughness: 0.45 });
  const group = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 1.8), dark);
  chassis.position.y = 0.62;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.5, 1.9), [paint, paint, paint, paint, side, side]);
  cabin.position.set(-0.75, 1.52, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 2.0), chrome);
  roof.position.set(-0.5, 2.32, 0);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 1.62), paint);
  hood.position.set(1.95, 1.08, 0);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.3), chrome);
  grille.position.set(2.65, 1.06, 0);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.7), glass);
  shield.position.set(1.27, 1.86, 0);
  shield.rotation.z = 0.16;
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 1.96), chrome);
  bumper.position.set(2.74, 0.66, 0);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 1.3), std("#FDE68A", 0.6));
  board.position.set(1.72, 2.5, 0);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.5), dark);
  rack.position.set(-1.2, 2.46, 0);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.2), chrome);
  step.position.set(-2.95, 0.6, 0);
  group.add(opts.cast(chassis, false), opts.cast(cabin, false), opts.cast(roof, false), opts.cast(hood, false), grille, shield, bumper, board, rack, step);
  for (const z of [-0.6, 0.6]) {
    const lampGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14);
    lampGeo.rotateZ(Math.PI / 2);
    const head = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: "#FFF4CC" }));
    head.position.set(2.68, 1.2, z * 1.15);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 10), chrome);
    horn.rotation.z = Math.PI / 2;
    horn.position.set(2.3, 1.56, z * 0.5);
    group.add(head, horn);
  }
  const wheels = addWheels(group, [1.85, -1.9], 0.86, 0.42);
  return { group, wheels };
}

/** Painted jeepney side panel (decor stripes + open window band). */
export function drawJeepneySide(ctx: CanvasRenderingContext2D, base: string) {
  const W = 512;
  const H = 192;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // window band
  ctx.fillStyle = "#1E2731";
  ctx.fillRect(20, 16, W - 40, 62);
  ctx.fillStyle = base;
  for (let x = 20; x < W - 20; x += 76) ctx.fillRect(x - 5, 16, 10, 62);
  // swooshes
  const swoosh = (color: string, y: number, h: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y - 26, 300, y + 30, W, y - 8);
    ctx.lineTo(W, y - 8 + h);
    ctx.bezierCurveTo(300, y + 30 + h, 140, y - 26 + h, 0, y + h);
    ctx.closePath();
    ctx.fill();
  };
  swoosh("#DC2626", 104, 16);
  swoosh("#2563EB", 128, 14);
  swoosh("#FACC15", 150, 10);
  // stars
  ctx.fillStyle = "#FFFFFF";
  for (const cx of [70, 256, 442]) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 6 : 14;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r, 92 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, H - 10, W, 10);
}

/* ------------------------------------------------------------------ */
/* Cargo plane (map chapter)                                           */
/* ------------------------------------------------------------------ */

export function buildPlane(): THREE.Group {
  const white = std("#FFFFFF", 0.4, 0.1);
  const green = std("#059669", 0.45, 0.1);
  const dark = std("#111827", 0.5, 0.2);
  const g = new THREE.Group();
  const fus = new THREE.CapsuleGeometry(0.52, 4.0, 6, 16);
  fus.rotateZ(-Math.PI / 2);
  g.add(new THREE.Mesh(fus, white));
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), dark);
  nose.position.set(2.2, 0.06, 0);
  nose.scale.set(0.9, 0.55, 0.8);
  g.add(nose);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.7), green);
  belly.position.set(-0.1, -0.42, 0);
  g.add(belly);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 3.4), white);
    wing.position.set(-0.25, -0.12, s * 1.95);
    wing.rotation.y = s * 0.32;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.08), green);
    tip.position.set(-0.86, 0.02, s * 3.55);
    const engine = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
    engine.rotateZ(Math.PI / 2);
    const eng = new THREE.Mesh(engine, dark);
    eng.position.set(0.25, -0.38, s * 1.4);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 1.3), white);
    stab.position.set(-2.35, 0.18, s * 0.72);
    stab.rotation.y = s * 0.3;
    g.add(wing, tip, eng, stab);
  }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.15, 0.09), green);
  fin.position.set(-2.3, 0.82, 0);
  fin.rotation.z = 0.32;
  g.add(fin);
  return g;
}
