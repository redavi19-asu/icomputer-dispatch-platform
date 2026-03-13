"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

function BinaryRain() {
	const columns = useMemo(
		() =>
			Array.from({ length: 30 }, (_, i) => ({
				id: i,
				left: `${(i / 30) * 100}%`,
				duration: 8 + (i % 7),
				delay: (i % 5) * 0.8,
				opacity: 0.12 + (i % 4) * 0.06,
				fontSize: 12 + (i % 4) * 3,
				text: Array.from({ length: 28 }, (_, j) => ((i + j) % 2 === 0 ? "0" : "1")).join(" "),
			})),
		[]
	);

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{columns.map((col) => (
				<div
					key={col.id}
					className="absolute top-[-20%] whitespace-nowrap font-mono text-cyan-300/30"
					style={{
						left: col.left,
						fontSize: `${col.fontSize}px`,
						opacity: col.opacity,
						writingMode: "vertical-rl",
						textOrientation: "mixed",
						animation: `dispatch-binary-fall ${col.duration}s linear ${col.delay}s infinite`,
						textShadow: "0 0 10px rgba(34,211,238,0.25)",
					}}
				>
					{col.text}
				</div>
			))}
		</div>
	);
}

function GlobeMesh() {
	const globeRef = useRef<THREE.Mesh>(null);
	const atmosphereRef = useRef<THREE.Mesh>(null);
	const innerRingRef = useRef<THREE.Mesh>(null);
	const particlesRef = useRef<THREE.Points>(null);
	const scanBandRef = useRef<THREE.Mesh>(null);

	const particlePositions = useMemo(() => {
		const count = 900;
		const positions = new Float32Array(count * 3);

		for (let i = 0; i < count; i += 1) {
			const radius = 1.8 + Math.random() * 1.1;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);

			positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
			positions[i * 3 + 1] = radius * Math.cos(phi);
			positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
		}

		return positions;
	}, []);

	const globeMaterial = useMemo(() => {
		return new THREE.ShaderMaterial({
			uniforms: {
				time: { value: 0 },
			},
			vertexShader: `
				varying vec2 vUv;
				varying vec3 vNormal;
				varying vec3 vPosition;

				void main() {
					vUv = uv;
					vNormal = normalize(normalMatrix * normal);
					vPosition = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float time;
				varying vec2 vUv;
				varying vec3 vNormal;
				varying vec3 vPosition;

				float circle(vec2 uv, vec2 center, float radius, float blur) {
					float d = distance(uv, center);
					return smoothstep(radius + blur, radius - blur, d);
				}

				void main() {
					vec2 uv = vUv;

					float stripes = sin((uv.y * 22.0 + time * 0.55) * 6.28318) * 0.5 + 0.5;
					float longitude = sin((uv.x * 14.0 - time * 0.35) * 6.28318) * 0.5 + 0.5;
					float latLines = smoothstep(0.48, 0.52, abs(fract(uv.y * 10.0) - 0.5));
					float longLines = smoothstep(0.485, 0.515, abs(fract(uv.x * 14.0) - 0.5));

					vec3 base = vec3(0.01, 0.05, 0.12);
					vec3 cyan = vec3(0.08, 0.78, 1.0);
					vec3 deep = vec3(0.01, 0.18, 0.35);
					vec3 bright = vec3(0.35, 0.95, 1.0);

					float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
					float glowBlob1 = circle(uv, vec2(0.68, 0.54), 0.22, 0.22);
					float glowBlob2 = circle(uv, vec2(0.36, 0.62), 0.18, 0.18);
					float scan = smoothstep(0.35, 0.95, stripes) * 0.45;
					float meridianMix = smoothstep(0.45, 0.95, longitude) * 0.25;
					float grid = (1.0 - latLines) * 0.08 + (1.0 - longLines) * 0.08;

					vec3 color = base;
					color += deep * (scan + meridianMix);
					color += cyan * glowBlob1 * 0.9;
					color += bright * glowBlob2 * 0.5;
					color += vec3(0.12, 0.5, 0.65) * grid;
					color += vec3(0.08, 0.65, 0.9) * fresnel * 0.85;

					gl_FragColor = vec4(color, 1.0);
				}
			`,
		});
	}, []);

	useFrame((state) => {
		const t = state.clock.getElapsedTime();

		if (globeRef.current) {
			globeRef.current.rotation.y = t * 0.22;
			globeRef.current.rotation.z = Math.sin(t * 0.15) * 0.04;
		}

		if (atmosphereRef.current) {
			atmosphereRef.current.rotation.y = -t * 0.12;
		}

		if (innerRingRef.current) {
			innerRingRef.current.rotation.z = t * 0.08;
			innerRingRef.current.rotation.y = t * 0.1;
		}

		if (particlesRef.current) {
			particlesRef.current.rotation.y = t * 0.04;
			particlesRef.current.rotation.x = t * 0.03;
		}

		if (scanBandRef.current) {
			scanBandRef.current.rotation.y = t * 0.35;
			scanBandRef.current.rotation.z = Math.sin(t * 0.6) * 0.08;
		}

		globeMaterial.uniforms.time.value = t;
	});

	return (
		<group position={[0.6, 0, 0]}>
			<mesh ref={globeRef}>
				<sphereGeometry args={[1.28, 96, 96]} />
				<primitive object={globeMaterial} attach="material" />
			</mesh>

			<mesh ref={atmosphereRef}>
				<sphereGeometry args={[1.5, 64, 64]} />
				<meshBasicMaterial color="#2de2ff" transparent opacity={0.1} side={THREE.BackSide} />
			</mesh>

			<mesh>
				<sphereGeometry args={[1.72, 64, 64]} />
				<meshBasicMaterial color="#29d8ff" transparent opacity={0.05} side={THREE.BackSide} />
			</mesh>

			<mesh ref={innerRingRef} rotation={[0.7, 0.4, 0.15]}>
				<torusGeometry args={[1.7, 0.012, 16, 180]} />
				<meshBasicMaterial color="#36dfff" transparent opacity={0.28} />
			</mesh>

			<mesh rotation={[1.1, 0.15, -0.25]}>
				<torusGeometry args={[2.0, 0.01, 16, 180]} />
				<meshBasicMaterial color="#1fcdf6" transparent opacity={0.14} />
			</mesh>

			<mesh ref={scanBandRef} rotation={[0.25, 0.15, 0.6]}>
				<torusGeometry args={[1.05, 0.045, 12, 100]} />
				<meshBasicMaterial color="#64ecff" transparent opacity={0.16} />
			</mesh>

			<points ref={particlesRef}>
				<bufferGeometry>
					<bufferAttribute
						args={[particlePositions, 3]}
						attach="attributes-position"
					/>
				</bufferGeometry>
				<pointsMaterial
					color="#7befff"
					size={0.015}
					transparent
					opacity={0.85}
					sizeAttenuation
				/>
			</points>

			<pointLight position={[2.4, 1.2, 2.4]} intensity={12} color="#5ee7ff" />
			<pointLight position={[-2.2, -1.3, -2.0]} intensity={2.2} color="#0ea5e9" />
			<ambientLight intensity={0.55} />
		</group>
	);
}

function Scene() {
	return (
		<>
			<fog attach="fog" args={["#020617", 5, 12]} />
			<GlobeMesh />
		</>
	);
}

export function DispatchGlobe() {
	return (
		<div className="relative h-[540px] w-full overflow-hidden rounded-[32px] border border-cyan-400/10 bg-[radial-gradient(circle_at_70%_40%,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,#020617_0%,#020b1a_42%,#010814_100%)] shadow-[0_0_120px_rgba(14,165,233,0.15)]">
			<BinaryRain />

			<div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_52%,rgba(45,226,255,0.18),transparent_24%),radial-gradient(circle_at_70%_50%,rgba(14,165,233,0.14),transparent_32%)]" />

			<Canvas camera={{ position: [0, 0, 4.9], fov: 42 }}>
				<Suspense fallback={<Html center className="text-cyan-300">Loading globe…</Html>}>
					<Scene />
				</Suspense>
			</Canvas>

			<div className="pointer-events-none absolute inset-0 rounded-[32px] border border-cyan-300/10" />

			<style jsx>{`
				@keyframes dispatch-binary-fall {
					0% {
						transform: translateY(-10%);
					}
					100% {
						transform: translateY(120%);
					}
				}
			`}</style>
		</div>
	);
}
