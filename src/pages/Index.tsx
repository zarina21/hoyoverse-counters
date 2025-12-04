import { useState, useEffect, useMemo } from "react";
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

  // Separate banners into current and upcoming
  const { currentBanners, upcomingBanners } = useMemo(() => {
    const now = new Date();
    const current: any[] = [];
    const upcoming: any[] = [];

    banners.forEach((banner) => {
      const startDate = new Date(banner.start_date);
      const endDate = new Date(banner.end_date);

      if (startDate <= now && endDate >= now) {
        current.push(banner);
      } else if (startDate > now) {
        upcoming.push(banner);
      }
    });

    // Sort current by end date (ending soon first)
    current.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    
    // Sort upcoming by start date
    upcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return { currentBanners: current, upcomingBanners: upcoming };
  }, [banners]);

  useEffect(() => {
    fetchGameData();

    // Subscribe to realtime changes for banners
    const bannersChannel = supabase
      .channel('banners-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banners',
          filter: `game=eq.${selectedGame}`,
        },
        () => {
          fetchBanners();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for events
    const eventsChannel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `game=eq.${selectedGame}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for versions
    const versionsChannel = supabase
      .channel('versions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_versions',
          filter: `game=eq.${selectedGame}`,
        },
        () => {
          fetchVersion();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bannersChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(versionsChannel);
    };
  }, [selectedGame]);

  const fetchVersion = async () => {
    const { data: versionData } = await supabase
      .from("game_versions")
      .select("*")
      .eq("game", selectedGame)
      .gte("release_date", new Date().toISOString())
      .order("release_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    setNextVersion(versionData);
  };

  const fetchBanners = async () => {
    // Get all banners that haven't ended yet, plus recent ones
    const { data: bannersData } = await supabase
      .from("banners")
      .select("*")
      .eq("game", selectedGame)
      .order("start_date", { ascending: false })
      .limit(10);
    setBanners(bannersData || []);
  };

  const fetchEvents = async () => {
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("game", selectedGame)
      .order("start_date", { ascending: false })
      .limit(8);
    setEvents(eventsData || []);
  };

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
      .limit(10);

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

            {/* Current Banners Section */}
            {currentBanners.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-3xl font-bold">Banners Actuales</h2>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
                    EN VIVO
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentBanners.map((banner) => (
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

            {/* Upcoming Banners Section */}
            {upcomingBanners.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-3xl font-bold">Próximos Banners</h2>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    PRÓXIMAMENTE
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingBanners.map((banner) => (
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
                  Agrega versiones, banners y eventos desde el panel de administración
                </p>
                <Link to="/admin">
                  <Button className="mt-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Ir al Panel de Admin
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
