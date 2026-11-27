-- CS2 Ultimate Team - Supabase schema
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to run more than once.

-- 1. profiles: one row per auth user, holding the club, progression and collection.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  club_name     text        not null default 'YOUR CLUB',
  manager_name  text        not null default 'NEW MANAGER',
  avatar        text        not null default 'falcon',
  level         integer     not null default 1,
  xp            integer     not null default 0,
  perks         jsonb       not null default '[]'::jsonb,
  coins         integer     not null default 2500,
  division      integer     not null default 0,
  zone          integer     not null default 0,
  owned_cards   jsonb       not null default '[]'::jsonb,
  active_squad  jsonb       not null default '{}'::jsonb,
  daily_quests  jsonb       not null default '{}'::jsonb,
  club_badge    text        not null default '',
  claimed_clubs jsonb       not null default '[]'::jsonb,
  emblem        text        not null default 'shield',
  accent        text        not null default '#f97316',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Existing installs: add the club-completion columns without dropping data.
alter table public.profiles add column if not exists club_badge text not null default '';
alter table public.profiles add column if not exists claimed_clubs jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists emblem text not null default 'shield';
alter table public.profiles add column if not exists accent text not null default '#f97316';

-- 2. league_teams: one row per real manager, the live division seat + season record.
create table if not exists public.league_teams (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  club_name   text        not null default 'NEW CLUB',
  division    integer     not null default 0,
  zone        integer     not null default 0,
  squad_ovr   integer     not null default 50,
  wins        integer     not null default 0,
  losses      integer     not null default 0,
  round_diff  integer     not null default 0,
  points      integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Zone reads order by points, then round difference.
create index if not exists league_teams_zone_rank_idx
  on public.league_teams (division, zone, points desc, round_diff desc);

-- 3. A profile row must exist as soon as somebody registers, otherwise the
--    league_teams foreign key rejects their first save.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, manager_name, club_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'NEW MANAGER'), 'YOUR CLUB')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row level security: everybody may read clubs (needed to build a division
--    table with real managers), but only the owner may write their own rows.
alter table public.profiles enable row level security;
alter table public.league_teams enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

drop policy if exists "league teams are public" on public.league_teams;
create policy "league teams are public"
  on public.league_teams for select
  using (true);

drop policy if exists "insert own league team" on public.league_teams;
create policy "insert own league team"
  on public.league_teams for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own league team" on public.league_teams;
create policy "update own league team"
  on public.league_teams for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own league team" on public.league_teams;
create policy "delete own league team"
  on public.league_teams for delete
  using (auth.uid() = user_id);

-- 5. market_listings: player-to-player transfer market. The card snapshot means
--    the buyer can import a card the seller already removed from their club.
create table if not exists public.market_listings (
  id            uuid        primary key default gen_random_uuid(),
  seller_id     uuid        not null references public.profiles (id) on delete cascade,
  seller_club   text        not null default 'CLUB',
  card_id       text        not null,
  card_snapshot jsonb       not null default '{}'::jsonb,
  price         integer     not null check (price > 0),
  status        text        not null default 'open' check (status in ('open', 'sold')),
  buyer_id      uuid        references public.profiles (id) on delete set null,
  claimed       boolean     not null default false,
  created_at    timestamptz not null default now(),
  sold_at       timestamptz
);

create index if not exists market_listings_open_idx
  on public.market_listings (status, created_at desc);
create index if not exists market_listings_seller_idx
  on public.market_listings (seller_id, status);

alter table public.market_listings enable row level security;

-- Open listings are the shop window; sellers and buyers can also read their own history.
drop policy if exists "market listings are readable" on public.market_listings;
create policy "market listings are readable"
  on public.market_listings for select
  using (status = 'open' or seller_id = auth.uid() or buyer_id = auth.uid());

drop policy if exists "insert own market listing" on public.market_listings;
create policy "insert own market listing"
  on public.market_listings for insert
  with check (auth.uid() = seller_id and status = 'open');

-- A buyer claims an open listing by writing themselves as the buyer and marking it sold.
drop policy if exists "buy open market listing" on public.market_listings;
create policy "buy open market listing"
  on public.market_listings for update
  using (status = 'open' and auth.uid() is not null)
  with check (status = 'sold' and buyer_id = auth.uid());

-- The seller keeps control of their own listings: cancel and claim the payout.
drop policy if exists "seller updates own market listing" on public.market_listings;
create policy "seller updates own market listing"
  on public.market_listings for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists "delete own open market listing" on public.market_listings;
create policy "delete own open market listing"
  on public.market_listings for delete
  using (seller_id = auth.uid() and status = 'open');

-- 6. Table privileges for the browser roles.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.league_teams to anon;
grant select, insert, update, delete on public.profiles, public.league_teams to authenticated;
grant select, insert, update, delete on public.market_listings to authenticated;
grant all on public.profiles, public.league_teams, public.market_listings to service_role;
