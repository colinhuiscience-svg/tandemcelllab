import { describe, expect, it } from "vitest";
import { calculateSolarReading } from "@/lib/solar-model";
import { PANEL_PRESETS, TANDEM_LAYERS, SILICON_LAYERS } from "@/lib/solar-layers";

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
});