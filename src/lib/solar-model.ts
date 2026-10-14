import { PANEL_PRESETS, type PanelKind } from "./solar-layers";

export type LoadKind = "led" | "motor" | "resistor" | "battery" | "open";

export interface SolarReading {
  voltage: number;
  current: number;
  power: number;
  efficiency: number;
  recombination: number;
  status: string;
}

const LOADS: Record<Exclude<LoadKind, "open">, { resistance: number; threshold: number }> = {
  led: { resistance: 12, threshold: 1.25 },
  motor: { resistance: 4.5, threshold: 0.15 },
  resistor: { resistance: 18, threshold: 0 },
  battery: { resistance: 8, threshold: 1.35 },
};

export function calculateSolarReading(
  irradiance: number,
  temperature: number,
  load: LoadKind,
  panel: PanelKind = "commercial",
): SolarReading {
  const preset = PANEL_PRESETS[panel];
  const sun = irradiance / 1000;
  if (irradiance <= 0) return { voltage: 0, current: 0, power: 0, efficiency: 0, recombination: 0, status: "No light; no photogenerated carriers" };
  const temperatureFactor = Math.max(0.5, 1 + preset.temperatureCoefficient * (temperature - 25));
  const voc = Math.max(0.15, preset.voc * temperatureFactor + 0.055 * Math.log(Math.max(sun, 0.05)));
  // I(V) = Isc*(1-(V/Voc)^7.5); its exact normalized maximum-power factor.
  const maximumPowerFactor = Math.pow(1 / 8.5, 1 / 7.5) * (7.5 / 8.5);
  const isc = (preset.efficiency * 1000 * 0.0008) / (preset.voc * maximumPowerFactor) * sun;

  if (load === "open") {
    return {
      voltage: voc,
      current: 0,
      power: 0,
      efficiency: 0,
      recombination: Math.min(96, 62 + sun * 22),
      status: "Charge separation; carriers accumulate at the contacts",
    };
  }

  const { resistance, threshold } = LOADS[load];
  let low = 0;
  let high = voc;
  for (let i = 0; i < 36; i += 1) {
    const voltage = (low + high) / 2;
    const panelCurrent = isc * Math.max(0, 1 - Math.pow(voltage / voc, 7.5));
    const loadCurrent = Math.max(0, (voltage - threshold) / resistance);
    if (panelCurrent > loadCurrent) low = voltage;
    else high = voltage;
  }
  const voltage = (low + high) / 2;
  const current = isc * Math.max(0, 1 - Math.pow(voltage / voc, 7.5));
  const power = voltage * current;
  const recombination = Math.min(92, Math.max(8, 49 - current * 180 + sun * 7));

  const statuses: Record<Exclude<LoadKind, "open">, string> = {
    led: voltage > 1.3 ? "LED emitting light" : "LED below turn-on voltage",
    motor: current > 0.025 ? "Motor spinning" : "Motor stalled",
    resistor: "Resistor dissipating electrical power as heat",
    battery: current > 0.008 ? "Battery charging" : "Battery waiting for sufficient voltage",
  };

  return { voltage, current, power, efficiency: power / (irradiance * 0.0008), recombination, status: statuses[load] };
}