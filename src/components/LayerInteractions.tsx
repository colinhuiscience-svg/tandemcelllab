import { useFrame } from "@react-three/fiber";
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
  const electrons = useRef<THREE.InstancedMesh>(null);
  const holes = useRef<THREE.InstancedMesh>(null);
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
    return new THREE.Vector3(x, THREE.MathUtils.lerp(yOf(a), yOf(b), mix) + 0.065, THREE.MathUtils.lerp(zOf(a, z), zOf(b, z), mix));
  };
  useFrame((_, rawDelta) => {
    if (!photons.current || !electrons.current || !holes.current || !impacts.current) return;
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
      dummy.position.set(x, y, zOf(packet.destination, z) * travel + z * (1 - travel));
      dummy.scale.setScalar(lit && phase < 0.55 ? 1 : 0);
      dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      photons.current?.setMatrixAt(i, dummy.matrix);
      photons.current?.setColorAt(i, new THREE.Color(packet.band === "infrared" || packet.band === "subgap" ? colors.silicon : colors.photon));
      const generated = packet.destination === "silicon" || packet.destination === "perovskite";
      const t = Math.max(0, (phase - 0.55) / 0.45);
      // Some pairs meet in the absorber; extracted carriers follow selective contacts.
      const lost = (i % 5) / 5 < recombination * 0.65;
      [electrons.current, holes.current].forEach((mesh, kind) => {
        const route = kind === 0 ? packet.electron : packet.hole;
        const point = lost ? new THREE.Vector3(x + (kind === 0 ? -1 : 1) * 0.25 * (1 - t), end, zOf(packet.destination, z)) : routePoint(route, t, x + (kind === 0 ? -0.12 : 0.12), z);
        dummy.position.copy(point);
        dummy.scale.setScalar(lit && generated && phase >= 0.55 ? Math.max(0, lost ? 1 - t : t > 0.88 ? (1 - t) / 0.12 : 1) : 0);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      dummy.position.set(x, end + 0.04, zOf(packet.destination, z));
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      const pulse = (phase - 0.5) / 0.1;
      dummy.scale.setScalar(lit && generated && pulse > 0 && pulse < 1 ? pulse * 2 : 0);
      dummy.updateMatrix(); impacts.current?.setMatrixAt(i, dummy.matrix);
    });
    [photons.current, electrons.current, holes.current, impacts.current].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    if (photons.current.instanceColor) photons.current.instanceColor.needsUpdate = true;
  });
  return <group name="coupled-layer-interactions" userData={{ schematic: true, current }}>
    <instancedMesh ref={photons} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={10}><sphereGeometry args={[0.075, 10, 8]} /><meshBasicMaterial color={colors.photon} depthTest={false} /></instancedMesh>
    <instancedMesh ref={electrons} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color={colors.electron} depthTest={false} /></instancedMesh>
    <instancedMesh ref={holes} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={11}><torusGeometry args={[0.08, 0.023, 6, 10]} /><meshBasicMaterial color={colors.hole} depthTest={false} /></instancedMesh>
    <instancedMesh ref={impacts} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={9}><ringGeometry args={[0.1, 0.14, 16]} /><meshBasicMaterial color={colors.photon} side={THREE.DoubleSide} depthTest={false} /></instancedMesh>
  </group>;
}