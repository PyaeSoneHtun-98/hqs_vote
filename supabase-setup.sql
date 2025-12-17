-- Fashion Vote App - Supabase Setup Script
-- Run this in your Supabase SQL Editor

-- Create contestants table
CREATE TABLE contestants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  contestant_id UUID REFERENCES contestants(id) ON DELETE CASCADE,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for voting schedule
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  voting_start TIMESTAMP WITH TIME ZONE,
  voting_end TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings row
INSERT INTO settings (id) VALUES (1);

-- Create indexes
CREATE INDEX idx_contestants_vote_count ON contestants(vote_count DESC);
CREATE INDEX idx_votes_session ON votes(session_id);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE contestants;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- Enable RLS
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contestants
CREATE POLICY "Public Read Contestants" ON contestants FOR SELECT USING (true);

-- RLS Policies for votes
CREATE POLICY "Public Read Votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Public Insert Votes" ON votes FOR INSERT WITH CHECK (true);

-- RLS Policies for settings
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);

-- Function to increment vote count
CREATE OR REPLACE FUNCTION increment_vote(contestant_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE contestants SET vote_count = vote_count + 1 WHERE id = contestant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
