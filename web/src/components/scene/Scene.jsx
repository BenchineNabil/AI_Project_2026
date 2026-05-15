import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  ContactShadows,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { useEffect, Suspense } from "react";
import { Container3D } from "./Container3D";
import { Box3D } from "./Box3D";
import { FloorGrid } from "./FloorGrid";
import { useContainerStore } from "@/lib/store";

/** ACES tone mapping for smoother, more photographic output (presentation only). */
function ToneMappingSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);
  return null;
}

function SceneContent() {
  const {
    placedBoxes,
    container,
    selectedBoxId,
    setSelectedBoxId,
    autoRotate,
    explodedView,
  } = useContainerStore();

  const explodeFactor = explodedView ? 1.5 : 1;
  const cx = container.length / 2;
  const cy = container.height / 2;
  const cz = container.width / 2;
  const shadowScale = Math.max(container.length, container.width, 8) * 1.35;

  return (
    <>
      <color attach="background" args={["#050a12"]} />
      <fog attach="fog" args={["#050a12", 22, 58]} />

      <ToneMappingSetup />

      <Environment preset="warehouse" environmentIntensity={0.48} />

      <PerspectiveCamera makeDefault position={[8.5, 6.2, 8.5]} fov={48} near={0.1} far={200} />
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.85}
        enableDamping
        dampingFactor={0.065}
        rotateSpeed={0.62}
        zoomSpeed={0.82}
        minDistance={2.8}
        maxDistance={42}
        maxPolarAngle={Math.PI * 0.499}
        minPolarAngle={0.12}
        target={[cx, cy, cz]}
        makeDefault
      />

      <ambientLight intensity={0.48} />
      <hemisphereLight args={["#dbeafe", "#0c1220", 0.62]} />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.38}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.4}
        shadow-camera-far={72}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.00012}
        shadow-normalBias={0.02}
        color="#fff4e6"
      />
      <directionalLight position={[-10, 8, -8]} intensity={0.28} color="#7dd3fc" />
      <pointLight position={[cx, container.height + 2.8, cz]} intensity={0.38} color="#fdba74" distance={48} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.045, cz]} receiveShadow>
        <planeGeometry args={[96, 96]} />
        <meshStandardMaterial color="#0d121c" roughness={0.94} metalness={0.06} envMapIntensity={0.35} />
      </mesh>

      <FloorGrid containerLength={container.length} containerWidth={container.width} />

      <Container3D length={container.length} width={container.width} height={container.height} />

      {placedBoxes.map((box) => (
        <Box3D
          key={box.id}
          box={box}
          isSelected={selectedBoxId === box.id}
          onSelect={() => setSelectedBoxId(selectedBoxId === box.id ? null : box.id)}
          explodeFactor={explodeFactor}
        />
      ))}

      <ContactShadows
        position={[cx, 0.018, cz]}
        opacity={0.42}
        scale={shadowScale}
        blur={2.6}
        far={6}
        color="#030508"
      />
    </>
  );
}

export default function Scene() {
  return (
    <div className="relative isolate h-full min-h-[220px] w-full min-w-0 touch-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.32_0.1_260_/_0.4),transparent_50%),linear-gradient(180deg,#0b1220_0%,#04060c_100%)]">
      <Canvas
        shadows
        className="block h-full w-full"
        dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)]}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
