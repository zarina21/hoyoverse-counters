import { useState, useEffect } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";

interface CountdownTimerProps {
  targetDate: Date;
  title: string;
  game: "genshin_impact" | "honkai_star_rail";
}

const CountdownTimer = ({ targetDate, title, game }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const days = differenceInDays(targetDate, now);
      const hours = differenceInHours(targetDate, now) % 24;
      const minutes = differenceInMinutes(targetDate, now) % 60;
      const seconds = differenceInSeconds(targetDate, now) % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const glowClass = game === "genshin_impact" ? "glow-genshin" : "glow-hsr";
  const accentColor = game === "genshin_impact" ? "text-genshin-cyan" : "text-hsr-purple";

  return (
    <div className={`bg-card rounded-2xl p-6 border-2 border-border ${glowClass} transition-all hover:scale-[1.02]`}>
      <h3 className={`text-2xl font-bold mb-6 ${accentColor} animate-glow`}>{title}</h3>
      <div className="grid grid-cols-4 gap-4">
        {[
          { value: timeLeft.days, label: "Días" },
          { value: timeLeft.hours, label: "Horas" },
          { value: timeLeft.minutes, label: "Minutos" },
          { value: timeLeft.seconds, label: "Segundos" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className={`text-4xl font-bold ${accentColor} mb-2`}>
              {item.value.toString().padStart(2, "0")}
            </div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;