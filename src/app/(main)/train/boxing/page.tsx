import BoxingArenaGame from "@/components/games/BoxingArenaGame";
import GamePageShell from "@/components/shell/GamePageShell";

export default function BoxingTrainPage() {
  return (
    <GamePageShell title="Arena Boxing">
      <BoxingArenaGame />
    </GamePageShell>
  );
}
