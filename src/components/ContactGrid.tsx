import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CONTACT_GRID, collectionPoint } from "@/lib/solar-pathways";

export function ContactGrid({ y, z, running, current, colors }: { y: number; z: number; running: boolean; current: number; colors: { contact: string; electron: string } }) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, delta) => {
    if (!particles.current) return;
    if (running && current > 0) time.current += Math.min(delta, 0.05) * (0.12 + current * 1.4);
    for (let i = 0; i < 24; i++) {
      const [x, localZ] = collectionPoint(i % 12, i < 12 ? -1.2 : 1.2, (time.current + i / 24) % 1);
      dummy.position.set(x, 0.07, localZ);
      dummy.scale.setScalar(current > 0 ? 1 : 0);
      dummy.updateMatrix();
      particles.current.setMatrixAt(i, dummy.matrix);
    }
    particles.current.instanceMatrix.needsUpdate = true;
  });
  return <group position={[-2.9, y, z]} name="front-collection-grid" userData={{ schematic: true }}>
    {CONTACT_GRID.fingerXs.map((x) => <mesh key={x} position={[x, 0, 0]} renderOrder={12}><boxGeometry args={[0.035, 0.018, 2.5]} /><meshStandardMaterial color={colors.contact} metalness={0.8} roughness={0.25} depthTest={false} /></mesh>)}
    {CONTACT_GRID.busbarZs.map((busZ) => <mesh key={busZ} position={[0.04, 0.025, busZ]} renderOrder={12}><boxGeometry args={[4.32, 0.025, 0.09]} /><meshStandardMaterial color={colors.contact} metalness={0.8} roughness={0.25} depthTest={false} /></mesh>)}
    <mesh position={[2.2, 0.025, 0]} renderOrder={12}><boxGeometry args={[0.09, 0.025, 1.49]} /><meshStandardMaterial color={colors.contact} metalness={0.8} roughness={0.25} depthTest={false} /></mesh>
    <instancedMesh ref={particles} args={[undefined, undefined, 24]} frustumCulled={false} renderOrder={13}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color={colors.electron} depthTest={false} /></instancedMesh>
    <Html position={[-1.2, 0.14, -1.25]} center className="pointer-events-none"><span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">Metal fingers</span></Html>
    <Html position={[2.2, 0.16, 0.8]} center className="pointer-events-none"><span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">Busbars → wire</span></Html>
  </group>;
}