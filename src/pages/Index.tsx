import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GameSelector from "@/components/GameSelector";
import CountdownTimer from "@/components/CountdownTimer";
import BannerCard from "@/components/BannerCard";
import EventCard from "@/components/EventCard";
import genshinHero from "@/assets/genshin-hero.jpg";
import hsrHero from "@/assets/hsr-hero.jpg";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

type GameType = "genshin_impact" | "honkai_star_rail";

const Index = () => {
  const [selectedGame, setSelectedGame] = useState<GameType>("genshin_impact");
  const [nextVersion, setNextVersion] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData();
  }, [selectedGame]);

  const fetchGameData = async () => {
    setLoading(true);
    
    // Fetch next version
    const { data: versionData } = await supabase
      .from("game_versions")
      .select("*")
      .eq("game", selectedGame)
      .gte("release_date", new Date().toISOString())
      .order("release_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    setNextVersion(versionData);

    // Fetch banners
    const { data: bannersData } = await supabase
      .from("banners")
      .select("*")
      .eq("game", selectedGame)
      .order("start_date", { ascending: false })
      .limit(6);

    setBanners(bannersData || []);

    // Fetch events
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("game", selectedGame)
      .order("start_date", { ascending: false })
      .limit(8);

    setEvents(eventsData || []);
    setLoading(false);
  };

  const heroImage = selectedGame === "genshin_impact" ? genshinHero : hsrHero;
  const gameTitle = selectedGame === "genshin_impact" ? "Genshin Impact" : "Honkai: Star Rail";

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Link */}
      <Link to="/admin" className="fixed top-4 right-4 z-50">
        <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur-sm">
          <Settings className="w-5 h-5" />
        </Button>
      </Link>

      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        </div>
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-6xl font-bold mb-4 animate-float">
            <span className={selectedGame === "genshin_impact" ? "text-genshin-cyan" : "text-hsr-purple"}>
              HoYo
            </span>
            <span className="text-accent">Verse</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Cuenta regresiva, banners y eventos
          </p>
          <GameSelector selectedGame={selectedGame} onGameChange={setSelectedGame} />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-16">
            {/* Countdown Section */}
            {nextVersion && (
              <section>
                <h2 className="text-3xl font-bold mb-6">Próxima Versión</h2>
                <CountdownTimer
                  targetDate={new Date(nextVersion.release_date)}
                  title={`${gameTitle} ${nextVersion.version_number}`}
                  game={selectedGame}
                />
                {nextVersion.description && (
                  <p className="mt-4 text-muted-foreground text-center">{nextVersion.description}</p>
                )}
              </section>
            )}

            {/* Banners Section */}
            {banners.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold mb-6">Banners</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {banners.map((banner) => (
                    <BannerCard
                      key={banner.id}
                      name={banner.name}
                      featuredCharacter={banner.featured_character}
                      startDate={new Date(banner.start_date)}
                      endDate={new Date(banner.end_date)}
                      imageUrl={banner.image_url}
                      bannerType={banner.banner_type}
                      rarity={banner.rarity}
                      game={selectedGame}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Events Section */}
            {events.length > 0 && (
              <section>
                <h2 className="text-3xl font-bold mb-6">Eventos</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      eventName={event.event_name}
                      description={event.description}
                      startDate={new Date(event.start_date)}
                      endDate={new Date(event.end_date)}
                      rewards={event.rewards}
                      imageUrl={event.image_url}
                      game={selectedGame}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!nextVersion && banners.length === 0 && events.length === 0 && (
              <div className="text-center py-20">
                <p className="text-2xl text-muted-foreground">
                  No hay datos disponibles para {gameTitle}
                </p>
                <p className="text-muted-foreground mt-2">
                  Agrega versiones, banners y eventos desde el backend
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;