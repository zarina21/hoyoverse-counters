import { cn } from "@/lib/utils";

type GameType = "genshin_impact" | "honkai_star_rail";

interface GameSelectorProps {
  selectedGame: GameType;
  onGameChange: (game: GameType) => void;
}

const GameSelector = ({ selectedGame, onGameChange }: GameSelectorProps) => {
  return (
    <div className="flex gap-4 justify-center mb-8">
      <button
        onClick={() => onGameChange("genshin_impact")}
        className={cn(
          "px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300",
          "hover:scale-105 active:scale-95",
          selectedGame === "genshin_impact"
            ? "bg-genshin-cyan text-background shadow-[0_0_40px_rgba(0,216,255,0.5)]"
            : "bg-card text-muted-foreground hover:text-foreground border-2 border-border"
        )}
      >
        Genshin Impact
      </button>
      <button
        onClick={() => onGameChange("honkai_star_rail")}
        className={cn(
          "px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300",
          "hover:scale-105 active:scale-95",
          selectedGame === "honkai_star_rail"
            ? "bg-hsr-purple text-foreground shadow-[0_0_40px_rgba(139,92,246,0.5)]"
            : "bg-card text-muted-foreground hover:text-foreground border-2 border-border"
        )}
      >
        Honkai: Star Rail
      </button>
    </div>
  );
};

export default GameSelector;