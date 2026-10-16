import type { SolarLayer } from "./solar-layers";

export type PhotonBand = "visible" | "infrared" | "subgap" | "reflected";
export function photonDestination(layers: SolarLayer[], band: PhotonBand): string {
  if (band === "reflected") return "glass";
  if (band === "subgap") return "backsheet";
  return band === "visible" && layers.some((layer) => layer.id === "perovskite") ? "perovskite" : "silicon";
}

export function carrierRoute(layers: SolarLayer[], absorber: string, hole: boolean): string[] {
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