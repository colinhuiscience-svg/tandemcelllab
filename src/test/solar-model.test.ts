import { describe, expect, it } from "vitest";
import { calculateSolarReading } from "@/lib/solar-model";
import { PANEL_PRESETS, TANDEM_LAYERS, SILICON_LAYERS } from "@/lib/solar-layers";
import { physicalLayerOrder, layerHeight } from "@/lib/solar-layers";
import { photonDestination, carrierRoute, CONTACT_GRID, collectionPoint } from "@/lib/solar-pathways";

describe("solar panel presets", () => {
  it("contains all 17 tandem layers in order and a single-absorber silicon stack", () => {
    expect(TANDEM_LAYERS).toHaveLength(17);
    expect(TANDEM_LAYERS.map((layer) => layer.number)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    expect(SILICON_LAYERS.some((layer) => layer.id === "perovskite")).toBe(false);
    expect(new Set(TANDEM_LAYERS.map((layer) => layer.id)).size).toBe(17);
  });
  it("has zero output without light and zero current with an open circuit", () => {
    for (const kind of ["commercial", "longi", "silicon"] as const) {
      expect(calculateSolarReading(0, 25, "resistor", kind).power).toBe(0);
      expect(calculateSolarReading(1000, 25, "open", kind).current).toBe(0);
    }
  });
  it("uses each preset's benchmark without misreporting loaded efficiency", () => {
    const commercial = calculateSolarReading(1000, 25, "resistor", "commercial");
    const record = calculateSolarReading(1000, 25, "resistor", "longi");
    expect(record.power).toBeGreaterThan(commercial.power);
    expect(record.efficiency).toBeLessThanOrEqual(PANEL_PRESETS.longi.efficiency);
    expect(calculateSolarReading(1000, 25, "led", "silicon").current).toBeLessThan(0.00001);
  });
  it("requires series voltage for silicon to light an LED without inventing current", () => {
    const single = calculateSolarReading(1000, 25, "led", "silicon");
    expect(single.current).toBe(0);
    expect(single.loadActive).toBe(false);
    const string = calculateSolarReading(1000, 25, "led", "silicon", 4);
    expect(string.loadActive).toBe(true);
    expect(string.current).toBeGreaterThan(0.001);
    expect(string.openCircuitVoltage).toBeCloseTo(single.openCircuitVoltage * 4);
    expect(string.incidentPower).toBeCloseTo(single.incidentPower * 4);
    expect(string.shortCircuitCurrent).toBeCloseTo(single.shortCircuitCurrent);
    expect(string.efficiency).toBeCloseTo(string.power / string.incidentPower);
  });
  it("reports the unextracted-current proxy consistently", () => {
    const open = calculateSolarReading(1000, 25, "open");
    const loaded = calculateSolarReading(1000, 25, "resistor");
    expect(open.recombination).toBe(1);
    expect(loaded.recombination).toBeCloseTo(1 - loaded.current / loaded.shortCircuitCurrent);
    expect(loaded.power).toBeLessThanOrEqual(loaded.maximumPower);
  });
  it("routes light to absorbers, not the front glass, and carriers to selective contacts", () => {
    expect(photonDestination(TANDEM_LAYERS, "visible")).toBe("perovskite");
    expect(photonDestination(TANDEM_LAYERS, "infrared")).toBe("silicon");
    expect(photonDestination(SILICON_LAYERS, "visible")).toBe("silicon");
    expect(photonDestination(TANDEM_LAYERS, "subgap")).toBe("backsheet");
    expect(carrierRoute(TANDEM_LAYERS, "perovskite", false)).toEqual(["perovskite", "interface-lif", "c60", "tin-oxide", "izo"]);
    expect(carrierRoute(TANDEM_LAYERS, "silicon", false).at(-1)).toBe("doped-oxide");
    expect(carrierRoute(TANDEM_LAYERS, "perovskite", true).at(-1)).toBe("doped-oxide");
  });
  it("assembles passivation against silicon while preserving supplied labels", () => {
    const merged = physicalLayerOrder(TANDEM_LAYERS);
    expect(merged.findIndex((layer) => layer.id === "rear-shj")).toBeLessThan(merged.findIndex((layer) => layer.id === "rear-contact"));
    expect(TANDEM_LAYERS[13]?.id).toBe("rear-contact");
    expect(layerHeight(0, 17, false) - layerHeight(1, 17, false)).toBeCloseTo(0.028);
  });
  it("generates silicon pairs with separate electron and hole extraction paths", () => {
    for (const layers of [TANDEM_LAYERS, SILICON_LAYERS]) {
      const absorber = photonDestination(layers, "infrared");
      expect(absorber).toBe("silicon");
      expect(carrierRoute(layers, absorber, false)[0]).toBe("silicon");
      expect(carrierRoute(layers, absorber, true)).toEqual(["silicon", "rear-shj", "rear-contact"]);
    }
  });
  it("collects electrons along fingers then busbars into the wire terminal", () => {
    expect(collectionPoint(0, -1.2, 0)).toEqual([CONTACT_GRID.fingerXs[0], -1.2]);
    expect(collectionPoint(0, -1.2, 0.4)).toEqual([CONTACT_GRID.fingerXs[0], -0.7]);
    expect(collectionPoint(0, -1.2, 0.85)).toEqual([2.2, -0.7]);
    expect(collectionPoint(0, -1.2, 1)[0]).toBe(2.2);
    expect(collectionPoint(0, -1.2, 1)[1]).toBeCloseTo(0);
  });
});