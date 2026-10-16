import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { BatteryCharging, CircleGauge, Fan, Lightbulb, Pause, Play, RotateCcw, Sun, Zap, Box, Layers, Minus, Plus } from "lucide-react";
import { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import watermark from "@/assets/chui-watermark.jpg.asset.json";
import { LayerInteractions } from "./LayerInteractions";
import { SimulationNotes } from "./SimulationNotes";
import panelAsset from "@/assets/panel.stl.asset.json";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { calculateSolarReading, type LoadKind } from "@/lib/solar-model";
import { PANEL_PRESETS, layerHeight, physicalLayerOrder, type PanelKind, type SolarLayer, type LayerMaterial } from "@/lib/solar-layers";
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

function Layer({ layer, y, focused, dimmed, exploded, onSelect }: { layer: SolarLayer; y: number; focused: boolean; dimmed: boolean; exploded: boolean; onSelect: () => void }) {
  const palette = usePalette();
  const color = palette[layer.material];
  const opacity = dimmed ? 0.13 : ["glass", "encapsulant"].includes(layer.material) ? 0.25 : focused ? 1 : 0.92;
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(({ clock }) => { if (material.current) material.current.emissiveIntensity = focused ? 0.16 + 0.07 * Math.sin(clock.elapsedTime * 2) : 0; });
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = palette.contact;
      ctx.globalAlpha = layer.id === "perovskite" || layer.id === "silicon" ? 0.9 : 0.25;
      ctx.lineWidth = 0.8;
      for (let i = 8; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [color, palette.contact, layer.id]);
  useEffect(() => () => texture.dispose(), [texture]);
  const relief = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(4.25, 2.55, 40, 24);
    const positions = geometry.getAttribute("position");
    if (!positions) return geometry;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getY(i);
      const ridge = (1 - Math.abs(Math.sin(x * Math.PI / 0.34))) * (1 - Math.abs(Math.sin(z * Math.PI / 0.34)));
      positions.setZ(i, ridge * (exploded ? 0.23 : 0.018));
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [exploded]);
  useEffect(() => () => relief.dispose(), [relief]);
  const thickness = exploded ? 0.07 : 0.028;
  return (
    <group position={[-2.9, y, focused ? 1.1 : 0]} userData={{ layerId: layer.id }} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[layer.material === "glass" || layer.material === "backsheet" ? 4.4 : 4.25, thickness, 2.55]} />
        <meshPhysicalMaterial ref={material} map={texture} transparent={opacity < 1} opacity={opacity} depthWrite={!dimmed} roughness={0.32} metalness={layer.material === "contact" ? 0.5 : 0.08} emissive={color} />
      </mesh>
      {layer.id === "texture" && <mesh geometry={relief} position={[0, thickness / 2 + 0.002, 0]} rotation-x={-Math.PI / 2} name="exaggerated-silicon-pyramids"><meshStandardMaterial color={color} side={THREE.DoubleSide} flatShading transparent opacity={opacity} /></mesh>}
    </group>
  );
}

function CarrierFlow({ current, active, frontY, rearY, open }: { current: number; active: boolean; frontY: number; rearY: number; open: boolean }) {
  const PALETTE = usePalette();
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.7, frontY, 0), new THREE.Vector3(0.1, 3.8, 0), new THREE.Vector3(3.7, 3.8, 0),
    new THREE.Vector3(3.7, 0.15, 0), new THREE.Vector3(3.7, -3.5, 0), new THREE.Vector3(-0.7, -3.5, 0), new THREE.Vector3(-0.7, rearY, 0),
  ], false), [frontY, rearY]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const speed = 0.08 + current * 2.5;
    if (active) time.current += Math.min(delta, 0.05) * speed;
    group.current.children.forEach((child, index) => {
      const t = (time.current + index / 18) % 1;
      child.position.copy(curve.getPointAt(t));
      child.visible = !open;
    });
  });
  return (
    <>
      <mesh>
        <tubeGeometry args={[curve, 96, 0.035, 7, false]} />
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
  const frontY = layerHeight(layers.findIndex((layer) => layer.id === "izo" || layer.id === "silicon-front"), layers.length, exploded);
  const rearY = layerHeight(layers.findIndex((layer) => layer.id === "rear-contact"), layers.length, exploded);
  return (
    <>
      <color attach="background" args={[PALETTE.canvas]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-6, 10, 8]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Environment><Lightformer intensity={1.7} position={[0, 7, 2]} scale={[12, 6, 1]} /><Lightformer intensity={0.8} position={[7, 1, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} /></Environment>
      {original && <Suspense fallback={<mesh position={[-2.9, 0, 0]}><boxGeometry args={[4.4, 0.1, 2.55]} /><meshStandardMaterial color={PALETTE.contact} wireframe /></mesh>}><UploadedPanel exploded={exploded} /></Suspense>}
      {layers.map((layer, index) => <Layer key={layer.id} layer={layer} y={layerHeight(index, layers.length, exploded)} focused={selected === layer.id} dimmed={selected !== null && selected !== layer.id} exploded={exploded} onSelect={() => onSelect(selected === layer.id ? null : layer.id)} />)}
      <LayerInteractions layers={layers} exploded={exploded} selected={selected} running={running} irradiance={irradiance} current={reading.current} recombination={reading.recombination} colors={PALETTE} />
      <CarrierFlow current={reading.current} active={flowing} frontY={frontY} rearY={rearY} open={load === "open"} />
      {!exploded && <group position={[-2.9, layerHeight(0, layers.length, false) - 0.06, 0]} name="assembled-cell-fingers">
        {Array.from({ length: 15 }, (_, i) => <mesh key={i} position={[-1.95 + i * 0.28, 0, 0]}><boxGeometry args={[0.018, 0.012, 2.5]} /><meshStandardMaterial color={PALETTE.contact} metalness={0.8} roughness={0.25} /></mesh>)}
        {[-0.7, 0.7].map((z) => <mesh key={z} position={[0, 0.01, z]}><boxGeometry args={[4.2, 0.012, 0.04]} /><meshStandardMaterial color={PALETTE.contact} metalness={0.8} /></mesh>)}
      </group>}
      <LoadObject load={load} active={running && reading.loadActive} />
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
  const [seriesCells, setSeriesCells] = useState(1);
  const preset = PANEL_PRESETS[panel];
  const [palette] = useState(readPalette);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false); }, []);
  const reading = useMemo(() => calculateSolarReading(irradiance, temperature, load, panel, seriesCells), [irradiance, temperature, load, panel, seriesCells]);
  const sceneLayers = useMemo(() => exploded ? preset.layers : physicalLayerOrder(preset.layers), [preset.layers, exploded]);
  const focusLayer = preset.layers.find((layer) => layer.id === selected);

  return (
    <main className="sim-shell">
      <header className="sim-header">
        <div><p className="eyebrow">SOLAR CELL LAB</p><h1>{panel === "silicon" ? "Crystalline silicon" : "Silicon × Perovskite"}</h1></div>
        <div className="header-actions">
          <Button variant="outline" size="sm" aria-pressed={!exploded} onClick={() => { setExploded((value) => !value); setSelected(null); }}><RotateCcw />{exploded ? "Merge layers" : "Explode layers"}</Button>
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
          <div className="series-control"><p className="section-label">CELLS IN SERIES</p><div className="series-stepper"><Button variant="outline" size="icon" aria-label="Remove series cell" disabled={seriesCells === 1} onClick={() => setSeriesCells((value) => value - 1)}><Minus /></Button><output aria-label="Series cell count">{seriesCells}</output><Button variant="outline" size="icon" aria-label="Add series cell" disabled={seriesCells === 6} onClick={() => setSeriesCells((value) => value + 1)}><Plus /></Button></div><p>{seriesCells * 8} cm² total active area · identical illumination</p>{panel === "silicon" && load === "led" && !reading.loadActive && <Button variant="secondary" size="sm" onClick={() => setSeriesCells(4)}>Connect 4 silicon cells</Button>}</div>
          <div className="status-readout"><span className={running ? "live-dot" : "live-dot paused"} />{running ? reading.status : "Simulation paused"}</div>
          <div className="model-reference"><Button variant="ghost" size="sm" aria-pressed={original} onClick={() => setOriginal((value) => !value)}><Box />{original ? "Hide uploaded model" : "Uploaded model overlay"}</Button><p>17-layer mapping follows your supplied stack; the STL has no material labels.</p></div>
        </aside>

        <div className="viewport-wrap">
          <Canvas key={panel} shadows dpr={[1, 1.5]} camera={{ position: [8.8, 7.2, 10.5], fov: 43 }} gl={{ antialias: true }}>
            <ScenePalette.Provider value={palette}><Scene exploded={exploded} irradiance={irradiance} reading={reading} load={load} running={running} layers={sceneLayers} selected={selected} onSelect={setSelected} original={original} /></ScenePalette.Provider>
          </Canvas>
          <div className="scene-state">{exploded ? "Schematic cross-section" : "Assembled cell · exaggerated films"} · {seriesCells} cell{seriesCells > 1 ? "s" : ""} in circuit</div>
          <div className="legend" aria-label="Particle legend"><span><i className="dot electron" />Electron</span><span><i className="dot hole" />Hole</span><span><i className="dot photon" />Photon</span></div>
          <div className="scene-caption"><Layers /><span>{focusLayer ? `${focusLayer.number}. ${focusLayer.name}` : `${preset.layers.length}-layer ${panel === "silicon" ? "single-junction" : "tandem"} stack`}</span>{focusLayer && <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Full stack</Button>}</div>
        </div>
        <LayerExplorer layers={preset.layers} selected={selected} onSelect={setSelected} />
      </section>

      <section className="measurement-strip">
        <div className="metric"><span>VOLTAGE</span><strong>{reading.voltage.toFixed(2)} <small>V</small></strong></div>
        <div className="metric"><span>CURRENT</span><strong>{(reading.current * 1000).toFixed(0)} <small>mA</small></strong></div>
        <div className="metric"><span>POWER</span><strong>{(reading.power * 1000).toFixed(0)} <small>mW</small></strong></div>
        <div className="metric"><span>LOAD CONVERSION</span><strong>{(reading.efficiency * 100).toFixed(1)} <small>%</small></strong></div>
        <div className="metric recombination"><span>RECOMBINATION PROXY</span><strong>{reading.recombination.toFixed(2)} <small>index · 0–1</small></strong><div className="meter"><i style={{ width: `${reading.recombination * 100}%` }} /></div></div>
      </section>
      <SimulationNotes reading={reading} />
      <footer className="sim-footer"><span>Educational model · schematic layers, not to scale · assumed active area: 8 cm² per cell</span><span>Not calibrated to uploaded STL · recombination is illustrative</span><img className="author-watermark" src={watermark.url} alt="C. Hui watermark" /></footer>
    </main>
  );
}