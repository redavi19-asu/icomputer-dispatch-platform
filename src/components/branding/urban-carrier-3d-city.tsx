"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const BASE_PATH = process.env.NODE_ENV === "production" ? "/icomputer-dispatch-platform" : "";
const modelUrl = (path: string) => `${BASE_PATH}/models/urban-carrier/${path}`;

type WalkerProps = {
  src: string;
  laneZ: number;
  startX: number;
  speed: number;
  direction?: 1 | -1;
  scale?: number;
  phase?: number;
};

function WalkerModel({
  src,
  laneZ,
  startX,
  speed,
  direction = 1,
  scale = 1.45,
  phase = 0,
}: WalkerProps) {
  const root = useRef<THREE.Group>(null);
  const gltf = useGLTF(src) as unknown as { scene: THREE.Group; animations: THREE.AnimationClip[] };
  const model = useMemo(() => {
    const cloned = cloneSkeleton(gltf.scene) as THREE.Group;
    cloned.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, model);

  useEffect(() => {
    const walk = actions.walk;
    if (!walk) return;
    walk.reset().setEffectiveWeight(1).setEffectiveTimeScale(0.92 + speed * 0.28).fadeIn(0.18).play();
    return () => {
      walk.fadeOut(0.12);
      walk.stop();
    };
  }, [actions, speed]);

  useFrame(({ clock }) => {
    const node = root.current;
    if (!node) return;
    const t = clock.getElapsedTime();
    const span = 21;
    const raw = (t * speed + startX + span) % span;
    node.position.x = direction === 1 ? raw - span / 2 : span / 2 - raw;
    node.position.y = Math.sin(t * 4.6 + phase) * 0.006;
    node.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;
  });

  return (
    <group ref={root} position={[startX, 0, laneZ]} scale={scale}>
      <primitive object={model} />
      <group position={[0, 0.48, -0.24]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.38, 0.18]} />
          <meshStandardMaterial color="#f97316" roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.09, -0.105]} castShadow>
          <boxGeometry args={[0.22, 0.07, 0.035]} />
          <meshStandardMaterial color="#fb923c" roughness={0.58} />
        </mesh>
        <mesh position={[0, -0.08, -0.105]} castShadow>
          <boxGeometry args={[0.24, 0.035, 0.035]} />
          <meshStandardMaterial color="#c2410c" roughness={0.72} />
        </mesh>
      </group>
    </group>
  );
}

type VehicleProps = {
  src: string;
  laneZ: number;
  startX: number;
  speed: number;
  rearZ: number;
  direction?: 1 | -1;
  scale?: number;
};

function VehicleModel({
  src,
  laneZ,
  startX,
  speed,
  rearZ,
  direction = 1,
  scale = 0.82,
}: VehicleProps) {
  const root = useRef<THREE.Group>(null);
  const gltf = useGLTF(src) as unknown as { scene: THREE.Group };
  const model = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);

  useFrame(({ clock }) => {
    const node = root.current;
    if (!node) return;
    const span = 24;
    const t = clock.getElapsedTime();
    const raw = (t * speed + startX + span) % span;
    node.position.x = direction === 1 ? raw - span / 2 : span / 2 - raw;
    node.rotation.y = direction === 1 ? Math.PI / 2 : -Math.PI / 2;
  });

  return (
    <group ref={root} position={[startX, 0, laneZ]} scale={scale}>
      <primitive object={model} />
      <group position={[0, 0.72, rearZ]}>
        <mesh castShadow>
          <boxGeometry args={[0.48, 0.36, 0.17]} />
          <meshStandardMaterial color="#f97316" roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.09, -0.105]}>
          <boxGeometry args={[0.3, 0.07, 0.04]} />
          <meshStandardMaterial color="#fb923c" />
        </mesh>
      </group>
    </group>
  );
}

function BuildingModel({
  src,
  position,
  scale,
}: {
  src: string;
  position: [number, number, number];
  scale: number;
}) {
  const gltf = useGLTF(src) as unknown as { scene: THREE.Group };
  const model = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);

  return <primitive object={model} position={position} scale={scale} />;
}

function TreeModel({
  position,
  scale = 1.7,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const gltf = useGLTF(modelUrl("city/tree-large.glb")) as unknown as { scene: THREE.Group };
  const model = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    return cloned;
  }, [gltf.scene]);

  return <primitive object={model} position={position} scale={scale} />;
}

function CameraRig({ compact = false }: { compact?: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (compact) {
      camera.position.set(5.45, 3.55, 6.25);
      camera.lookAt(0.55, 0.92, -0.35);
    } else {
      camera.position.set(6.35, 4.05, 7.35);
      camera.lookAt(0.25, 0.95, -0.5);
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = compact ? 31 : 34;
    }

    camera.updateProjectionMatrix();
  }, [camera, compact]);

  return null;
}

function BackgroundSkyline() {
  const blocks = [
    [-8.2, 3.8, 1.9, "#4a86ad"],
    [-6.2, 5.3, 1.7, "#2e6e9c"],
    [-4.25, 4.45, 2.0, "#679ec2"],
    [-2.0, 6.0, 1.85, "#2b6691"],
    [0.15, 4.7, 1.8, "#5d95ba"],
    [2.25, 5.65, 1.75, "#316f9b"],
    [4.35, 4.25, 1.85, "#6ba2c5"],
    [6.4, 5.35, 1.75, "#3b7ca7"],
    [8.35, 4.5, 1.8, "#5a95bc"],
  ] as const;

  return (
    <group position={[0, 0, -6.1]}>
      {blocks.map(([x, h, w, color], i) => (
        <mesh key={i} position={[x, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 1.5]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function CityWorld({ compact = false }: { compact?: boolean }) {
  const people = [
    { src: "people/character-female-a.glb", laneZ: -1.95, startX: 0.3, speed: 0.75, direction: 1 as const, scale: 1.5, phase: 0.2 },
    { src: "people/character-female-b.glb", laneZ: -2.15, startX: 5.3, speed: 0.61, direction: -1 as const, scale: 1.42, phase: 1.0 },
    { src: "people/character-male-a.glb", laneZ: -1.82, startX: 10.2, speed: 0.69, direction: 1 as const, scale: 1.48, phase: 1.8 },
    { src: "people/character-male-e.glb", laneZ: 3.08, startX: 2.1, speed: 0.57, direction: -1 as const, scale: 1.4, phase: 2.5 },
    { src: "people/character-female-b.glb", laneZ: 3.24, startX: 7.0, speed: 0.72, direction: 1 as const, scale: 1.46, phase: 3.1 },
    { src: "people/character-female-a.glb", laneZ: 2.96, startX: 12.5, speed: 0.54, direction: -1 as const, scale: 1.38, phase: 3.8 },
    { src: "people/character-male-e.glb", laneZ: -2.04, startX: 15.2, speed: 0.63, direction: -1 as const, scale: 1.44, phase: 4.4 },
    { src: "people/character-male-a.glb", laneZ: 3.13, startX: 18.3, speed: 0.77, direction: 1 as const, scale: 1.36, phase: 5.0 },
  ];

  const cars = [
    { src: "cars/delivery.glb", laneZ: 0.03, startX: 1.0, speed: 1.45, rearZ: -1.67, direction: 1 as const, scale: 0.72 },
    { src: "cars/sedan.glb", laneZ: 1.25, startX: 6.3, speed: 1.2, rearZ: -1.3, direction: -1 as const, scale: 0.82 },
    { src: "cars/suv.glb", laneZ: 0.0, startX: 11.1, speed: 1.08, rearZ: -1.36, direction: 1 as const, scale: 0.8 },
    { src: "cars/sedan.glb", laneZ: 1.28, startX: 16.4, speed: 1.38, rearZ: -1.3, direction: -1 as const, scale: 0.76 },
    { src: "cars/delivery.glb", laneZ: 0.08, startX: 20.0, speed: 1.15, rearZ: -1.67, direction: 1 as const, scale: 0.66 },
  ];

  const buildings: Array<{ src: string; position: [number, number, number]; scale: number }> = [
    { src: "city/building-type-h.glb", position: [-7.2, 0, -4.18], scale: 1.85 },
    { src: "city/building-type-l.glb", position: [-4.85, 0, -4.25], scale: 1.75 },
    { src: "city/building-type-p.glb", position: [-2.45, 0, -4.2], scale: 1.9 },
    { src: "city/building-type-h.glb", position: [0.0, 0, -4.18], scale: 1.78 },
    { src: "city/building-type-l.glb", position: [2.5, 0, -4.22], scale: 1.9 },
    { src: "city/building-type-p.glb", position: [5.05, 0, -4.2], scale: 1.78 },
    { src: "city/building-type-h.glb", position: [7.55, 0, -4.2], scale: 1.88 },
  ];

  return (
    <>
      <color attach="background" args={["#9bdef9"]} />
      <fog attach="fog" args={["#bfeeff", 17, 34]} />
      <CameraRig compact={compact} />

      <ambientLight intensity={1.15} />
      <hemisphereLight intensity={1.05} color="#e3f7ff" groundColor="#7890a6" />
      <directionalLight
        castShadow
        position={[5, 9, 7]}
        intensity={2.15}
        color="#fff0d3"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[23, 0.1, 13]} />
        <meshStandardMaterial color="#dbe7ed" roughness={0.95} />
      </mesh>

      <BackgroundSkyline />

      <Suspense fallback={null}>
        {buildings.map((building, index) => (
          <BuildingModel
            key={index}
            src={modelUrl(building.src)}
            position={building.position}
            scale={building.scale}
          />
        ))}
      </Suspense>

      <mesh position={[0, 0.015, 0.62]} receiveShadow>
        <boxGeometry args={[23, 0.04, 3.3]} />
        <meshStandardMaterial color="#344357" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.045, -1.85]} receiveShadow>
        <boxGeometry args={[23, 0.06, 1.55]} />
        <meshStandardMaterial color="#d8e7ed" roughness={0.97} />
      </mesh>
      <mesh position={[0, 0.045, 3.08]} receiveShadow>
        <boxGeometry args={[23, 0.06, 1.5]} />
        <meshStandardMaterial color="#d8e7ed" roughness={0.97} />
      </mesh>

      {[-8.7, -5.7, -2.7, 0.3, 3.3, 6.3, 9.3].map((x) => (
        <mesh key={x} position={[x, 0.045, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.18, 0.08]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}

      <Suspense fallback={null}>
        {[-7.5, -5.0, -2.6, 0.0, 2.6, 5.15, 7.55].map((x, index) => (
          <TreeModel
            key={x}
            position={[x, 0, -2.86]}
            scale={index % 2 ? 1.55 : 1.72}
          />
        ))}
      </Suspense>

      <Suspense fallback={null}>
        {people.map((person, index) => (
          <WalkerModel key={index} {...person} src={modelUrl(person.src)} />
        ))}
      </Suspense>

      <Suspense fallback={null}>
        {cars.map((car, index) => (
          <VehicleModel key={index} {...car} src={modelUrl(car.src)} />
        ))}
      </Suspense>

      <ContactShadows position={[0, 0.03, 0]} opacity={0.28} scale={20} blur={2.6} far={7} />
    </>
  );
}

export default function UrbanCarrier3DCity({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "relative aspect-[16/10] w-full overflow-hidden rounded-[1.6rem]"
          : "relative aspect-[16/10] w-full overflow-hidden rounded-[2rem]"
      }
    >
      <Canvas shadows dpr={[1, 1.35]} gl={{ antialias: true, alpha: false }}>
        <CityWorld compact={compact} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#061a33]/25 to-transparent" />
    </div>
  );
}
