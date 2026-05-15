import { useRef, useState } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useContainerStore } from "@/lib/store";

export function Box3D({ box, isSelected, onSelect, explodeFactor }) {
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

  const color = new THREE.Color(box.color);
  const emissiveIntensity = isSelected ? 0.3 : hovered ? 0.15 : 0;

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
          color={color}
          transparent={hovered || isSelected}
          opacity={isSelected ? 0.9 : hovered ? 0.94 : 0.82}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.48}
          metalness={0.06}
          envMapIntensity={0.65}
        />
      </mesh>

      <Edges threshold={15} color={isSelected ? "#fdba74" : "#334155"} lineWidth={isSelected ? 2 : 0.5}>
        <boxGeometry args={[box.length, box.height, box.width]} />
      </Edges>
    </group>
  );
}
