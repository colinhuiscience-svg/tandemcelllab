import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { BatteryCharging, CircleGauge, Fan, Lightbulb, Pause, Play, RotateCcw, Sun, Zap } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import panelAsset from "@/assets/panel.stl.asset.json";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { calculateSolarReading, type LoadKind } from "@/lib/solar-model";

const PALETTE = {
  silicon: "#29a4b8",
  perovskite: "#d89b36",
  electron: "#56b8ff",
  hole: "#ff846e",
  contact: "#d9e2ea",
  wire: "#6d7885",
  photon: "#ffd657",
};

const LOADS: Array<{ id: LoadKind; label: string; icon: typeof Lightbulb }> = [
  { id: "led", label: "LED", icon: Lightbulb },
  { id: "motor", label: "Motor", icon: Fan },
  { id: "resistor", label: "Resistor", icon: Zap },
  { id: "battery", label: "Battery", icon: BatteryCharging },
  { id: "open", label: "Open", icon: CircleGauge },
];

function UploadedPanel({ exploded }: { exploded: boolean }) {
  const source = useLoader(STLLoader, panelAsset.url);
  const geometry = useMemo(() => {
    const clone = source.clone();
    clone.computeVertexNormals();
    clone.center();
    const size = new THREE.Box3().setFromBufferAttribute(clone.attributes.position).getSize(new THREE.Vector3());
    clone.scale(5.2 / Math.max(size.x, size.y, size.z), 5.2 / Math.max(size.x, size.y, size.z), 5.2 / Math.max(size.x, size.y, size.z));
    return clone;
  }, [source]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[-2.9, -0.35, exploded ? -1.7 : -0.85]} castShadow>
      <meshStandardMaterial color={PALETTE.contact} transparent opacity={exploded ? 0.1 : 0.28} wireframe={exploded} roughness={0.28} metalness={0.42} />
    </mesh>
  );
}

function Layer({ y, color, width, depth, opacity = 1 }: { y: number; color: string; width: number; depth: number; opacity?: number }) {
  return (
    <mesh position={[-2.9, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.18, depth]} />
      <meshPhysicalMaterial color={color} transparent={opacity < 1} opacity={opacity} roughness={0.32} metalness={0.08} transmission={opacity < 1 ? 0.12 : 0} />
    </mesh>
  );
}

function Photons({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current || !active) return;
    group.current.children.forEach((child, index) => {
      child.position.y = 4.6 - ((state.clock.elapsedTime * 1.25 + index * 0.55) % 3.3);
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
  const group = useRef<THREE.Group>(null);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.7, 0.75, 0), new THREE.Vector3(0.1, 2.8, 0), new THREE.Vector3(3.7, 2.8, 0),
      new THREE.Vector3(4.6, 0.6, 0), new THREE.Vector3(3.7, -2.6, 0), new THREE.Vector3(-1, -2.6, 0), new THREE.Vector3(-2.9, -1.15, 0),
    ], true),
    [],
  );
  useFrame((state) => {
    if (!group.current) return;
    const speed = 0.08 + current * 2.5;
    group.current.children.forEach((child, index) => {
      const t = active ? (state.clock.elapsedTime * speed + index / 18) % 1 : index / 18;
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

function Recombination({ rate, active }: { rate: number; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current || !active) return;
    const cycleSpeed = 0.45 + rate / 85;
    for (let i = 0; i < group.current.children.length; i += 2) {
      const phase = (state.clock.elapsedTime * cycleSpeed + i * 0.13) % 1;
      const pair = i / 2;
      const x = -4.25 + (pair % 4) * 0.85;
      const z = -0.65 + Math.floor(pair / 4) * 1.25;
      const separation = (1 - phase) * 0.34;
      const scale = phase > 0.82 ? (1 - phase) / 0.18 : 1;
      group.current.children[i].position.set(x - separation, 0.48, z);
      group.current.children[i + 1].position.set(x + separation, 0.48, z);
      group.current.children[i].scale.setScalar(scale);
      group.current.children[i + 1].scale.setScalar(scale);
    }
  });
  return (
    <group ref={group}>
      {Array.from({ length: 8 }, (_, index) => (
        <group key={index}>
          <mesh><sphereGeometry args={[0.085, 10, 10]} /><meshBasicMaterial color={PALETTE.electron} /></mesh>
          <mesh><torusGeometry args={[0.085, 0.025, 8, 12]} /><meshBasicMaterial color={PALETTE.hole} /></mesh>
        </group>
      )).flatMap((pair) => pair.props.children)}
    </group>
  );
}

function LoadObject({ load, active }: { load: LoadKind; active: boolean }) {
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

function Scene({ exploded, irradiance, reading, load, running }: { exploded: boolean; irradiance: number; reading: ReturnType<typeof calculateSolarReading>; load: LoadKind; running: boolean }) {
  const gap = exploded ? 0.62 : 0.21;
  const flowing = running && reading.current > 0.002;
  return (
    <>
      <color attach="background" args={["#e9eef2"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[-6, 10, 8]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Environment><Lightformer intensity={1.7} position={[0, 7, 2]} scale={[12, 6, 1]} /><Lightformer intensity={0.8} position={[7, 1, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} /></Environment>
      <UploadedPanel exploded={exploded} />
      <group position-y={-0.8}>
        <Layer y={gap * 3} color={PALETTE.contact} width={4.4} depth={2.55} opacity={0.35} />
        <Layer y={gap * 2} color={PALETTE.perovskite} width={4.25} depth={2.45} opacity={0.9} />
        <Layer y={gap} color={PALETTE.contact} width={4.25} depth={2.45} opacity={0.45} />
        <Layer y={0} color={PALETTE.silicon} width={4.25} depth={2.45} />
        <Layer y={-gap} color={PALETTE.contact} width={4.4} depth={2.55} />
      </group>
      <Photons active={running && irradiance > 80} />
      <CarrierFlow current={reading.current} active={flowing} />
      <Recombination rate={reading.recombination} active={running && irradiance > 80} />
      <LoadObject load={load} active={flowing} />
      <OrbitControls makeDefault enablePan={false} minDistance={8} maxDistance={18} minPolarAngle={0.45} maxPolarAngle={1.45} target={[0, 0, 0]} />
    </>
  );
}

export function SolarSimulation() {
  const [irradiance, setIrradiance] = useState(820);
  const [temperature, setTemperature] = useState(32);
  const [load, setLoad] = useState<LoadKind>("led");
  const [exploded, setExploded] = useState(true);
  const [running, setRunning] = useState(true);
  const reading = useMemo(() => calculateSolarReading(irradiance, temperature, load), [irradiance, temperature, load]);

  return (
    <main className="sim-shell">
      <header className="sim-header">
        <div><p className="eyebrow">TANDEM CELL LAB</p><h1>Silicon × Perovskite</h1></div>
        <div className="header-actions">
          <Button variant="outline" size="sm" onClick={() => setExploded((value) => !value)}><RotateCcw />{exploded ? "Assemble" : "Explode layers"}</Button>
          <Button size="icon" aria-label={running ? "Pause simulation" : "Play simulation"} title={running ? "Pause simulation" : "Play simulation"} onClick={() => setRunning((value) => !value)}>{running ? <Pause /> : <Play />}</Button>
        </div>
      </header>

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
        </aside>

        <div className="viewport-wrap">
          <Canvas shadows dpr={[1, 1.5]} camera={{ position: [8.8, 7.2, 10.5], fov: 43 }} gl={{ antialias: true }}>
            <Scene exploded={exploded} irradiance={irradiance} reading={reading} load={load} running={running} />
          </Canvas>
          <div className="legend" aria-label="Particle legend"><span><i className="dot electron" />Electron</span><span><i className="dot hole" />Hole</span><span><i className="dot photon" />Photon</span></div>
          <p className="orbit-note">Drag to orbit · scroll to zoom</p>
        </div>
      </section>

      <section className="measurement-strip">
        <div className="metric"><span>VOLTAGE</span><strong>{reading.voltage.toFixed(2)} <small>V</small></strong></div>
        <div className="metric"><span>CURRENT</span><strong>{(reading.current * 1000).toFixed(0)} <small>mA</small></strong></div>
        <div className="metric"><span>POWER</span><strong>{(reading.power * 1000).toFixed(0)} <small>mW</small></strong></div>
        <div className="metric"><span>EFFICIENCY</span><strong>{(reading.efficiency * 100).toFixed(1)} <small>%</small></strong></div>
        <div className="metric recombination"><span>RECOMBINATION</span><strong>{reading.recombination.toFixed(0)} <small>% relative</small></strong><div className="meter"><i style={{ width: `${reading.recombination}%` }} /></div></div>
      </section>
      <footer className="sim-footer"><span>Illustrative two-terminal tandem model</span><span>Blue carriers move opposite conventional current</span></footer>
    </main>
  );
}