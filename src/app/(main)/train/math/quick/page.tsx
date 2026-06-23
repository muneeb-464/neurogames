import QuickMathGame from "@/components/games/QuickMathGame";
import GamePageShell from "@/components/shell/GamePageShell";

export default function QuickMathPage() {
  return (
    <GamePageShell title="Quick Math" backHref="/train/math">
      <QuickMathGame />
    </GamePageShell>
  );
}
