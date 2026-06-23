import ColorPatternGame from "@/components/games/ColorPatternGame";
import GamePageShell from "@/components/shell/GamePageShell";

export default function ColorPatternPage() {
  return (
    <GamePageShell title="Color Pattern">
      <ColorPatternGame />
    </GamePageShell>
  );
}
