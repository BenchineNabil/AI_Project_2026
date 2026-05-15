import * as THREE from "three";
import { Edges } from "@react-three/drei";

export function Container3D({ length, width, height }) {
  return (
    <group position={[length / 2, height / 2, width / 2]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color="#3d7ab8"
          metalness={0.22}
          roughness={0.4}
          transparent
          opacity={0.52}
          side={THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={0.75}
        />
      </mesh>

      <Edges threshold={12} color="#e2e8f0" lineWidth={1.5}>
        <boxGeometry args={[length, height, width]} />
      </Edges>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2 + 0.004, 0]} receiveShadow castShadow>
        <planeGeometry args={[length * 0.998, width * 0.998]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.72}
          roughness={0.42}
          envMapIntensity={0.85}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2 + 0.002, 0]}>
        <planeGeometry args={[length * 0.92, width * 0.88]} />
        <meshStandardMaterial color="#1e293b" metalness={0.35} roughness={0.75} opacity={0.55} transparent />
      </mesh>
    </group>
  );
}
