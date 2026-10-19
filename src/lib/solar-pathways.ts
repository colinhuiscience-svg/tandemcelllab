import { physicalLayerOrder, type SolarLayer } from "./solar-layers";

export type PhotonBand = "visible" | "infrared" | "subgap" | "reflected";
export function photonDestination(layers: SolarLayer[], band: PhotonBand): string {
  if (band === "reflected") return "glass";
  if (band === "subgap") return "backsheet";
  return band === "visible" && layers.some((layer) => layer.id === "perovskite") ? "perovskite" : "silicon";
}

export function carrierRoute(layers: SolarLayer[], absorber: string, hole: boolean): string[] {
  layers = physicalLayerOrder(layers);
  const start = layers.findIndex((layer) => layer.id === absorber);
  if (start < 0) return [];
  const tandem = layers.some((layer) => layer.id === "perovskite");
  const endId = absorber === "perovskite" ? (hole ? "doped-oxide" : "izo") : (hole ? "rear-contact" : tandem ? "doped-oxide" : "silicon-front");
  const end = layers.findIndex((layer) => layer.id === endId);
  if (end < 0) return [];
  const step = end > start ? 1 : -1;
  const result: string[] = [];
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    const layer = layers[i];
    if (layer) result.push(layer.id);
  }
  return result;
}

// Schematic front-grid dimensions in cell-local coordinates, shared with the scene.
export const CONTACT_GRID = { fingerXs: Array.from({ length: 12 }, (_, i) => -1.925 + i * 0.35), busbarZs: [-0.7, 0.7], terminalX: 2.2 };

/** Electron collection: along a finger, along its busbar, then to the wire terminal. */
export function collectionPoint(finger: number, startZ: number, progress: number): [number, number] {
  const x = CONTACT_GRID.fingerXs[finger] ?? 0;
  const busZ = startZ < 0 ? -0.7 : 0.7;
  const t = Math.max(0, Math.min(1, progress));
  if (t < 0.4) return [x, startZ + (busZ - startZ) * t / 0.4];
  if (t < 0.85) return [x + (CONTACT_GRID.terminalX - x) * (t - 0.4) / 0.45, busZ];
  return [CONTACT_GRID.terminalX, busZ * (1 - (t - 0.85) / 0.15)];
}