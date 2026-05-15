import { Grid } from "@react-three/drei";

export function FloorGrid({ containerLength, containerWidth }) {
  return (
    <Grid
      position={[containerLength / 2, 0.003, containerWidth / 2]}
      args={[Math.max(containerLength, 20), Math.max(containerWidth, 20)]}
      cellSize={1}
      cellThickness={0.35}
      cellColor="#1e293b"
      sectionSize={5}
      sectionThickness={0.65}
      sectionColor="#334155"
      fadeDistance={32}
      fadeStrength={1.25}
      infiniteGrid={false}
    />
  );
}
