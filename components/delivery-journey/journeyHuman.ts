// Loads the city-rider character (public/models/city-rider.glb) and turns it
// into lightweight, posable people. The source file is ~150 separate boxes; here
// they are merged into one mesh per joint so each person costs ~14 draw calls.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const HUMAN_URL = "/models/city-rider.glb";

const PIVOTS = new Set([
  "pelvis",
  "leg_L",
  "shin_L",
  "boot_L",
  "leg_R",
  "shin_R",
  "boot_R",
  "upper_body",
  "arm_L",
  "forearm_L",
  "arm_R",
  "forearm_R",
  "neck_pivot",
]);

export type JointName =
  | "pelvis"
  | "leg_L"
  | "shin_L"
  | "leg_R"
  | "shin_R"
  | "upper_body"
  | "arm_L"
  | "forearm_L"
  | "arm_R"
  | "forearm_R"
  | "neck_pivot";

export interface HumanLook {
  /** Recolour the jacket (keeps the model's light/dark shading). */
  jacket?: string;
  jeans?: string;
  helmetColor?: string;
  /** Show the riding helmet. Default true. */
  helmet?: boolean;
}

export interface HumanRig {
  /** Faces +x like every other actor in the scene; feet on y = 0. */
  root: THREE.Group;
  joint(name: JointName): THREE.Object3D;
}

export interface HumanTemplate {
  instantiate(look?: HumanLook): HumanRig;
  dispose(): void;
}

const baseName = (name: string) => name.replace(/_\d+$/, "");

function shadeFor(matName: string) {
  if (/_dark$/.test(matName)) return 0.62;
  if (/_light$/.test(matName)) return 1.22;
  return 0.9;
}

export async function loadHuman(url: string = HUMAN_URL): Promise<HumanTemplate> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const source = gltf.scene;
  source.updateMatrixWorld(true);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const tmpColor = new THREE.Color();

  const instantiate = (look: HumanLook = {}): HumanRig => {
    const joints = new Map<string, THREE.Object3D>();
    const buckets = new Map<THREE.Object3D, THREE.BufferGeometry[]>();
    const helmetParts = new Map<THREE.Object3D, THREE.BufferGeometry[]>();
    const tints: [RegExp, string | undefined][] = [
      [/^jacket_/, look.jacket],
      [/^jeans_/, look.jeans],
      [/^helmet_yellow/, look.helmetColor],
    ];

    const collect = (mesh: THREE.Mesh, pivot: THREE.Object3D, matrix: THREE.Matrix4, inHelmet: boolean) => {
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const name = mat?.name ?? "";
      tmpColor.copy(mat?.color ?? tmpColor.set("#888888"));
      for (const [pattern, colour] of tints) {
        if (colour && pattern.test(name)) tmpColor.set(colour).multiplyScalar(shadeFor(name));
      }
      const geo = mesh.geometry.clone();
      geo.deleteAttribute("uv");
      geo.applyMatrix4(matrix);
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colors.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const target = inHelmet ? helmetParts : buckets;
      const list = target.get(pivot) ?? [];
      list.push(geo);
      target.set(pivot, list);
    };

    const walk = (node: THREE.Object3D, pivot: THREE.Object3D, matrix: THREE.Matrix4, inHelmet: boolean) => {
      const name = baseName(node.name);
      const isMesh = (node as THREE.Mesh).isMesh === true;
      if (!isMesh && PIVOTS.has(name) && node.children.length > 0) {
        const group = new THREE.Group();
        group.name = name;
        group.position.copy(node.position);
        group.scale.copy(node.scale);
        // Start from a neutral standing pose; the file is exported mid-stride.
        pivot.add(group);
        joints.set(name, group);
        for (const child of node.children) walk(child, group, new THREE.Matrix4(), inHelmet);
        return;
      }
      const local = matrix.clone().multiply(node.matrix);
      const helmet = inHelmet || name === "helmet";
      if (isMesh) collect(node as THREE.Mesh, pivot, local, helmet);
      for (const child of node.children) walk(child, pivot, local, helmet);
    };

    const rig = new THREE.Group();
    for (const child of source.children) walk(child, rig, new THREE.Matrix4(), false);

    const flush = (map: Map<THREE.Object3D, THREE.BufferGeometry[]>, visible: boolean) => {
      map.forEach((list, pivot) => {
        const merged = mergeGeometries(list);
        list.forEach((g) => g.dispose());
        if (!merged) return;
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.visible = visible;
        pivot.add(mesh);
      });
    };
    flush(buckets, true);
    flush(helmetParts, look.helmet !== false);

    // The model faces +z; the scene's actors face +x.
    rig.rotation.y = Math.PI / 2;
    const root = new THREE.Group();
    root.add(rig);
    const fallback = new THREE.Group();
    return {
      root,
      joint: (name) => joints.get(name) ?? fallback,
    };
  };

  const dispose = () => {
    source.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  };

  return { instantiate, dispose };
}
