"use client";

import MathTrainingGame from "@/components/games/MathTrainingGame";
import GamePageShell from "@/components/shell/GamePageShell";

export default function MathTrainingRoutePage() {
  return (
    <GamePageShell title="Math Training" backHref="/train/math">
      <MathTrainingGame />
    </GamePageShell>
  );
}
