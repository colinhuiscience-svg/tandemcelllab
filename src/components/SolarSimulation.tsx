import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { BatteryCharging, CircleGauge, Fan, Lightbulb, Pause, Play, RotateCcw, Sun, Zap, Box, Layers } from "lucide-react";
import { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import panelAsset from "@/assets/panel.stl.asset.json";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { calculateSolarReading, type LoadKind } from "@/lib/solar-model";
import { PANEL_PRESETS, layerHeight, type PanelKind, type SolarLayer, type LayerMaterial } from "@/lib/solar-layers";
import { LayerExplorer } from "./LayerExplorer";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Palette = Record<LayerMaterial | "electron" | "hole" | "wire" | "photon" | "canvas", string>;
const ScenePalette = createContext<Palette | null>(null);
function usePalette() {
  const palette = useContext(ScenePalette);
  if (!palette) throw new Error("Scene palette unavailable");
  return palette;
}
function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const color = (name: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = css.getPropertyValue(`--${name}`).trim();
    ctx.fillRect(0, 0, 1, 1);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  };
  return { silicon: color("silicon"), perovskite: color("perovskite"), electron: color("electron"), hole: color("hole"), contact: color("contact"), wire: color("wire"), photon: color("photon"), canvas: color("canvas"), glass: color("glass"), encapsulant: color("encapsulant"), optical: color("optical"), transport: color("transport"), molecular: color("molecular"), backsheet: color("backsheet") };
}

const LOADS: Array<{ id: LoadKind; label: string; icon: typeof Lightbulb }> = [
  { id: "led", label: "LED", icon: Lightbulb },
  { id: "motor", label: "Motor", icon: Fan },
  { id: "resistor", label: "Resistor", icon: Zap },
  { id: "battery", label: "Battery", icon: BatteryCharging },
  { id: "open", label: "Open", icon: CircleGauge },
];

function UploadedPanel({ exploded }: { exploded: boolean }) {
  const PALETTE = usePalette();
  const source = useLoader(STLLoader, panelAsset.url);
  const geometry = useMemo(() => {
    const clone = source.clone();
    clone.computeVertexNormals();
    clone.center();
    clone.computeBoundingBox();
    const size = clone.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1);
    clone.scale(5.2 / Math.max(size.x, size.y, size.z), 5.2 / Math.max(size.x, size.y, size.z), 5.2 / Math.max(size.x, size.y, size.z));
    return clone;
  }, [source]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[-2.9, -0.35, exploded ? -1.7 : -0.85]} castShadow>
      <meshStandardMaterial color={PALETTE.contact} transparent opacity={exploded ? 0.1 : 0.28} wireframe={exploded} roughness={0.28} metalness={0.42} />
    </mesh>
  );
}

function Layer({ layer, y, focused, dimmed, onSelect }: { layer: SolarLayer; y: number; focused: boolean; dimmed: boolean; onSelect: () => void }) {
  const palette = usePalette();
  const color = palette[layer.material];
  const opacity = dimmed ? 0.13 : focused ? 1 : ["glass", "encapsulant"].includes(layer.material) ? 0.55 : 0.95;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = palette.contact;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 0.8;
      for (let i = 8; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [color, palette.contact]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[-2.9, y, focused ? 1.1 : 0]} castShadow receiveShadow userData={{ layerId: layer.id }} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <boxGeometry args={[layer.material === "glass" || layer.material === "backsheet" ? 4.4 : 4.25, 0.07, 2.55]} />
      <meshPhysicalMaterial map={texture} transparent={opacity < 1} opacity={opacity} depthWrite={!dimmed} roughness={0.32} metalness={0.08} emissive={color} emissiveIntensity={focused ? 0.2 : 0} />
    </mesh>
  );
}

function Photons({ active, top }: { active: boolean; top: number }) {
  const PALETTE = usePalette();
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (!group.current || !active) return;
    time.current += Math.min(delta, 0.05);
    group.current.children.forEach((child, index) => {
      child.position.y = top + 2.1 - ((time.current * 1.25 + index * 0.55) % 2.1);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} position={[-4.4 + index * 0.5, 4.5, (index % 2) * 0.7 - 0.35]}>
          <sphereGeometry args={[0.065, 10, 10]} />
          <meshBasicMaterial color={PALETTE.photon} />
        </mesh>
      ))}
    </group>
  );
}

function CarrierFlow({ current, active }: { current: number; active: boolean }) {
  const PALETTE = usePalette();
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.7, 0.75, 0), new THREE.Vector3(0.1, 2.8, 0), new THREE.Vector3(3.7, 2.8, 0),
      new THREE.Vector3(3.7, 0.15, 0), new THREE.Vector3(3.7, -2.6, 0), new THREE.Vector3(-1, -2.6, 0), new THREE.Vector3(-2.9, -1.15, 0),
    ], true),
    [],
  );
  useFrame((_, delta) => {
    if (!group.current) return;
    const speed = 0.08 + current * 2.5;
    if (active) time.current += Math.min(delta, 0.05) * speed;
    group.current.children.forEach((child, index) => {
      const t = (time.current + index / 18) % 1;
      child.position.copy(curve.getPointAt(t));
    });
  });
  return (
    <>
      <mesh>
        <tubeGeometry args={[curve, 96, 0.035, 7, true]} />
        <meshStandardMaterial color={PALETTE.wire} metalness={0.7} roughness={0.32} />
      </mesh>
      <group ref={group}>
        {Array.from({ length: 18 }, (_, index) => (
          <mesh key={index} scale={active ? 1 : 0.7}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color={PALETTE.electron} />
          </mesh>
        ))}
      </group>
    </>
  );
}

function Recombination({ rate, active, y }: { rate: number; active: boolean; y: number }) {
  const PALETTE = usePalette();
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (!group.current || !active) return;
    const cycleSpeed = 0.45 + rate / 85;
    time.current += Math.min(delta, 0.05) * cycleSpeed;
    for (let i = 0; i < group.current.children.length; i += 2) {
      const electron = group.current.children[i];
      const hole = group.current.children[i + 1];
      if (!electron || !hole) continue;
      const phase = (time.current + i * 0.13) % 1;
      const pair = i / 2;
      const x = -4.25 + (pair % 4) * 0.85;
      const z = -0.65 + Math.floor(pair / 4) * 1.25;
      const separation = (1 - phase) * 0.34;
      const scale = phase > 0.82 ? (1 - phase) / 0.18 : 1;
      electron.position.set(x - separation, y + 0.09, z);
      hole.position.set(x + separation, y + 0.09, z);
      electron.scale.setScalar(scale);
      hole.scale.setScalar(scale);
    }
  });
  return (
    <group ref={group}>
      {Array.from({ length: 8 }, (_, index) => [
        <mesh key={`electron-${index}`}><sphereGeometry args={[0.085, 10, 10]} /><meshBasicMaterial color={PALETTE.electron} /></mesh>,
        <mesh key={`hole-${index}`}><torusGeometry args={[0.085, 0.025, 8, 12]} /><meshBasicMaterial color={PALETTE.hole} /></mesh>,
      ]).flat()}
    </group>
  );
}

function LoadObject({ load, active }: { load: LoadKind; active: boolean }) {
  const PALETTE = usePalette();
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (rotor.current && load === "motor" && active) rotor.current.rotation.z -= Math.min(delta, 0.05) * 7;
  });
  return (
    <group position={[3.7, 0.15, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.66, 0.66, 0.32, 32]} /><meshStandardMaterial color={PALETTE.contact} roughness={0.25} metalness={0.45} /></mesh>
      {load === "led" && <mesh position={[0, 0.58, 0]}><sphereGeometry args={[0.38, 24, 24]} /><meshStandardMaterial color={PALETTE.photon} emissive={PALETTE.photon} emissiveIntensity={active ? 2.4 : 0.08} transparent opacity={0.75} /></mesh>}
      {load === "motor" && <group ref={rotor} position={[0, 0, 0.2]}>{[0, 1, 2].map((i) => <mesh key={i} rotation-z={(i * Math.PI * 2) / 3} position={[0, 0.46, 0]}><boxGeometry args={[0.18, 0.75, 0.08]} /><meshStandardMaterial color={PALETTE.silicon} /></mesh>)}</group>}
      {load === "resistor" && <mesh rotation-z={Math.PI / 2}><boxGeometry args={[0.28, 1.1, 0.28]} /><meshStandardMaterial color={PALETTE.perovskite} /></mesh>}
      {load === "battery" && <group><mesh><boxGeometry args={[0.62, 1.1, 0.42]} /><meshStandardMaterial color={PALETTE.silicon} /></mesh><mesh position={[0, 0.68, 0]}><boxGeometry args={[0.18, 0.25, 0.18]} /><meshStandardMaterial color={PALETTE.contact} /></mesh></group>}
      {load === "open" && <><mesh position={[-0.27, 0.5, 0]} rotation-z={-0.45}><boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color={PALETTE.contact} /></mesh><mesh position={[0.27, 0.45, 0]}><boxGeometry args={[0.08, 0.4, 0.08]} /><meshStandardMaterial color={PALETTE.contact} /></mesh></>}
    </group>
  );
}

function FocusCamera({ selected, layers, exploded }: { selected: string | null; layers: SolarLayer[]; exploded: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const index = layers.findIndex((layer) => layer.id === selected);
    const y = index < 0 ? 0 : layerHeight(index, layers.length, exploded);
    const target = index < 0 ? new THREE.Vector3(-0.3, 0, 0) : new THREE.Vector3(-2.9, y, 1.1);
    const offset = index < 0 ? new THREE.Vector3(10, 7.5, 13).multiplyScalar(size.width < 500 ? 1.22 : 1) : new THREE.Vector3(4.4, 3.5, 6.2).multiplyScalar(size.width < 500 ? 1.15 : 1);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    if (controls.current) { controls.current.target.copy(target); controls.current.update(); }
  }, [selected, layers, exploded, camera, size.width]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={5} maxDistance={26} minPolarAngle={0.45} maxPolarAngle={1.5} />;
}

function Scene({ exploded, irradiance, reading, load, running, layers, selected, onSelect, original }: { exploded: boolean; irradiance: number; reading: ReturnType<typeof calculateSolarReading>; load: LoadKind; running: boolean; layers: SolarLayer[]; selected: string | null; onSelect: (id: string | null) => void; original: boolean }) {
  const PALETTE = usePalette();
  const flowing = running && reading.current > 0.002;
  const absorberIndex = layers.findIndex((layer) => layer.id === "perovskite" || layer.id === "silicon");
  const activeY = layerHeight(absorberIndex, layers.length, exploded);
  return (
    <>
      <color attach="background" args={[PALETTE.canvas]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-6, 10, 8]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Environment><Lightformer intensity={1.7} position={[0, 7, 2]} scale={[12, 6, 1]} /><Lightformer intensity={0.8} position={[7, 1, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} /></Environment>
      {original && <Suspense fallback={<mesh position={[-2.9, 0, 0]}><boxGeometry args={[4.4, 0.1, 2.55]} /><meshStandardMaterial color={PALETTE.contact} wireframe /></mesh>}><UploadedPanel exploded={exploded} /></Suspense>}
      {layers.map((layer, index) => <Layer key={layer.id} layer={layer} y={layerHeight(index, layers.length, exploded)} focused={selected === layer.id} dimmed={selected !== null && selected !== layer.id} onSelect={() => onSelect(selected === layer.id ? null : layer.id)} />)}
      <Photons active={running && irradiance > 80} top={layerHeight(0, layers.length, exploded)} />
      <CarrierFlow current={reading.current} active={flowing} />
      <Recombination rate={reading.recombination} active={running && irradiance > 80} y={activeY} />
      <LoadObject load={load} active={flowing} />
      <FocusCamera selected={selected} layers={layers} exploded={exploded} />
    </>
  );
}

export function SolarSimulation() {
  const [irradiance, setIrradiance] = useState(820);
  const [temperature, setTemperature] = useState(32);
  const [load, setLoad] = useState<LoadKind>("led");
  const [exploded, setExploded] = useState(true);
  const [running, setRunning] = useState(true);
  const [panel, setPanel] = useState<PanelKind>("commercial");
  const [selected, setSelected] = useState<string | null>(null);
  const [original, setOriginal] = useState(false);
  const preset = PANEL_PRESETS[panel];
  const [palette] = useState(readPalette);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false); }, []);
  const reading = useMemo(() => calculateSolarReading(irradiance, temperature, load, panel), [irradiance, temperature, load, panel]);
  const focusLayer = preset.layers.find((layer) => layer.id === selected);

  return (
    <main className="sim-shell">
      <header className="sim-header">
        <div><p className="eyebrow">SOLAR CELL LAB</p><h1>{panel === "silicon" ? "Crystalline silicon" : "Silicon × Perovskite"}</h1></div>
        <div className="header-actions">
          <Button variant="outline" size="sm" onClick={() => setExploded((value) => !value)}><RotateCcw />{exploded ? "Assemble" : "Explode layers"}</Button>
          <Button size="icon" aria-label={running ? "Pause simulation" : "Play simulation"} title={running ? "Pause simulation" : "Play simulation"} onClick={() => setRunning((value) => !value)}>{running ? <Pause /> : <Play />}</Button>
        </div>
      </header>

      <section className="preset-band" aria-label="Solar panel options">
        <div className="preset-options">{(["commercial", "longi", "silicon"] as const).map((kind) => <Button key={kind} variant={panel === kind ? "default" : "outline"} aria-pressed={panel === kind} className="preset-option" onClick={() => { setPanel(kind); setSelected(null); }}><span>{PANEL_PRESETS[kind].shortName}</span><small>{(PANEL_PRESETS[kind].efficiency * 100).toFixed(1)}% reference</small></Button>)}</div>
        <p className="preset-note">{preset.note}{panel === "longi" && <> <a className="text-primary underline" href="https://www.longi.com/en/news/crystalline-silicon-perovskite-tandem-solar-cell-new-world-efficiency-2026/" target="_blank" rel="noreferrer">LONGi certification announcement</a></>}</p>
      </section>

      <section className="sim-layout">
        <aside className="controls-panel">
          <div className="control-block">
            <div className="control-label"><span><Sun /> Irradiance</span><strong>{irradiance} W/m²</strong></div>
            <Slider aria-label="Irradiance" value={[irradiance]} min={0} max={1200} step={10} onValueChange={(value) => setIrradiance(value[0] ?? 0)} />
            <div className="range-labels"><span>Night</span><span>1 sun</span><span>High</span></div>
          </div>
          <div className="control-block">
            <div className="control-label"><span>Temperature</span><strong>{temperature}°C</strong></div>
            <Slider aria-label="Temperature" value={[temperature]} min={-10} max={80} step={1} onValueChange={(value) => setTemperature(value[0] ?? 25)} />
          </div>
          <div className="control-block">
            <p className="section-label">EXTERNAL CIRCUIT</p>
            <div className="load-grid">
              {LOADS.map(({ id, label, icon: Icon }) => (
                <Button key={id} variant={load === id ? "default" : "outline"} className="load-button" onClick={() => setLoad(id)}><Icon /><span>{label}</span></Button>
              ))}
            </div>
          </div>
          <div className="status-readout"><span className={running ? "live-dot" : "live-dot paused"} />{running ? reading.status : "Simulation paused"}</div>
          <div className="model-reference"><Button variant="ghost" size="sm" aria-pressed={original} onClick={() => setOriginal((value) => !value)}><Box />{original ? "Hide uploaded model" : "Uploaded model overlay"}</Button><p>17-layer mapping follows your supplied stack; the STL has no material labels.</p></div>
        </aside>

        <div className="viewport-wrap">
          <Canvas key={panel} shadows dpr={[1, 1.5]} camera={{ position: [8.8, 7.2, 10.5], fov: 43 }} gl={{ antialias: true }}>
            <ScenePalette.Provider value={palette}><Scene exploded={exploded} irradiance={irradiance} reading={reading} load={load} running={running} layers={preset.layers} selected={selected} onSelect={setSelected} original={original} /></ScenePalette.Provider>
          </Canvas>
          <div className="legend" aria-label="Particle legend"><span><i className="dot electron" />Electron</span><span><i className="dot hole" />Hole</span><span><i className="dot photon" />Photon</span></div>
          <div className="scene-caption"><Layers /><span>{focusLayer ? `${focusLayer.number}. ${focusLayer.name}` : `${preset.layers.length}-layer ${panel === "silicon" ? "single-junction" : "tandem"} stack`}</span>{focusLayer && <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Full stack</Button>}</div>
        </div>
        <LayerExplorer layers={preset.layers} selected={selected} onSelect={setSelected} />
      </section>

      <section className="measurement-strip">
        <div className="metric"><span>VOLTAGE</span><strong>{reading.voltage.toFixed(2)} <small>V</small></strong></div>
        <div className="metric"><span>CURRENT</span><strong>{(reading.current * 1000).toFixed(0)} <small>mA</small></strong></div>
        <div className="metric"><span>POWER</span><strong>{(reading.power * 1000).toFixed(0)} <small>mW</small></strong></div>
        <div className="metric"><span>LOAD EFFICIENCY</span><strong>{(reading.efficiency * 100).toFixed(1)} <small>%</small></strong></div>
        <div className="metric recombination"><span>RECOMBINATION</span><strong>{reading.recombination.toFixed(0)} <small>% relative</small></strong><div className="meter"><i style={{ width: `${reading.recombination}%` }} /></div></div>
      </section>
      <footer className="sim-footer"><span>Educational model · schematic layers, not to scale · assumed active area: 8 cm²</span><span>Not calibrated to uploaded STL · recombination is illustrative</span></footer>
    </main>
  );
}