"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type WalkerProps = {
  laneZ: number;
  startX: number;
  speed: number;
  shirt: string;
  skin: string;
  direction?: 1 | -1;
  scale?: number;
  phase?: number;
};

function Walker({
  laneZ,
  startX,
  speed,
  shirt,
  skin,
  direction = 1,
  scale = 1,
  phase = 0,
}: WalkerProps) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const rootNode = root.current;
    if (!rootNode) return;

    const span = 19;
    const raw = (t * speed + startX + span) % span;
    const x = direction === 1 ? raw - span / 2 : span / 2 - raw;
    rootNode.position.x = x;
    rootNode.position.y = 0.04 + Math.abs(Math.sin(t * 5.8 + phase)) * 0.035;
    rootNode.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;

    const swing = Math.sin(t * 5.8 + phase) * 0.72;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.72;
    if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.72;
  });

  return (
    <group ref={root} position={[startX, 0, laneZ]} scale={scale}>
      <group position={[0, 1.22, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.16, -0.03]} castShadow>
          <sphereGeometry args={[0.225, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#16243d" roughness={0.72} />
        </mesh>
      </group>

      <mesh position={[0, 0.77, 0]} castShadow>
        <boxGeometry args={[0.42, 0.62, 0.26]} />
        <meshStandardMaterial color={shirt} roughness={0.78} />
      </mesh>

      <mesh position={[0, 0.82, -0.23]} castShadow>
        <boxGeometry args={[0.38, 0.5, 0.18]} />
        <meshStandardMaterial color="#f97316" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, -0.33]} castShadow>
        <boxGeometry args={[0.28, 0.08, 0.06]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>

      <group ref={leftArm} position={[-0.28, 0.91, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.42, 6, 10]} />
          <meshStandardMaterial color={skin} roughness={0.84} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.28, 0.91, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.42, 6, 10]} />
          <meshStandardMaterial color={skin} roughness={0.84} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.13, 0.48, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.48, 6, 10]} />
          <meshStandardMaterial color="#14233b" roughness={0.9} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.13, 0.48, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.48, 6, 10]} />
          <meshStandardMaterial color="#14233b" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

type CarProps = {
  laneZ: number;
  startX: number;
  speed: number;
  color: string;
  direction?: 1 | -1;
  scale?: number;
};

function Car({ laneZ, startX, speed, color, direction = 1, scale = 1 }: CarProps) {
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const rootNode = root.current;
    if (!rootNode) return;

    const span = 22;
    const raw = (t * speed + startX + span) % span;
    const x = direction === 1 ? raw - span / 2 : span / 2 - raw;
    rootNode.position.x = x;
    rootNode.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;

    wheels.current.forEach((wheel) => {
      if (wheel) wheel.rotation.z -= 0.09 * speed;
    });
  });

  const setWheel = (index: number) => (node: THREE.Mesh | null) => {
    if (node) wheels.current[index] = node;
  };

  return (
    <group ref={root} position={[startX, 0, laneZ]} scale={scale}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <boxGeometry args={[0.95, 0.32, 1.65]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.64, -0.08]} castShadow>
        <boxGeometry args={[0.78, 0.32, 0.82]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.67, 0.38]}>
        <boxGeometry args={[0.67, 0.22, 0.03]} />
        <meshStandardMaterial color="#bfe9ff" roughness={0.22} metalness={0.06} />
      </mesh>

      <mesh position={[0, 0.66, -0.62]} castShadow>
        <boxGeometry args={[0.48, 0.34, 0.16]} />
        <meshStandardMaterial color="#f97316" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.72, -0.72]}>
        <boxGeometry args={[0.34, 0.07, 0.03]} />
        <meshStandardMaterial color="#fb923c" />
      </mesh>

      {[
        [-0.52, 0.21, 0.5],
        [0.52, 0.21, 0.5],
        [-0.52, 0.21, -0.5],
        [0.52, 0.21, -0.5],
      ].map((p, i) => (
        <mesh
          key={i}
          ref={setWheel(i)}
          position={p as [number, number, number]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Building({
  x,
  z,
  w,
  h,
  d,
  color,
}: {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
}) {
  const windowRows = Math.max(2, Math.floor(h / 0.7));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {Array.from({ length: windowRows }).map((_, row) =>
        [-0.24, 0.24].map((offset, col) => (
          <mesh key={row + "-" + col} position={[offset * w, 0.55 + row * 0.58, d / 2 + 0.006]}>
            <planeGeometry args={[w * 0.18, 0.25]} />
            <meshStandardMaterial color="#bfe9ff" emissive="#7dd3fc" emissiveIntensity={0.08} />
          </mesh>
        ))
      )}
    </group>
  );
}

function CityWorld() {
  const buildings = useMemo(
    () => [
      [-7.2, -4.2, 1.7, 4.4, 1.9, "#3f7da8"],
      [-5.1, -4.35, 1.3, 3.4, 1.5, "#6ea3c9"],
      [-3.2, -4.1, 1.7, 5.1, 1.8, "#2f6d9a"],
      [-1.0, -4.35, 1.45, 3.8, 1.55, "#78afd2"],
      [1.1, -4.15, 1.9, 4.8, 1.8, "#39759f"],
      [3.45, -4.35, 1.3, 3.5, 1.55, "#75a9c8"],
      [5.45, -4.18, 1.8, 5.25, 1.85, "#2f6d9a"],
      [7.55, -4.35, 1.55, 4.0, 1.6, "#5e9bc3"],
    ] as const,
    []
  );

  return (
    <>
      <color attach="background" args={["#9bdef9"]} />
      <fog attach="fog" args={["#bfeeff", 15, 33]} />

      <PerspectiveCamera makeDefault position={[9.8, 5.4, 11.8]} fov={39} rotation={[-0.28, 0.66, 0.18]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight intensity={1.05} color="#dff6ff" groundColor="#8aa0b7" />
      <directionalLight
        castShadow
        position={[5, 9, 7]}
        intensity={2.2}
        color="#fff0cf"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh position={[0, -0.04, 0]} receiveShadow>
        <boxGeometry args={[22, 0.08, 12]} />
        <meshStandardMaterial color="#dfeaf0" roughness={0.94} />
      </mesh>

      <mesh position={[0, 0.01, 0.55]} receiveShadow>
        <boxGeometry args={[22, 0.03, 3.45]} />
        <meshStandardMaterial color="#334155" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.03, -1.23]} receiveShadow>
        <boxGeometry args={[22, 0.025, 0.18]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0, 0.03, 2.32]} receiveShadow>
        <boxGeometry args={[22, 0.025, 0.18]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 0.045, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.15, 0.08]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}

      <mesh position={[0, 0.035, -2.05]} receiveShadow>
        <boxGeometry args={[22, 0.04, 1.45]} />
        <meshStandardMaterial color="#d9e9ef" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.035, 3.4]} receiveShadow>
        <boxGeometry args={[22, 0.04, 1.35]} />
        <meshStandardMaterial color="#d9e9ef" roughness={0.96} />
      </mesh>

      {buildings.map(([x, z, w, h, d, color], i) => (
        <Building key={i} x={x} z={z} w={w} h={h} d={d} color={color} />
      ))}

      {[-7, -4.7, -2.4, 0, 2.5, 5, 7.2].map((x, i) => (
        <group key={x} position={[x, 0, -2.78]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.9, 10]} />
            <meshStandardMaterial color="#73553c" />
          </mesh>
          <mesh position={[0, 1.03, 0]} castShadow>
            <sphereGeometry args={[0.43 + (i % 2) * 0.05, 14, 10]} />
            <meshStandardMaterial color={i % 2 ? "#2ea667" : "#38b878"} roughness={0.88} />
          </mesh>
        </group>
      ))}

      {[
        { laneZ: -2.05, startX: 0.4, speed: 0.72, shirt: "#38bdf8", skin: "#75462e", direction: 1 as const, scale: 1.0, phase: 0.1 },
        { laneZ: -2.2, startX: 5.8, speed: 0.56, shirt: "#a78bfa", skin: "#9a6545", direction: -1 as const, scale: 0.92, phase: 0.8 },
        { laneZ: -1.86, startX: 10.8, speed: 0.64, shirt: "#f472b6", skin: "#ca8c64", direction: 1 as const, scale: 0.95, phase: 1.5 },
        { laneZ: 3.37, startX: 2.4, speed: 0.51, shirt: "#22c55e", skin: "#5a3825", direction: -1 as const, scale: 0.88, phase: 2.0 },
        { laneZ: 3.5, startX: 7.2, speed: 0.66, shirt: "#facc15", skin: "#a56f4b", direction: 1 as const, scale: 0.93, phase: 2.7 },
        { laneZ: 3.25, startX: 12.5, speed: 0.58, shirt: "#fb7185", skin: "#72472f", direction: -1 as const, scale: 0.9, phase: 3.2 },
        { laneZ: -2.05, startX: 15.1, speed: 0.49, shirt: "#60a5fa", skin: "#d29b74", direction: -1 as const, scale: 0.86, phase: 3.8 },
        { laneZ: 3.42, startX: 17.4, speed: 0.74, shirt: "#34d399", skin: "#815238", direction: 1 as const, scale: 0.84, phase: 4.4 },
      ].map((p, i) => (
        <Walker key={i} {...p} />
      ))}

      {[
        { laneZ: -0.05, startX: 1.0, speed: 1.45, color: "#ef4444", direction: 1 as const, scale: 1.0 },
        { laneZ: 1.15, startX: 7.2, speed: 1.2, color: "#3b82f6", direction: -1 as const, scale: 0.92 },
        { laneZ: -0.12, startX: 12.0, speed: 1.04, color: "#f59e0b", direction: 1 as const, scale: 0.88 },
        { laneZ: 1.25, startX: 16.5, speed: 1.35, color: "#8b5cf6", direction: -1 as const, scale: 0.84 },
        { laneZ: -0.08, startX: 19.4, speed: 1.16, color: "#14b8a6", direction: 1 as const, scale: 0.82 },
      ].map((p, i) => (
        <Car key={i} {...p} />
      ))}

      <ContactShadows position={[0, 0.02, 0]} opacity={0.32} scale={18} blur={2.4} far={6} />
    </>
  );
}

export default function UrbanCarrier3DCity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "relative aspect-[16/10] w-full overflow-hidden rounded-[1.6rem]" : "relative aspect-[16/10] w-full overflow-hidden rounded-[2rem]"}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
        <CityWorld />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#061a33]/28 to-transparent" />
    </div>
  );
}
