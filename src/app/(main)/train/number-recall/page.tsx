import NumberRecallGame from "@/components/games/NumberRecallGame";
import GamePageShell from "@/components/shell/GamePageShell";

export default function NumberRecallPage() {
  return (
    <GamePageShell title="Number Recall">
      <NumberRecallGame />
    </GamePageShell>
  );
}
