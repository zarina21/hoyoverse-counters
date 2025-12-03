import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUpload from "@/components/ImageUpload";

type GameType = "genshin_impact" | "honkai_star_rail";
type BannerType = "character" | "weapon" | "standard";

const Admin = () => {
  const [selectedGame, setSelectedGame] = useState<GameType>("genshin_impact");
  const [versions, setVersions] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [versionForm, setVersionForm] = useState({
    version_number: "",
    release_date: "",
    description: "",
  });

  const [bannerForm, setBannerForm] = useState({
    name: "",
    banner_type: "character" as BannerType,
    featured_character: "",
    start_date: "",
    end_date: "",
    image_url: "",
    rarity: 5,
  });

  const [eventForm, setEventForm] = useState({
    event_name: "",
    description: "",
    start_date: "",
    end_date: "",
    rewards: "",
    image_url: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedGame]);

  const fetchData = async () => {
    setLoading(true);
    
    const [versionsRes, bannersRes, eventsRes] = await Promise.all([
      supabase.from("game_versions").select("*").eq("game", selectedGame).order("release_date", { ascending: false }),
      supabase.from("banners").select("*").eq("game", selectedGame).order("start_date", { ascending: false }),
      supabase.from("events").select("*").eq("game", selectedGame).order("start_date", { ascending: false }),
    ]);

    setVersions(versionsRes.data || []);
    setBanners(bannersRes.data || []);
    setEvents(eventsRes.data || []);
    setLoading(false);
  };

  const callSyncFunction = async (action: string, data: any) => {
    const { data: result, error } = await supabase.functions.invoke("sync-game-data", {
      body: { action, game: selectedGame, data: { ...data, game: selectedGame } },
    });

    if (error) throw error;
    return result;
  };

  const handleAddVersion = async () => {
    try {
      await callSyncFunction("upsert_version", versionForm);
      toast.success("Versión agregada correctamente");
      setVersionForm({ version_number: "", release_date: "", description: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleAddBanner = async () => {
    try {
      await callSyncFunction("upsert_banner", bannerForm);
      toast.success("Banner agregado correctamente");
      setBannerForm({
        name: "",
        banner_type: "character",
        featured_character: "",
        start_date: "",
        end_date: "",
        image_url: "",
        rarity: 5,
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleAddEvent = async () => {
    try {
      await callSyncFunction("upsert_event", eventForm);
      toast.success("Evento agregado correctamente");
      setEventForm({
        event_name: "",
        description: "",
        start_date: "",
        end_date: "",
        rewards: "",
        image_url: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    try {
      await callSyncFunction(`delete_${type}`, { id });
      toast.success("Eliminado correctamente");
      fetchData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const gameTitle = selectedGame === "genshin_impact" ? "Genshin Impact" : "Honkai: Star Rail";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
        </div>

        <div className="mb-6">
          <Select value={selectedGame} onValueChange={(v) => setSelectedGame(v as GameType)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="genshin_impact">Genshin Impact</SelectItem>
              <SelectItem value="honkai_star_rail">Honkai: Star Rail</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="versions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="versions">Versiones</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

          {/* VERSIONS TAB */}
          <TabsContent value="versions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Nueva Versión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Número de versión (ej: 5.4)"
                    value={versionForm.version_number}
                    onChange={(e) => setVersionForm({ ...versionForm, version_number: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    value={versionForm.release_date}
                    onChange={(e) => setVersionForm({ ...versionForm, release_date: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Descripción de la versión"
                  value={versionForm.description}
                  onChange={(e) => setVersionForm({ ...versionForm, description: e.target.value })}
                />
                <Button onClick={handleAddVersion} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Agregar Versión
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Versiones de {gameTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-semibold">{version.version_number}</span>
                        <span className="text-muted-foreground ml-4">
                          {new Date(version.release_date).toLocaleDateString()}
                        </span>
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete("version", version.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {versions.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No hay versiones registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BANNERS TAB */}
          <TabsContent value="banners" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Nuevo Banner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nombre del banner"
                    value={bannerForm.name}
                    onChange={(e) => setBannerForm({ ...bannerForm, name: e.target.value })}
                  />
                  <Select
                    value={bannerForm.banner_type}
                    onValueChange={(v) => setBannerForm({ ...bannerForm, banner_type: v as BannerType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Personaje</SelectItem>
                      <SelectItem value="weapon">Arma</SelectItem>
                      <SelectItem value="standard">Estándar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Personaje/Arma destacado"
                    value={bannerForm.featured_character}
                    onChange={(e) => setBannerForm({ ...bannerForm, featured_character: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Rareza (4 o 5)"
                    value={bannerForm.rarity}
                    onChange={(e) => setBannerForm({ ...bannerForm, rarity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha inicio</label>
                    <Input
                      type="datetime-local"
                      value={bannerForm.start_date}
                      onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha fin</label>
                    <Input
                      type="datetime-local"
                      value={bannerForm.end_date}
                      onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Imagen del banner</label>
                  <ImageUpload
                    value={bannerForm.image_url}
                    onChange={(url) => setBannerForm({ ...bannerForm, image_url: url })}
                    folder="banners"
                  />
                </div>
                <Button onClick={handleAddBanner} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Agregar Banner
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banners de {gameTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <div key={banner.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-semibold">{banner.name}</span>
                        <span className="text-muted-foreground ml-2">({banner.banner_type})</span>
                        <span className="text-muted-foreground ml-4 text-sm">
                          {new Date(banner.start_date).toLocaleDateString()} - {new Date(banner.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete("banner", banner.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {banners.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No hay banners registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EVENTS TAB */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Nuevo Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Nombre del evento"
                  value={eventForm.event_name}
                  onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                />
                <Textarea
                  placeholder="Descripción del evento"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha inicio</label>
                    <Input
                      type="datetime-local"
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Fecha fin</label>
                    <Input
                      type="datetime-local"
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <Input
                  placeholder="Recompensas (ej: Primogemas x420)"
                  value={eventForm.rewards}
                  onChange={(e) => setEventForm({ ...eventForm, rewards: e.target.value })}
                />
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Imagen del evento</label>
                  <ImageUpload
                    value={eventForm.image_url}
                    onChange={(url) => setEventForm({ ...eventForm, image_url: url })}
                    folder="events"
                  />
                </div>
                <Button onClick={handleAddEvent} className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Agregar Evento
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos de {gameTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-semibold">{event.event_name}</span>
                        <span className="text-muted-foreground ml-4 text-sm">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete("event", event.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No hay eventos registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
