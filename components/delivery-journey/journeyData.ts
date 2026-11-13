// Shared copy + timeline for the scroll-driven delivery journey.
// Every animation in the 3D scene and the HTML overlays is a pure function of
// scroll progress p (0..1), so scrolling backwards replays it in reverse.
//
// Story: seller hands over the parcel -> van drives through the city ->
// sorting hub -> cargo flight across the archipelago -> motorcycle rider
// through a Davao neighbourhood -> handed to the buyer at the gate.

export const TIMELINE = {
  // 1. Seller pickup (side view)
  pickupStart: 0.016,
  pickupEnd: 0.042,
  introEnd: 0.05,
  // 2. Service signboards
  signsStart: 0.062,
  signStep: 0.026,
  signPop: 0.02,
  servicesEnd: 0.185,
  // 3. Camera swings to top-down while the van reaches the intersection
  tiltStart: 0.2,
  tiltEnd: 0.3,
  // 4. Sorting hub
  hubStart: 0.4,
  hubEnd: 0.465,
  dockStart: 0.412,
  dockEnd: 0.445,
  // 5. Up through the clouds to the map
  riseStart: 0.465,
  swapMap: 0.5,
  riseEnd: 0.538,
  routeStart: 0.548,
  routeEnd: 0.628,
  // 6. Down through the clouds into the neighbourhood
  descendStart: 0.642,
  swapSuburb: 0.676,
  descendEnd: 0.712,
  // 7. Chase camera behind the rider
  swoopStart: 0.704,
  swoopEnd: 0.768,
  rideStart: 0.706,
  rideEnd: 0.925,
  // 8. Arrival and hand-off
  arriveStart: 0.88,
  arriveEnd: 0.93,
  walkStart: 0.9,
  handStart: 0.932,
  handEnd: 0.955,
  confettiStart: 0.953,
} as const;

export type ServiceIcon = "store" | "chat" | "wallet" | "shield";

export interface ServiceSign {
  num: string;
  title: string;
  lines: [string, string];
  icon: ServiceIcon;
}

export const SERVICE_SIGNS: ServiceSign[] = [
  { num: "01", title: "Verified stores", lines: ["Local shops with", "real buyer reviews"], icon: "store" },
  { num: "02", title: "Seller chat", lines: ["Ask for sizes and", "live stock photos"], icon: "chat" },
  { num: "03", title: "Pay your way", lines: ["COD, GCash, Maya", "or bank transfer"], icon: "wallet" },
  { num: "04", title: "Protected", lines: ["Tracked orders and", "a receipt every time"], icon: "shield" },
];

export interface Checkpoint {
  status: string;
  place: string;
  detail: string;
  time: string;
}

/** Cards anchored to the 3D road markers in the top-down chapter. */
export const CHECKPOINTS: Checkpoint[] = [
  { status: "Picked up", place: "Quezon City", detail: "Scanned and loaded by the courier.", time: "Mon 2:40 PM" },
  { status: "On the way", place: "EDSA, Quezon City", detail: "Heading to the sorting hub.", time: "Mon 4:05 PM" },
  { status: "Arriving at hub", place: "Manila sorting hub", detail: "Next stop: sorted for the flight south.", time: "Mon 6:15 PM" },
];

export interface TrackStep {
  label: string;
  place: string;
  time: string;
  /** scroll progress at which this step is reached */
  at: number;
}

/** The live tracker bar that follows the whole story. */
export const TRACK_STEPS: TrackStep[] = [
  { label: "Order confirmed", place: "Quezon City", time: "Mon 9:12 AM", at: TIMELINE.pickupStart },
  { label: "Picked up", place: "Quezon City", time: "Mon 2:40 PM", at: TIMELINE.pickupEnd },
  { label: "At sorting hub", place: "Manila", time: "Mon 6:15 PM", at: TIMELINE.hubStart },
  { label: "In transit", place: "Flight to Davao", time: "Tue 6:05 AM", at: TIMELINE.routeStart },
  { label: "Out for delivery", place: "Davao City", time: "Thu 8:30 AM", at: TIMELINE.rideStart },
  { label: "Delivered", place: "Davao City", time: "Thu 11:18 AM", at: TIMELINE.confettiStart },
];

export interface MapCity {
  name: string;
  note: string;
  lon: number;
  lat: number;
  /** 0..1 position along the drawn route where this pin appears */
  at: number;
}

export const MAP_CITIES: MapCity[] = [
  { name: "Metro Manila", note: "Sorting hub", lon: 121.04, lat: 14.68, at: 0 },
  { name: "Cebu", note: "Stopover", lon: 123.89, lat: 10.32, at: 0.52 },
  { name: "Davao City", note: "Rider takes over", lon: 125.61, lat: 7.07, at: 0.995 },
];

export const REGIONS = [
  { name: "Luzon", detail: "Metro Manila, Quezon City and the northern provinces" },
  { name: "Visayas", detail: "Cebu, Iloilo, Bacolod and the island hubs" },
  { name: "Mindanao", detail: "Davao, Cagayan de Oro and General Santos" },
];

/** Rail navigation: a chapter is active from `from`; clicking scrolls to `jump`. */
export const CHAPTERS = [
  { label: "Pickup", from: 0, jump: 0 },
  { label: "Shop", from: 0.06, jump: 0.14 },
  { label: "Hub", from: 0.3, jump: 0.43 },
  { label: "Nationwide", from: 0.5, jump: 0.6 },
  { label: "Rider", from: 0.69, jump: 0.83 },
  { label: "Delivered", from: 0.93, jump: 1 },
] as const;

/** Number of screen anchors the scene reports: checkpoints + map cities. */
export const ANCHOR_COUNT = CHECKPOINTS.length + MAP_CITIES.length;
/** Floats per anchor in the anchors array: x, y, visible(0/1), state. */
export const ANCHOR_STRIDE = 4;
