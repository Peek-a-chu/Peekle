-- V13__assign_null_league_groups.sql
-- Find all users with a null league_group_id, and assign them to a dummy group or the latest group in their tier.
-- Since we can't easily write complex procedural logic in a simple SQL migration to check 'is group full' dynamically,
-- we'll create one generic 'Unassigned Recovery Group' per tier for this week, and dump all currently unassigned users into it.
-- This ensures the NOT NULL logic / group size logic in the frontend has actual groups to work with safely.

-- 1. Create a dummy group for each tier for the current season (just setting it to an arbitrary high season number like 99999 or current).
-- We'll use season_week = 999999 to represent a fallback/recovery season if needed, or better yet, just leave it as 0 to be safe.
-- Actually, the cleanest SQL-only approach is to insert a new league_group for each distinct tier that has null users.

INSERT INTO league_group (tier, season_week, created_at, updated_at)
SELECT DISTINCT league, 0, NOW(), NOW()
FROM users
WHERE league_group_id IS NULL;

-- 2. Update the users to point to these newly created groups.
-- We join the users table with the league_group table where the tier matches and season_week = 0 (our newly created ones).
UPDATE users u
JOIN league_group lg ON u.league = lg.tier AND lg.season_week = 0
SET u.league_group_id = lg.id
WHERE u.league_group_id IS NULL;
