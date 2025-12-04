-- Add unique constraints for upsert operations
ALTER TABLE public.game_versions 
ADD CONSTRAINT game_versions_game_version_unique UNIQUE (game, version_number);

ALTER TABLE public.banners 
ADD CONSTRAINT banners_game_name_unique UNIQUE (game, name);