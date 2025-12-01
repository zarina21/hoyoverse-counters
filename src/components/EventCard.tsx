import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Gift } from "lucide-react";

interface EventCardProps {
  eventName: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  rewards?: string;
  imageUrl?: string;
  game: "genshin_impact" | "honkai_star_rail";
}

const EventCard = ({ 
  eventName, 
  description, 
  startDate, 
  endDate, 
  rewards, 
  imageUrl,
  game 
}: EventCardProps) => {
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const accentColor = game === "genshin_impact" ? "text-genshin-cyan" : "text-hsr-purple";
  const borderColor = game === "genshin_impact" ? "border-genshin-cyan/30" : "border-hsr-purple/30";

  return (
    <div className={`bg-card rounded-xl p-5 border-2 ${isActive ? borderColor : "border-border"} transition-all hover:scale-[1.01]`}>
      <div className="flex gap-4">
        {imageUrl && (
          <img src={imageUrl} alt={eventName} className="w-24 h-24 rounded-lg object-cover" />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className={`font-bold text-lg ${accentColor}`}>{eventName}</h4>
            {isActive && (
              <span className="px-2 py-1 bg-accent/20 text-accent rounded-md text-xs font-semibold animate-pulse">
                Activo
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(startDate, "dd MMM", { locale: es })} - {format(endDate, "dd MMM", { locale: es })}</span>
            </div>
            {rewards && (
              <div className="flex items-center gap-1 text-accent">
                <Gift className="w-4 h-4" />
                <span className="font-semibold">{rewards}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;