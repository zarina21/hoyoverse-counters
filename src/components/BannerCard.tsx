import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Sparkles } from "lucide-react";

interface BannerCardProps {
  name: string;
  featuredCharacter?: string;
  startDate: Date;
  endDate: Date;
  imageUrl?: string;
  bannerType: string;
  rarity?: number;
  game: "genshin_impact" | "honkai_star_rail";
}

const BannerCard = ({ 
  name, 
  featuredCharacter, 
  startDate, 
  endDate, 
  imageUrl, 
  bannerType, 
  rarity,
  game 
}: BannerCardProps) => {
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const glowClass = game === "genshin_impact" ? "hover:glow-genshin" : "hover:glow-hsr";
  const accentColor = game === "genshin_impact" ? "text-genshin-cyan" : "text-hsr-purple";
  const rarityStars = rarity ? "★".repeat(rarity) : "";

  return (
    <div className={`bg-card rounded-xl overflow-hidden border-2 border-border transition-all duration-300 ${glowClass} hover:scale-[1.02]`}>
      {imageUrl ? (
        <div className="h-48 overflow-hidden">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-muted to-background flex items-center justify-center">
          <Sparkles className={`w-16 h-16 ${accentColor}`} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-bold text-lg mb-1">{name}</h4>
            {featuredCharacter && (
              <p className={`text-sm ${accentColor} font-semibold`}>{featuredCharacter}</p>
            )}
          </div>
          {rarity && (
            <span className="text-accent text-lg">{rarityStars}</span>
          )}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="capitalize">{bannerType.replace("_", " ")}</p>
          <p>
            {format(startDate, "dd MMM", { locale: es })} - {format(endDate, "dd MMM yyyy", { locale: es })}
          </p>
          {isActive && (
            <span className="inline-block px-2 py-1 bg-accent/20 text-accent rounded-md text-xs font-semibold animate-pulse">
              ¡Activo Ahora!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BannerCard;