import { useEffect } from "react";
import { useContainerStore } from "@/lib/store";

const STEP_MS = 520;

/** Advances placement simulation one box at a time. */
export function PlacementSimulationTicker() {
  const playing = useContainerStore((s) => s.simulationPlaying);
  const index = useContainerStore((s) => s.simulationIndex);
  const total = useContainerStore((s) => s.placementSequence.length);

  useEffect(() => {
    if (!playing) return;
    if (total === 0) {
      useContainerStore.setState({ simulationPlaying: false, simulationActive: false });
      return;
    }
    if (index >= total) {
      const t = setTimeout(() => {
        useContainerStore.setState({
          simulationPlaying: false,
          simulationActive: false,
          simulationIndex: total,
        });
      }, 400);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      useContainerStore.setState({ simulationIndex: index + 1 });
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  return null;
}
