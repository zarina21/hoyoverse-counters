-- Create enum for game names
CREATE TYPE game_name AS ENUM ('genshin_impact', 'honkai_star_rail');

-- Create enum for banner types
CREATE TYPE banner_type AS ENUM ('character', 'weapon', 'standard');

-- Table for game versions
CREATE TABLE game_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game game_name NOT NULL,
  version_number TEXT NOT NULL,
  release_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game game_name NOT NULL,
  banner_type banner_type NOT NULL,
  name TEXT NOT NULL,
  featured_character TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  rarity INTEGER CHECK (rarity BETWEEN 4 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game game_name NOT NULL,
  event_name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  rewards TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE game_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (everyone can view)
CREATE POLICY "Anyone can view game versions" 
ON game_versions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view banners" 
ON banners FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view events" 
ON events FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_game_versions_game ON game_versions(game);
CREATE INDEX idx_game_versions_release_date ON game_versions(release_date);
CREATE INDEX idx_banners_game ON banners(game);
CREATE INDEX idx_banners_dates ON banners(start_date, end_date);
CREATE INDEX idx_events_game ON events(game);
CREATE INDEX idx_events_dates ON events(start_date, end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_game_versions_updated_at
BEFORE UPDATE ON game_versions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();