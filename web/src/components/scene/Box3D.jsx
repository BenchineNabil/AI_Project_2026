import { useRef, useState } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useContainerStore } from "@/lib/store";

const HIGHLIGHT = "#ff8c42";
const HIGHLIGHT_EMISSIVE = "#ff6b35";

export function Box3D({ box, isSelected, isDimmed, onSelect, explodeFactor }) {
  const meshRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const centerX = box.posX + box.length / 2;
  const centerY = box.posY + box.height / 2;
  const centerZ = box.posZ + box.width / 2;

  const container = useContainerStore((s) => s.container);
  const containerCenterX = container.length / 2;
  const containerCenterY = container.height / 2;
  const containerCenterZ = container.width / 2;

  const dx = centerX - containerCenterX;
  const dy = centerY - containerCenterY;
  const dz = centerZ - containerCenterZ;

  const explodedX = containerCenterX + dx * explodeFactor;
  const explodedY = containerCenterY + dy * explodeFactor;
  const explodedZ = containerCenterZ + dz * explodeFactor;

  const baseColor = new THREE.Color(box.color);
  const displayColor = isSelected ? new THREE.Color(HIGHLIGHT) : baseColor;
  const opacity = isSelected ? 1 : isDimmed ? 0.28 : hovered ? 0.92 : 0.82;
  const emissiveIntensity = isSelected ? 0.55 : hovered ? 0.12 : isDimmed ? 0 : 0.05;

  return (
    <group position={[explodedX, explodedY, explodedZ]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[box.length, box.height, box.width]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={opacity}
          emissive={isSelected ? new THREE.Color(HIGHLIGHT_EMISSIVE) : displayColor}
          emissiveIntensity={emissiveIntensity}
          roughness={isSelected ? 0.35 : 0.48}
          metalness={isSelected ? 0.12 : 0.06}
          envMapIntensity={0.65}
        />
      </mesh>

      <Edges
        threshold={15}
        color={isSelected ? "#fff7ed" : isDimmed ? "#1e293b" : "#475569"}
        lineWidth={isSelected ? 2.5 : 0.6}
      >
        <boxGeometry args={[box.length, box.height, box.width]} />
      </Edges>
    </group>
  );
}
