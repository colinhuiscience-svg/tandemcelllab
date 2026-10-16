import { PANEL_PRESETS, type PanelKind } from "./solar-layers";

export type LoadKind = "led" | "motor" | "resistor" | "battery" | "open";

export interface SolarReading {
  voltage: number;
  current: number;
  power: number;
  efficiency: number;
  recombination: number;
  status: string;
  incidentPower: number;
  maximumPower: number;
  openCircuitVoltage: number;
  shortCircuitCurrent: number;
  loadActive: boolean;
  seriesCells: number;
}

const LOADS: Record<Exclude<LoadKind, "open">, { resistance: number; threshold: number }> = {
  led: { resistance: 12, threshold: 1.6 },
  motor: { resistance: 4.5, threshold: 0.15 },
  resistor: { resistance: 18, threshold: 0 },
  battery: { resistance: 8, threshold: 1.35 },
};

export function calculateSolarReading(
  irradiance: number,
  temperature: number,
  load: LoadKind,
  panel: PanelKind = "commercial",
  cells = 1,
): SolarReading {
  const preset = PANEL_PRESETS[panel];
  const seriesCells = Math.max(1, Math.min(6, Math.round(cells)));
  const incidentPower = Math.max(0, irradiance) * 0.0008 * seriesCells;
  const sun = irradiance / 1000;
  if (irradiance <= 0) return { voltage: 0, current: 0, power: 0, efficiency: 0, recombination: 0, status: "No light; no photogenerated carriers", incidentPower: 0, maximumPower: 0, openCircuitVoltage: 0, shortCircuitCurrent: 0, loadActive: false, seriesCells };
  const temperatureFactor = Math.max(0.5, 1 + preset.temperatureCoefficient * (temperature - 25));
  const voc = Math.max(0, preset.voc * temperatureFactor + 0.055 * Math.log(sun)) * seriesCells;
  // I(V) = Isc*(1-(V/Voc)^7.5); its exact normalized maximum-power factor.
  const maximumPowerFactor = Math.pow(1 / 8.5, 1 / 7.5) * (7.5 / 8.5);
  const isc = (preset.efficiency * 1000 * 0.0008) / (preset.voc * maximumPowerFactor) * sun;
  const maximumPower = voc * isc * maximumPowerFactor;
  const extra = { incidentPower, maximumPower, openCircuitVoltage: voc, shortCircuitCurrent: isc, seriesCells };

  if (load === "open") {
    return {
      voltage: voc,
      current: 0,
      power: 0,
      efficiency: 0,
      recombination: 1,
      status: "Charge separation; carriers accumulate at the contacts",
      ...extra, loadActive: false,
    };
  }

  const { resistance, threshold } = LOADS[load];
  if (voc <= threshold) return { voltage: voc, current: 0, power: 0, efficiency: 0, recombination: 1, status: load === "led" ? "Cell voltage below the red LED's 1.6 V threshold" : "Insufficient voltage for this load", ...extra, loadActive: false };
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
  // Unextracted-current proxy, NOT a physical recombination rate or loss percentage.
  const recombination = Math.min(1, Math.max(0, 1 - current / isc));

  const statuses: Record<Exclude<LoadKind, "open">, string> = {
    led: current > 0.001 ? "Red LED emitting light" : "Red LED very dim",
    motor: current > 0.025 ? "Motor spinning" : "Motor stalled",
    resistor: "Resistor dissipating electrical power as heat",
    battery: current > 0.008 ? "Battery charging" : "Battery waiting for sufficient voltage",
  };

  const loadActive = load === "motor" ? current > 0.025 : load === "battery" ? current > 0.008 : load === "led" ? current > 0.001 : current > 0;
  return { voltage, current, power, efficiency: power / incidentPower, recombination, status: statuses[load], ...extra, loadActive };
}