-- Add INSERT, UPDATE, DELETE policies for admin operations
-- These will be used by edge functions and future admin panel

-- Policies for banners table
CREATE POLICY "Service role can insert banners"
ON public.banners
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update banners"
ON public.banners
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete banners"
ON public.banners
FOR DELETE
TO service_role
USING (true);

-- Policies for events table
CREATE POLICY "Service role can insert events"
ON public.events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update events"
ON public.events
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete events"
ON public.events
FOR DELETE
TO service_role
USING (true);

-- Policies for game_versions table
CREATE POLICY "Service role can insert game_versions"
ON public.game_versions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update game_versions"
ON public.game_versions
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete game_versions"
ON public.game_versions
FOR DELETE
TO service_role
USING (true);