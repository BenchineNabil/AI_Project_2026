import { useRef, useState } from "react";
import * as THREE from "three";
import { Html, Edges } from "@react-three/drei";
import { useContainerStore } from "@/lib/store";

export function Box3D({ box, isSelected, onSelect, explodeFactor }) {
  const meshRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const { showLabels } = useContainerStore();

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

      {showLabels && (hovered || isSelected) && (
        <Html
          position={[0, box.height / 2 + 0.15, 0]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[100, 0]}
        >
          <div className="rounded-xl border border-white/15 bg-[#0a101c]/95 px-3 py-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <div className="font-display text-xs font-bold uppercase tracking-wide text-primary">{box.name}</div>
            <div className="font-mono text-[10px] tabular-nums text-slate-300">
              {box.length.toFixed(1)} × {box.width.toFixed(1)} × {box.height.toFixed(1)} m
            </div>
            <div className="font-mono text-[10px] tabular-nums text-slate-500">
              XYZ ({box.posX.toFixed(1)}, {box.posY.toFixed(1)}, {box.posZ.toFixed(1)})
            </div>
            {box.weight > 0 && (
              <div className="font-mono text-[10px] text-slate-400">Mass {box.weight} kg</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
