-- Add RLS policy for public access to player_stats for public players
CREATE POLICY "Public can view stats for public players"
  ON player_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_stats.player_id
        AND players.is_public = true
        AND (players.is_archived = false OR players.is_archived IS NULL)
    )
  );

-- Add RLS policy for public access to match_players for public players
CREATE POLICY "Public can view match participation for public players"
  ON match_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = match_players.player_id
        AND players.is_public = true
        AND (players.is_archived = false OR players.is_archived IS NULL)
    )
  );

-- Add RLS policy for public access to matches referenced by public player participation
CREATE POLICY "Public can view matches with public players"
  ON matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM match_players mp
      JOIN players p ON p.id = mp.player_id
      WHERE mp.match_id = matches.id
        AND p.is_public = true
        AND (p.is_archived = false OR p.is_archived IS NULL)
    )
  );

-- Add RLS policy for public access to match_player_stats for public players
CREATE POLICY "Public can view match stats for public players"
  ON match_player_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = match_player_stats.player_id
        AND players.is_public = true
        AND (players.is_archived = false OR players.is_archived IS NULL)
    )
  );