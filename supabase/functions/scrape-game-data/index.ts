import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Gengamer countdown sites
const GENSHIN_COUNTDOWN_URL = 'https://genshin-countdown.gengamer.in/';
const HSR_COUNTDOWN_URL = 'https://hsr-countdown.gengamer.in/';

interface ScrapedBannerData {
  version: string;
  bannerTitle: string;
  featuredCharacters: string;
  releaseDate: string;
  imageUrl: string | null;
  game: 'genshin_impact' | 'honkai_star_rail';
}

async function scrapeGengamerSite(url: string, game: 'genshin_impact' | 'honkai_star_rail'): Promise<ScrapedBannerData | null> {
  try {
    console.log(`Scraping ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract version and title from H1 (e.g., "Genshin Impact 6.2 Banner Countdown")
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1Text = h1Match ? h1Match[1].trim() : '';
    
    // Extract version number
    const versionMatch = h1Text.match(/(\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : '';
    
    // Extract featured characters from H2 (e.g., "Varesa and Xilonen Banner Countdown")
    const h2Match = html.match(/<h2[^>]*>.*?<strong[^>]*>([^<]+)<\/strong>/i);
    let featuredCharacters = h2Match ? h2Match[1].trim() : '';
    
    // Clean up the banner title - remove "Banner Countdown"
    featuredCharacters = featuredCharacters.replace(/\s*Banner\s*Countdown\s*/i, '').trim();
    
    // Extract release date from display-time paragraph
    const releaseDateMatch = html.match(/Release Date &amp; Time: ([^<]+)/i) || 
                             html.match(/Release Date & Time: ([^<]+)/i);
    const releaseDate = releaseDateMatch ? releaseDateMatch[1].trim() : '';
    
    // Extract background image URL
    const bgImageMatch = html.match(/id="bg-imageHome"[^>]*style="[^"]*url\('([^']+)'\)/i);
    const imageUrl = bgImageMatch ? bgImageMatch[1] : null;
    
    console.log(`Scraped data for ${game}:`, { version, featuredCharacters, releaseDate, imageUrl });
    
    return {
      version,
      bannerTitle: h1Text,
      featuredCharacters,
      releaseDate,
      imageUrl,
      game
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

function parseReleaseDateToISO(dateStr: string): string {
  // Parse date like "Tuesday, December 23 at 5:00 AM EST"
  try {
    const match = dateStr.match(/(\w+),\s+(\w+)\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)\s+(\w+)/i);
    if (!match) {
      // Return a date 21 days from now as fallback
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 21);
      return futureDate.toISOString();
    }
    
    const [, , month, day, hour, minute, ampm] = match;
    const year = new Date().getFullYear();
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    
    let hours = parseInt(hour);
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    const date = new Date(year, monthIndex, parseInt(day), hours, parseInt(minute));
    
    // If the date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(date.getFullYear() + 1);
    }
    
    return date.toISOString();
  } catch (e) {
    console.error('Error parsing date:', e);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);
    return futureDate.toISOString();
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, game } = await req.json();

    console.log(`Scrape action: ${action}, game: ${game}`);

    switch (action) {
      case 'scrape_countdown': {
        // Scrape from gengamer.in countdown sites
        const url = game === 'genshin_impact' ? GENSHIN_COUNTDOWN_URL : HSR_COUNTDOWN_URL;
        const data = await scrapeGengamerSite(url, game);
        
        if (!data) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'No se pudo obtener datos del sitio'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          data,
          message: `Datos obtenidos de ${url}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'scrape_and_sync': {
        // Scrape data and sync to database
        const url = game === 'genshin_impact' ? GENSHIN_COUNTDOWN_URL : HSR_COUNTDOWN_URL;
        const scrapedData = await scrapeGengamerSite(url, game);
        
        if (!scrapedData) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'No se pudo obtener datos del sitio'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const results = {
          version: null as any,
          banner: null as any,
          errors: [] as string[]
        };
        
        // Parse release date
        const releaseDate = parseReleaseDateToISO(scrapedData.releaseDate);
        const endDate = new Date(releaseDate);
        endDate.setDate(endDate.getDate() + 21); // Banners typically last 21 days
        
        // Upsert version
        if (scrapedData.version) {
          const { data: versionData, error: versionError } = await supabase
            .from('game_versions')
            .upsert({
              game: game,
              version_number: scrapedData.version,
              release_date: releaseDate,
              description: `Versión ${scrapedData.version} - ${scrapedData.featuredCharacters}`
            }, { 
              onConflict: 'game,version_number',
              ignoreDuplicates: false 
            })
            .select();
            
          if (versionError) {
            console.error('Error upserting version:', versionError);
            results.errors.push(`Error en versión: ${versionError.message}`);
          } else {
            results.version = versionData;
          }
        }
        
        // Upsert banner
        if (scrapedData.featuredCharacters) {
          const bannerName = `${scrapedData.version} - ${scrapedData.featuredCharacters}`;
          const { data: bannerData, error: bannerError } = await supabase
            .from('banners')
            .upsert({
              game: game,
              name: bannerName,
              banner_type: 'character',
              featured_character: scrapedData.featuredCharacters,
              start_date: releaseDate,
              end_date: endDate.toISOString(),
              image_url: scrapedData.imageUrl,
              rarity: 5
            }, { 
              onConflict: 'game,name',
              ignoreDuplicates: false 
            })
            .select();
            
          if (bannerError) {
            console.error('Error upserting banner:', bannerError);
            results.errors.push(`Error en banner: ${bannerError.message}`);
          } else {
            results.banner = bannerData;
          }
        }
        
        return new Response(JSON.stringify({ 
          success: results.errors.length === 0,
          data: {
            scraped: scrapedData,
            synced: results
          },
          message: results.errors.length === 0 
            ? `Sincronizado: Versión ${scrapedData.version}, Banner: ${scrapedData.featuredCharacters}`
            : `Sincronización parcial con errores`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'scrape_both_games': {
        // Scrape both games at once
        const [genshinData, hsrData] = await Promise.all([
          scrapeGengamerSite(GENSHIN_COUNTDOWN_URL, 'genshin_impact'),
          scrapeGengamerSite(HSR_COUNTDOWN_URL, 'honkai_star_rail')
        ]);
        
        return new Response(JSON.stringify({ 
          success: true,
          data: {
            genshin_impact: genshinData,
            honkai_star_rail: hsrData
          },
          message: 'Datos obtenidos de ambos juegos'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Acción desconocida. Acciones disponibles: scrape_countdown, scrape_and_sync, scrape_both_games' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error in scrape-game-data:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
