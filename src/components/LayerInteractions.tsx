import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { layerHeight, type SolarLayer } from "@/lib/solar-layers";
import { carrierRoute, photonDestination, type PhotonBand } from "@/lib/solar-pathways";

type Props = { layers: SolarLayer[]; exploded: boolean; selected: string | null; running: boolean; irradiance: number; current: number; recombination: number; colors: { photon: string; silicon: string; electron: string; hole: string } };
const COUNT = 16;
const BANDS: PhotonBand[] = ["visible", "infrared", "visible", "infrared", "subgap", "visible", "infrared", "reflected"];

/** Qualitative event paths; timings and packet counts are not a spectral solver. */
export function LayerInteractions({ layers, exploded, selected, running, irradiance, current, recombination, colors }: Props) {
  const photons = useRef<THREE.InstancedMesh>(null);
  const halos = useRef<THREE.InstancedMesh>(null);
  const electrons = useRef<THREE.InstancedMesh>(null);
  const electronArrows = useRef<THREE.InstancedMesh>(null);
  const holes = useRef<THREE.InstancedMesh>(null);
  const holeArrows = useRef<THREE.InstancedMesh>(null);
  const impacts = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const packets = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const band = BANDS[i % BANDS.length] ?? "visible";
    const destination = photonDestination(layers, band);
    return { band, destination, electron: carrierRoute(layers, destination, false), hole: carrierRoute(layers, destination, true) };
  }), [layers]);
  const indexOf = (id: string) => Math.max(0, layers.findIndex((layer) => layer.id === id));
  const yOf = (id: string) => layerHeight(indexOf(id), layers.length, exploded);
  const zOf = (id: string, z: number) => z + (selected === id ? 1.1 : 0);
  const routePoint = (route: string[], t: number, x: number, z: number) => {
    const location = Math.min(route.length - 1, Math.max(0, t) * Math.max(0, route.length - 1));
    const a = route[Math.floor(location)] ?? "silicon";
    const b = route[Math.min(route.length - 1, Math.floor(location) + 1)] ?? a;
    const mix = location % 1;
    return new THREE.Vector3(x, THREE.MathUtils.lerp(yOf(a), yOf(b), mix) + 0.11, THREE.MathUtils.lerp(zOf(a, z), zOf(b, z), mix));
  };
  useFrame((_, rawDelta) => {
    if (!photons.current || !electrons.current || !holes.current || !impacts.current || !halos.current || !electronArrows.current || !holeArrows.current) return;
    if (running) time.current += Math.min(rawDelta, 0.05) * Math.max(0.15, irradiance / 1000) * 0.23;
    const lit = irradiance > 0;
    packets.forEach((packet, i) => {
      const phase = (time.current + i / COUNT) % 1;
      const x = -4.45 + (i % 4) * 0.95;
      const z = -0.85 + Math.floor(i / 4) * 0.55;
      const top = yOf("glass") + 1.8;
      const end = yOf(packet.destination) + 0.07;
      const travel = Math.min(1, phase / 0.55);
      const y = packet.band === "reflected" && travel > 0.5 ? yOf("glass") + (travel - 0.5) * 3.6 : THREE.MathUtils.lerp(top, end, travel);
      const photonVisible = lit && phase < 0.55;
      // All photon packets share one warm sunlight colour; sub-gap packets are dimmer to show they carry less usable energy.
      const dim = packet.band === "subgap" ? 0.45 : 1;
      dummy.position.set(x, y, zOf(packet.destination, z) * travel + z * (1 - travel));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(photonVisible ? dim : 0);
      dummy.updateMatrix();
      photons.current?.setMatrixAt(i, dummy.matrix);
      dummy.scale.setScalar(photonVisible ? dim * 2.1 : 0);
      dummy.updateMatrix();
      halos.current?.setMatrixAt(i, dummy.matrix);
      const generated = packet.destination === "silicon" || packet.destination === "perovskite";
      // Hold the newly generated pair apart in the absorber before showing extraction.
      const t = Math.max(0, (phase - 0.7) / 0.3);
      // Some pairs meet in the absorber; extracted carriers follow selective contacts.
      const lost = ((i * 7 + 3) % 17) / 17 < recombination * 0.45;
      [electrons.current, holes.current].forEach((mesh, kind) => {
        if (!mesh) return;
        const route = kind === 0 ? packet.electron : packet.hole;
        const point = lost ? new THREE.Vector3(x + (kind === 0 ? -1 : 1) * 0.3 * (1 - t), end + 0.12, zOf(packet.destination, z)) : routePoint(route, t, x + (kind === 0 ? -0.3 : 0.3), z);
        const size = lit && generated && phase >= 0.55 ? Math.max(0, lost ? 1 - t : t > 0.88 ? (1 - t) / 0.12 : 1) : 0;
        dummy.position.copy(point);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        // Direction arrowheads: electrons drift up toward the front contact, holes down toward the rear.
        const arrow = kind === 0 ? electronArrows.current : holeArrows.current;
        if (arrow) {
          dummy.position.copy(point).add(new THREE.Vector3(0, (kind === 0 ? 1 : -1) * 0.22 * size, 0));
          dummy.rotation.set(kind === 0 ? 0 : Math.PI, 0, 0);
          dummy.scale.setScalar(size);
          dummy.updateMatrix();
          arrow.setMatrixAt(i, dummy.matrix);
        }
      });
      dummy.position.set(x, end + 0.04, zOf(packet.destination, z));
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      const pulse = (phase - 0.55) / 0.15;
      dummy.scale.setScalar(lit && generated && pulse > 0 && pulse < 1 ? pulse * 2.6 : 0);
      dummy.updateMatrix(); impacts.current?.setMatrixAt(i, dummy.matrix);
    });
    [photons.current, halos.current, electrons.current, electronArrows.current, holes.current, holeArrows.current, impacts.current].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  });
  return <group name="coupled-layer-interactions" userData={{ schematic: true, current }}>
    <Html position={[-5.1, yOf("silicon") + 0.18, zOf("silicon", 0)]} center className="pointer-events-none"><span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">Silicon · e⁻ + h⁺ generation</span></Html>
    {layers.some((layer) => layer.id === "perovskite") && <Html position={[-5.1, yOf("perovskite") + 0.18, zOf("perovskite", 0)]} center className="pointer-events-none"><span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">Perovskite · e⁻ + h⁺ generation</span></Html>}
    <instancedMesh ref={halos} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={9}><sphereGeometry args={[0.15, 12, 10]} /><meshBasicMaterial color={colors.photon} transparent opacity={0.22} depthTest={false} /></instancedMesh>
    <instancedMesh ref={photons} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={10}><sphereGeometry args={[0.15, 12, 10]} /><meshBasicMaterial color={colors.photon} depthTest={false} /></instancedMesh>
    <instancedMesh ref={electrons} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color={colors.electron} depthTest={false} /></instancedMesh>
    <instancedMesh ref={electronArrows} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><coneGeometry args={[0.09, 0.2, 8]} /><meshBasicMaterial color={colors.electron} depthTest={false} /></instancedMesh>
    <instancedMesh ref={holes} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><torusGeometry args={[0.13, 0.045, 8, 12]} /><meshBasicMaterial color={colors.hole} depthTest={false} /></instancedMesh>
    <instancedMesh ref={holeArrows} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><coneGeometry args={[0.09, 0.2, 8]} /><meshBasicMaterial color={colors.hole} depthTest={false} /></instancedMesh>
    <instancedMesh ref={impacts} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={9}><ringGeometry args={[0.14, 0.2, 16]} /><meshBasicMaterial color={colors.photon} side={THREE.DoubleSide} depthTest={false} /></instancedMesh>
  </group>;
}
