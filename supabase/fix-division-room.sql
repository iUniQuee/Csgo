-- Repair the shared Division 1 · Zone A league room.
--
-- Run this once in Supabase → SQL Editor. It is idempotent: re-running it only
-- re-creates the same policies and normalises NULL/stale room columns.
--
-- Why this is needed:
--   * With Row Level Security enabled, a missing public SELECT policy makes
--     `profiles` / `league_teams` return only silently-empty results to the
--     browser, so every manager appears alone with BOT clubs.
--   * Older accounts can carry a NULL division/zone (or an old per-zone value).
--     The app reads Division 1 as 0 and Zone A as 0, so those rows must be
--     normalised before the shared table can show them together.

begin;

-- 1. Public reads for every signed-in (and anonymous) client. The app only
--    ever writes its own rows through the owner policies in schema.sql.
alter table public.profiles enable row level security;
alter table public.league_teams enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "league teams are public" on public.league_teams;
create policy "league teams are public"
  on public.league_teams for select
  using (true);

grant select on public.profiles, public.league_teams to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.league_teams to authenticated;

-- 2. Normalise missing room fields: Division 1 is 0, Zone A is 0.
update public.profiles set division = 0 where division is null;
update public.league_teams set division = 0 where division is null;
update public.profiles set zone = 0 where zone is null;
update public.league_teams set zone = 0 where zone is null;
update public.profiles set zone = 0 where division = 0 and zone <> 0;
update public.league_teams set zone = 0 where division = 0 and zone <> 0;

-- 3. Give every registered profile a league seat, so a manager who has not
--    played since the league table shipped still appears at 0 points.
insert into public.league_teams (user_id, club_name, division, zone)
select p.id, coalesce(nullif(p.club_name, ''), 'NEW CLUB'), coalesce(p.division, 0), 0
from public.profiles p
left join public.league_teams lt on lt.user_id = p.id
where lt.user_id is null
on conflict (user_id) do nothing;

commit;

-- 4. Verify both managers resolve into the same Division 1 room.
--    MonQue and SRN should both be listed below with division = 0 / zone = 0.
select
  p.id as user_id,
  p.manager_name,
  p.club_name,
  coalesce(lt.division, p.division, 0) as division,
  coalesce(lt.zone, p.zone, 0) as zone,
  coalesce(lt.points, 0) as points,
  coalesce(lt.wins, 0) as wins,
  coalesce(lt.losses, 0) as losses
from public.profiles p
left join public.league_teams lt on lt.user_id = p.id
order by division, points desc, p.created_at;
