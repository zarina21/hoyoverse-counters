import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Eurogamer for Genshin, Gengamer for HSR
const GENSHIN_EUROGAMER_URL = 'https://www.eurogamer.net/genshin-impact-next-banner-current-list-all-history-9026';
const HSR_COUNTDOWN_URL = 'https://hsr-countdown.gengamer.in/';

interface ScrapedBannerData {
  version: string;
  bannerTitle: string;
  featuredCharacters: string[];
  releaseDate: string;
  imageUrl: string | null;
  game: 'genshin_impact' | 'honkai_star_rail';
  bannerType: 'character' | 'weapon';
  endDate?: string;
}

interface EurogamerScrapedData {
  currentBanners: ScrapedBannerData[];
  nextBanners: ScrapedBannerData[];
  currentWeaponBanner: ScrapedBannerData | null;
  nextWeaponBanner: ScrapedBannerData | null;
}

// Character image URLs - manually maintained for accuracy
const CHARACTER_IMAGES: Record<string, string> = {
  // Genshin Impact
  'varesa': 'https://static.wikia.nocookie.net/gensin-impact/images/8/8c/Varesa_Card.png',
  'xilonen': 'https://static.wikia.nocookie.net/gensin-impact/images/d/d5/Xilonen_Card.png',
  'mavuika': 'https://static.wikia.nocookie.net/gensin-impact/images/a/a5/Mavuika_Card.png',
  'citlali': 'https://static.wikia.nocookie.net/gensin-impact/images/c/c5/Citlali_Card.png',
  'durin': 'https://static.wikia.nocookie.net/gensin-impact/images/d/d0/Durin_Card.png',
  'venti': 'https://static.wikia.nocookie.net/gensin-impact/images/7/76/Venti_Card.png',
  'jahoda': 'https://static.wikia.nocookie.net/gensin-impact/images/j/ja/Jahoda_Card.png',
  // Honkai Star Rail
  'the dahlia': 'https://static.wikia.nocookie.net/houkai-star-rail/images/5/5d/Character_The_Dahlia_Card.png',
  'anaxa': 'https://static.wikia.nocookie.net/houkai-star-rail/images/a/a5/Character_Anaxa_Card.png',
  'firefly': 'https://static.wikia.nocookie.net/houkai-star-rail/images/f/f8/Character_Firefly_Card.png',
};

async function scrapeEurogamerGenshin(): Promise<EurogamerScrapedData | null> {
  try {
    console.log(`Scraping Eurogamer for Genshin banners...`);
    const response = await fetch(GENSHIN_EUROGAMER_URL);
    const html = await response.text();
    
    const result: EurogamerScrapedData = {
      currentBanners: [],
      nextBanners: [],
      currentWeaponBanner: null,
      nextWeaponBanner: null
    };
    
    // Extract version from text like "Phase 2 of version 6.2"
    const versionMatch = html.match(/version\s+(\d+\.\d+)/i);
    const version = versionMatch ? versionMatch[1] : '';
    console.log(`Detected version: ${version}`);
    
    // Find current character banners section
    // Look for "current Banners in Genshin Impact feature" text
    const currentBannersMatch = html.match(/current Banners in Genshin Impact feature[^<]*?<strong>([^<]+)<\/strong>[^<]*?<strong>([^<]+)<\/strong>/i);
    
    if (currentBannersMatch) {
      const char1 = currentBannersMatch[1].trim();
      const char2 = currentBannersMatch[2].trim();
      console.log(`Current characters found: ${char1}, ${char2}`);
      
      // Extract end date - look for "end on Tuesday 23rd December" pattern
      const endDateMatch = html.match(/end on (\w+day \d+(?:st|nd|rd|th) \w+)/i);
      let endDate = '';
      if (endDateMatch) {
        endDate = parseEurogamerDateToISO(endDateMatch[1], true); // allowPast for end dates
        console.log(`Current banners end date: ${endDate}`);
      }
      
      // Calculate start date (approximately 3 weeks before end)
      const endDateObj = endDate ? new Date(endDate) : new Date();
      const startDateObj = new Date(endDateObj);
      startDateObj.setDate(startDateObj.getDate() - 21);
      
      for (const char of [char1, char2]) {
        result.currentBanners.push({
          version,
          bannerTitle: `${version} Phase 1 - ${char}`,
          featuredCharacters: [char],
          releaseDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          imageUrl: getCharacterImage(char),
          game: 'genshin_impact',
          bannerType: 'character'
        });
      }
    }
    
    // Find next character banners section
    // Look for text like "Varesa and Xilonen are on the next Banners"
    const nextBannersMatch = html.match(/<strong>([^<]+)<\/strong>\s+and\s+<strong>([^<]+)<\/strong>\s+are on the next Banners/i);
    
    if (nextBannersMatch) {
      const char1 = nextBannersMatch[1].trim();
      const char2 = nextBannersMatch[2].trim();
      console.log(`Next characters found: ${char1}, ${char2}`);
      
      // Find "set to be released on Wednesday 3rd December" pattern
      const releaseDateMatch = html.match(/set to be released on (\w+day \d+(?:st|nd|rd|th) \w+)/i);
      let releaseDate = '';
      if (releaseDateMatch) {
        releaseDate = parseEurogamerDateToISO(releaseDateMatch[1]);
        console.log(`Next banners release date: ${releaseDate}`);
      }
      
      // End date is approximately 3 weeks after start
      const startDateObj = releaseDate ? new Date(releaseDate) : new Date();
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + 21);
      
      for (const char of [char1, char2]) {
        result.nextBanners.push({
          version,
          bannerTitle: `${version} Phase 2 - ${char}`,
          featuredCharacters: [char],
          releaseDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          imageUrl: getCharacterImage(char),
          game: 'genshin_impact',
          bannerType: 'character'
        });
      }
    }
    
    // Extract current weapon banner
    // Look for "5-Star weapons on the current weapon Banner"
    const currentWeaponsMatch = html.match(/5-Star weapons[^<]*?current weapon Banner[^<]*?<li>([^<]+)<\/li>[^<]*?<li>([^<]+)<\/li>/is);
    if (currentWeaponsMatch || html.includes('current Epitome Invocation Banner')) {
      // Try to find weapon names
      const weaponPattern = /<li>([^<]+\((?:sword|bow|claymore|polearm|catalyst)\)[^<]*)<\/li>/gi;
      const weapons: string[] = [];
      let match;
      
      // Find the weapons section
      const weaponSection = html.match(/Current Epitome Invocation Banner[\s\S]*?5-Star weapons[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
      if (weaponSection) {
        while ((match = weaponPattern.exec(weaponSection[1])) !== null) {
          weapons.push(match[1].trim());
        }
      }
      
      if (weapons.length > 0) {
        console.log(`Current weapons found: ${weapons.join(', ')}`);
        
        const endDateMatch = html.match(/current Epitome Invocation Banner runs until[^<]*?<strong>([^<]+)<\/strong>/i);
        let endDate = '';
        if (endDateMatch) {
          endDate = parseEurogamerDateToISO(endDateMatch[1]);
        }
        
        const endDateObj = endDate ? new Date(endDate) : new Date();
        const startDateObj = new Date(endDateObj);
        startDateObj.setDate(startDateObj.getDate() - 21);
        
        result.currentWeaponBanner = {
          version,
          bannerTitle: `${version} Phase 1 - Weapons`,
          featuredCharacters: weapons,
          releaseDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          imageUrl: null,
          game: 'genshin_impact',
          bannerType: 'weapon'
        };
      }
    }
    
    // Extract next weapon banner info
    const nextWeaponsMatch = html.match(/next boosted weapons in Phase 2[\s\S]*?<li>([^<]+)<\/li>[\s\S]*?<li>([^<]+)<\/li>/i);
    if (nextWeaponsMatch) {
      const weapon1 = nextWeaponsMatch[1].trim();
      const weapon2 = nextWeaponsMatch[2].trim();
      console.log(`Next weapons found: ${weapon1}, ${weapon2}`);
      
      // Use the next banner release date
      const releaseDateMatch = html.match(/set to be released on (\w+day \d+(?:st|nd|rd|th) \w+)/i);
      let releaseDate = '';
      if (releaseDateMatch) {
        releaseDate = parseEurogamerDateToISO(releaseDateMatch[1]);
      }
      
      const startDateObj = releaseDate ? new Date(releaseDate) : new Date();
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + 21);
      
      result.nextWeaponBanner = {
        version,
        bannerTitle: `${version} Phase 2 - Weapons`,
        featuredCharacters: [weapon1, weapon2],
        releaseDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        imageUrl: null,
        game: 'genshin_impact',
        bannerType: 'weapon'
      };
    }
    
    console.log(`Eurogamer scrape complete:`, {
      currentBanners: result.currentBanners.length,
      nextBanners: result.nextBanners.length,
      hasCurrentWeapon: !!result.currentWeaponBanner,
      hasNextWeapon: !!result.nextWeaponBanner
    });
    
    return result;
  } catch (error) {
    console.error('Error scraping Eurogamer:', error);
    return null;
  }
}

function parseEurogamerDateToISO(dateStr: string, allowPast: boolean = false): string {
  try {
    // Parse "Tuesday 23rd December" or "Wednesday 3rd December"
    const match = dateStr.match(/(\w+day)\s+(\d+)(?:st|nd|rd|th)\s+(\w+)/i);
    if (!match) {
      console.log(`Could not parse date: ${dateStr}`);
      return new Date().toISOString();
    }
    
    const [, , day, month] = match;
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    
    let date = new Date(year, monthIndex, parseInt(day), 10, 0, 0); // 10:00 server time
    
    // For end dates (allowPast=true), we keep current year even if date passed
    // For future dates (allowPast=false), if date is more than 2 months in the past, use next year
    if (!allowPast) {
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      if (date < twoMonthsAgo) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
    
    return date.toISOString();
  } catch (e) {
    console.error('Error parsing Eurogamer date:', e);
    return new Date().toISOString();
  }
}

async function scrapeGengamerSite(url: string, game: 'genshin_impact' | 'honkai_star_rail'): Promise<ScrapedBannerData | null> {
  try {
    console.log(`Scraping ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract version and title from H1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1Text = h1Match ? h1Match[1].trim() : '';
    
    const versionMatch = h1Text.match(/(\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : '';
    
    // Extract featured characters from H2
    const h2Match = html.match(/<h2[^>]*>.*?<strong[^>]*>([^<]+)<\/strong>/i);
    let featuredText = h2Match ? h2Match[1].trim() : '';
    featuredText = featuredText.replace(/\s*Banner\s*Countdown\s*/i, '').trim();
    
    const characters = featuredText
      .split(/\s+(?:and|y|&)\s+|,\s*/i)
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    console.log(`Parsed characters: ${JSON.stringify(characters)}`);
    
    // Extract release date
    const releaseDateMatch = html.match(/<p[^>]*id="display-time[^"]*"[^>]*>[^<]*Release Date[^:]*:\s*([A-Za-z]+,\s*[A-Za-z]+\s+\d+\s+at\s+\d+:\d+\s+[AP]M\s+[A-Z]+)/i);
    let releaseDate = '';
    
    if (releaseDateMatch) {
      releaseDate = releaseDateMatch[1].trim();
    } else {
      const hiddenMatch = html.match(/is set to release on ([A-Za-z]+ \d+, \d+)/i);
      if (hiddenMatch) {
        releaseDate = hiddenMatch[1].trim();
      }
    }
    
    // Extract background image URL
    const bgImageMatch = html.match(/id="bg-imageHome"[^>]*style="[^"]*url\('([^']+)'\)/i);
    const imageUrl = bgImageMatch ? bgImageMatch[1] : null;
    
    console.log(`Scraped data for ${game}:`, { version, characters, releaseDate, imageUrl });
    
    return {
      version,
      bannerTitle: h1Text,
      featuredCharacters: characters,
      releaseDate,
      imageUrl,
      game,
      bannerType: 'character'
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

function parseReleaseDateToISO(dateStr: string): string {
  try {
    const match = dateStr.match(/(\w+),\s+(\w+)\s+(\d+)\s+at\s+(\d+):(\d+)\s+(AM|PM)\s+(\w+)/i);
    if (!match) {
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

function getCharacterImage(characterName: string): string | null {
  const normalized = characterName.toLowerCase().trim();
  return CHARACTER_IMAGES[normalized] || null;
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
        if (game === 'genshin_impact') {
          // Use Eurogamer for Genshin
          const data = await scrapeEurogamerGenshin();
          if (!data) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'No se pudo obtener datos de Eurogamer'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            data,
            message: `Datos obtenidos de Eurogamer: ${data.currentBanners.length} banners actuales, ${data.nextBanners.length} próximos`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Use Gengamer for HSR
          const data = await scrapeGengamerSite(HSR_COUNTDOWN_URL, game);
          
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
            message: `Datos obtenidos de Gengamer`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'scrape_and_sync': {
        if (game === 'genshin_impact') {
          // Use Eurogamer for Genshin
          const scrapedData = await scrapeEurogamerGenshin();
          
          if (!scrapedData) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'No se pudo obtener datos de Eurogamer'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const results = {
            bannersCreated: 0,
            bannersUpdated: 0,
            errors: [] as string[]
          };
          
          // Process current character banners
          for (const banner of scrapedData.currentBanners) {
            const bannerName = banner.bannerTitle;
            const char = banner.featuredCharacters[0];
            
            console.log(`Syncing current banner: ${bannerName}`);
            
            const { error } = await supabase
              .from('banners')
              .upsert({
                game: 'genshin_impact',
                name: bannerName,
                banner_type: 'character',
                featured_character: char,
                start_date: banner.releaseDate,
                end_date: banner.endDate,
                image_url: banner.imageUrl,
                rarity: 5
              }, { 
                onConflict: 'game,name',
                ignoreDuplicates: false 
              });
              
            if (error) {
              console.error(`Error upserting banner ${bannerName}:`, error);
              results.errors.push(`Error en ${bannerName}: ${error.message}`);
            } else {
              results.bannersCreated++;
            }
          }
          
          // Process next character banners
          for (const banner of scrapedData.nextBanners) {
            const bannerName = banner.bannerTitle;
            const char = banner.featuredCharacters[0];
            
            console.log(`Syncing next banner: ${bannerName}`);
            
            const { error } = await supabase
              .from('banners')
              .upsert({
                game: 'genshin_impact',
                name: bannerName,
                banner_type: 'character',
                featured_character: char,
                start_date: banner.releaseDate,
                end_date: banner.endDate,
                image_url: banner.imageUrl,
                rarity: 5
              }, { 
                onConflict: 'game,name',
                ignoreDuplicates: false 
              });
              
            if (error) {
              console.error(`Error upserting banner ${bannerName}:`, error);
              results.errors.push(`Error en ${bannerName}: ${error.message}`);
            } else {
              results.bannersCreated++;
            }
          }
          
          // Process current weapon banner
          if (scrapedData.currentWeaponBanner) {
            const banner = scrapedData.currentWeaponBanner;
            const bannerName = banner.bannerTitle;
            
            console.log(`Syncing current weapon banner: ${bannerName}`);
            
            const { error } = await supabase
              .from('banners')
              .upsert({
                game: 'genshin_impact',
                name: bannerName,
                banner_type: 'weapon',
                featured_character: banner.featuredCharacters.join(', '),
                start_date: banner.releaseDate,
                end_date: banner.endDate,
                image_url: null,
                rarity: 5
              }, { 
                onConflict: 'game,name',
                ignoreDuplicates: false 
              });
              
            if (error) {
              results.errors.push(`Error en ${bannerName}: ${error.message}`);
            } else {
              results.bannersCreated++;
            }
          }
          
          // Process next weapon banner
          if (scrapedData.nextWeaponBanner) {
            const banner = scrapedData.nextWeaponBanner;
            const bannerName = banner.bannerTitle;
            
            console.log(`Syncing next weapon banner: ${bannerName}`);
            
            const { error } = await supabase
              .from('banners')
              .upsert({
                game: 'genshin_impact',
                name: bannerName,
                banner_type: 'weapon',
                featured_character: banner.featuredCharacters.join(', '),
                start_date: banner.releaseDate,
                end_date: banner.endDate,
                image_url: null,
                rarity: 5
              }, { 
                onConflict: 'game,name',
                ignoreDuplicates: false 
              });
              
            if (error) {
              results.errors.push(`Error en ${bannerName}: ${error.message}`);
            } else {
              results.bannersCreated++;
            }
          }
          
          return new Response(JSON.stringify({ 
            success: results.errors.length === 0,
            data: {
              scraped: scrapedData,
              synced: results
            },
            message: results.errors.length === 0 
              ? `Sincronizado desde Eurogamer: ${results.bannersCreated} banners (personajes + armas)`
              : `Sincronización parcial con errores`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } else {
          // HSR - use Gengamer
          const scrapedData = await scrapeGengamerSite(HSR_COUNTDOWN_URL, game);
          
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
            banners: [] as any[],
            errors: [] as string[]
          };
          
          const upcomingReleaseDate = parseReleaseDateToISO(scrapedData.releaseDate);
          
          // Upsert version
          if (scrapedData.version) {
            const { data: versionData, error: versionError } = await supabase
              .from('game_versions')
              .upsert({
                game: game,
                version_number: scrapedData.version,
                release_date: upcomingReleaseDate,
                description: `Versión ${scrapedData.version} - ${scrapedData.featuredCharacters.join(' y ')}`
              }, { 
                onConflict: 'game,version_number',
                ignoreDuplicates: false 
              })
              .select();
              
            if (versionError) {
              results.errors.push(`Error en versión: ${versionError.message}`);
            } else {
              results.version = versionData;
            }
          }
          
          // Create banners
          const characters = scrapedData.featuredCharacters;
          const now = new Date();
          
          for (let i = 0; i < characters.length; i++) {
            const character = characters[i];
            const isFirstBanner = i === 0;
            
            let startDate: Date;
            let endDate: Date;
            
            if (isFirstBanner) {
              startDate = new Date(now);
              startDate.setDate(startDate.getDate() - 7);
              endDate = new Date(upcomingReleaseDate);
            } else {
              startDate = new Date(upcomingReleaseDate);
              endDate = new Date(upcomingReleaseDate);
              endDate.setDate(endDate.getDate() + 21);
            }
            
            const bannerName = `${scrapedData.version} - ${character}`;
            const characterImage = getCharacterImage(character) || scrapedData.imageUrl;
            
            console.log(`Creating banner: ${bannerName}`);
            
            const { data: bannerData, error: bannerError } = await supabase
              .from('banners')
              .upsert({
                game: game,
                name: bannerName,
                banner_type: 'character',
                featured_character: character,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                image_url: characterImage,
                rarity: 5
              }, { 
                onConflict: 'game,name',
                ignoreDuplicates: false 
              })
              .select();
              
            if (bannerError) {
              results.errors.push(`Error en banner ${character}: ${bannerError.message}`);
            } else {
              results.banners.push(bannerData);
            }
          }
          
          return new Response(JSON.stringify({ 
            success: results.errors.length === 0,
            data: {
              scraped: scrapedData,
              synced: results
            },
            message: results.errors.length === 0 
              ? `Sincronizado: Versión ${scrapedData.version}, ${results.banners.length} banners`
              : `Sincronización parcial con errores`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'scrape_both_games': {
        const [genshinData, hsrData] = await Promise.all([
          scrapeEurogamerGenshin(),
          scrapeGengamerSite(HSR_COUNTDOWN_URL, 'honkai_star_rail')
        ]);
        
        return new Response(JSON.stringify({ 
          success: true,
          data: {
            genshin_impact: genshinData,
            honkai_star_rail: hsrData
          },
          message: 'Datos obtenidos de ambos juegos (Genshin desde Eurogamer, HSR desde Gengamer)'
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
