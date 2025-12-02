import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, game, data } = await req.json();

    console.log(`Sync action: ${action}, game: ${game}`);

    switch (action) {
      case 'fetch_characters': {
        // Fetch character data from genshin.dev API
        const apiUrl = game === 'genshin_impact' 
          ? 'https://genshin.dev/api/characters'
          : null;
        
        if (!apiUrl) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'API not available for this game' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const response = await fetch(apiUrl);
        const characters = await response.json();
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: characters 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert_version': {
        const { error } = await supabase
          .from('game_versions')
          .upsert({
            game: data.game,
            version_number: data.version_number,
            release_date: data.release_date,
            description: data.description,
          }, { onConflict: 'game,version_number' });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert_banner': {
        const { error } = await supabase
          .from('banners')
          .upsert({
            id: data.id,
            game: data.game,
            name: data.name,
            banner_type: data.banner_type,
            featured_character: data.featured_character,
            start_date: data.start_date,
            end_date: data.end_date,
            image_url: data.image_url,
            rarity: data.rarity,
          });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert_event': {
        const { error } = await supabase
          .from('events')
          .upsert({
            id: data.id,
            game: data.game,
            event_name: data.event_name,
            description: data.description,
            start_date: data.start_date,
            end_date: data.end_date,
            rewards: data.rewards,
            image_url: data.image_url,
          });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_banner': {
        const { error } = await supabase
          .from('banners')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_event': {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_version': {
        const { error } = await supabase
          .from('game_versions')
          .delete()
          .eq('id', data.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Unknown action' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-game-data:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
