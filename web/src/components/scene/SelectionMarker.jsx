import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Floor highlight for the selected stowed box. */
export function SelectionMarker({ box }) {
  const ringRef = useRef(null);
  const cx = box.posX + box.length / 2;
  const cz = box.posZ + box.width / 2;

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
  });

  return (
    <group position={[cx, box.posY + 0.008, cz]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(box.length, box.width) * 0.55, Math.max(box.length, box.width) * 0.72, 32]} />
        <meshBasicMaterial color="#ff8c42" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[box.length * 1.02, box.width * 1.02]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}
