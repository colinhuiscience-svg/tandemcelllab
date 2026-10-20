import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CONTACT_GRID, collectionPoint } from "@/lib/solar-pathways";

export function ContactGrid({
  y,
  z,
  running,
  current,
  colors,
}: {
  y: number;
  z: number;
  running: boolean;
  current: number;
  colors: { contact: string; electron: string };
}) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const pulses = useRef<THREE.InstancedMesh>(null);
  const time = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, delta) => {
    if (!particles.current || !pulses.current) return;
    if (running && current > 0) time.current += Math.min(delta, 0.05) * (0.12 + current * 1.4);
    for (let i = 0; i < 24; i++) {
      const [x, localZ] = collectionPoint(i % 12, i < 12 ? -1.2 : 1.2, (time.current + i / 24) % 1);
      dummy.position.set(x, 0.07, localZ);
      dummy.scale.setScalar(running && current > 0 ? 1 : 0);
      dummy.updateMatrix();
      particles.current.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < 12; i++) {
      const progress = (time.current * 0.75 + i / 12) % 1;
      const [x, localZ] = collectionPoint(i, i % 2 === 0 ? -1.2 : 1.2, progress);
      dummy.position.set(x, 0.085, localZ);
      const pulseSize =
        running && current > 0 ? 0.65 + 0.35 * Math.sin(progress * Math.PI * 2 + i) ** 2 : 0;
      dummy.scale.setScalar(pulseSize);
      dummy.updateMatrix();
      pulses.current.setMatrixAt(i, dummy.matrix);
    }
    particles.current.instanceMatrix.needsUpdate = true;
    pulses.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[-2.9, y, z]} name="front-collection-grid" userData={{ schematic: true }}>
      {CONTACT_GRID.fingerXs.map((x) => (
        <mesh key={x} position={[x, 0, 0]} renderOrder={12}>
          <boxGeometry args={[0.035, 0.018, 2.5]} />
          <meshStandardMaterial
            color={colors.contact}
            emissive={colors.contact}
            emissiveIntensity={0.12}
            metalness={0.85}
            roughness={0.22}
            transparent
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
      {CONTACT_GRID.busbarZs.map((busZ) => (
        <mesh key={busZ} position={[0.04, 0.025, busZ]} renderOrder={12}>
          <boxGeometry args={[4.32, 0.025, 0.09]} />
          <meshStandardMaterial
            color={colors.contact}
            emissive={colors.contact}
            emissiveIntensity={0.18}
            metalness={0.88}
            roughness={0.2}
            transparent
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
      <mesh position={[2.2, 0.025, 0]} renderOrder={12}>
        <boxGeometry args={[0.09, 0.025, 1.49]} />
        <meshStandardMaterial
          color={colors.contact}
          emissive={colors.contact}
          emissiveIntensity={0.2}
          metalness={0.88}
          roughness={0.2}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <instancedMesh
        ref={particles}
        args={[undefined, undefined, 24]}
        frustumCulled={false}
        renderOrder={13}
      >
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshBasicMaterial
          color={colors.electron}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={pulses}
        args={[undefined, undefined, 12]}
        frustumCulled={false}
        renderOrder={14}
      >
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshBasicMaterial
          color={colors.electron}
          transparent
          opacity={0.4}
          depthWrite={false}
          depthTest={false}
        />
      </instancedMesh>
      <Html position={[-1.2, 0.14, -1.25]} center className="pointer-events-none">
        <span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">
          Metal fingers
        </span>
      </Html>
      <Html position={[2.2, 0.16, 0.8]} center className="pointer-events-none">
        <span className="bg-background/90 px-1 text-[10px] text-foreground whitespace-nowrap">
          Busbars → wire
        </span>
      </Html>
    </group>
  );
}
