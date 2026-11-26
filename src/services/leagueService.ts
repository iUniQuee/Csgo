/**
 * League service layer.
 *
 * One async API for manager profiles, 5-card squads (Team OVR), match results and
 * division/zone assignments. It talks to Supabase when `VITE_SUPABASE_URL` and
 * `VITE_SUPABASE_ANON_KEY` are present, and otherwise persists to localStorage so the
 * app is fully playable right now. Every Supabase failure degrades to localStorage
 * instead of throwing at the UI.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LeagueTeam, SquadCard } from '../utils/matchmakingEngine';

export type ManagerRecord = {
  id: string;
  manager: string;
  teamName: string;
  avatar?: string;
  perk?: string;
  perk2?: string;
  division: number;
  zone: number;
  zoneCount: number;
  points: number;
  ovr: number;
  squad: SquadCard[];
  updatedAt: number;
};

export type MatchRecord = {
  id: string;
  managerId: string;
  division: number;
  zone: number;
  opponentId: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  won: boolean;
  at: number;
};

export type ZoneAssignment = {
  managerId: string;
  division: number;
  zone: number;
  zoneCount: number;
};

type LocalStore = {
  managers: Record<string, ManagerRecord>;
  matches: MatchRecord[];
  assignments: Record<string, ZoneAssignment>;
};

const STORAGE_KEY = 'cs2-league-service-v1';
const MAX_LOCAL_MATCHES = 400;

export const LEAGUE_SCHEMA = `
-- Managers: one row per real player (profile + squad summary + current seat).
create table if not exists public.league_managers (
  id text primary key,
  manager text not null,
  team_name text not null,
  avatar text,
  perk text,
  perk2 text,
  division int not null default 0,
  zone int not null default 0,
  zone_count int not null default 1,
  points int not null default 0,
  ovr int not null default 50,
  squad jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Hourly match results written by the :30 league slot.
create table if not exists public.league_matches (
  id text primary key,
  manager_id text not null references public.league_managers(id) on delete cascade,
  division int not null,
  zone int not null default 0,
  opponent_id text not null,
  opponent_name text not null,
  home_score int not null,
  away_score int not null,
  won boolean not null,
  played_at timestamptz not null default now()
);

-- Division / zone seat assignments for the current day.
create table if not exists public.league_zones (
  manager_id text primary key references public.league_managers(id) on delete cascade,
  division int not null,
  zone int not null default 0,
  zone_count int not null default 1,
  assigned_at timestamptz not null default now()
);

create index if not exists league_matches_manager_idx on public.league_matches (manager_id, played_at desc);
create index if not exists league_managers_seat_idx on public.league_managers (division, zone);

alter table public.league_managers enable row level security;
alter table public.league_matches enable row level security;
alter table public.league_zones enable row level security;

create policy "league managers are readable" on public.league_managers for select using (true);
create policy "league managers are writable" on public.league_managers for insert with check (true);
create policy "league managers are updatable" on public.league_managers for update using (true);
create policy "league matches are readable" on public.league_matches for select using (true);
create policy "league matches are writable" on public.league_matches for insert with check (true);
create policy "league zones are readable" on public.league_zones for select using (true);
create policy "league zones are writable" on public.league_zones for insert with check (true);
create policy "league zones are updatable" on public.league_zones for update using (true);
`;

function readEnv(): Record<string, string | undefined> {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta?.env ?? {};
  } catch {
    return {};
  }
}

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY ?? '';

function emptyStore(): LocalStore {
  return { managers: {}, matches: [], assignments: {} };
}

export class LeagueService {
  readonly mode: 'supabase' | 'local';
  private client: SupabaseClient | null = null;

  constructor() {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      } catch {
        this.client = null;
      }
    }
    this.mode = this.client ? 'supabase' : 'local';
  }

  get isRemote(): boolean {
    return this.client !== null;
  }

  // ---------------------------------------------------------------- local store

  private readLocal(): LocalStore {
    if (typeof localStorage === 'undefined') return emptyStore();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      const parsed = JSON.parse(raw) as Partial<LocalStore>;
      return {
        managers: parsed.managers ?? {},
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        assignments: parsed.assignments ?? {},
      };
    } catch {
      return emptyStore();
    }
  }

  private writeLocal(store: LocalStore): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* storage full or unavailable: the in-memory state still drives the UI */
    }
  }

  /** Managers cached locally, e.g. to render known rivals before the first network hop. */
  localManagers(): ManagerRecord[] {
    return Object.values(this.readLocal().managers);
  }

  // ---------------------------------------------------------------- managers

  async ensureManager(record: ManagerRecord): Promise<ManagerRecord> {
    const store = this.readLocal();
    const existing = store.managers[record.id];
    const merged: ManagerRecord = { ...existing, ...record, updatedAt: Date.now() };
    store.managers[record.id] = merged;
    this.writeLocal(store);
    if (this.client) {
      try {
        await this.client.from('league_managers').upsert({
          id: merged.id,
          manager: merged.manager,
          team_name: merged.teamName,
          avatar: merged.avatar ?? null,
          perk: merged.perk ?? null,
          perk2: merged.perk2 ?? null,
          division: merged.division,
          zone: merged.zone,
          zone_count: merged.zoneCount,
          points: merged.points,
          ovr: merged.ovr,
          squad: merged.squad,
          updated_at: new Date().toISOString(),
        });
      } catch {
        /* stay on the local copy */
      }
    }
    return merged;
  }

  async updateManager(id: string, patch: Partial<ManagerRecord>): Promise<ManagerRecord | null> {
    const store = this.readLocal();
    const existing = store.managers[id];
    if (!existing) return null;
    const next: ManagerRecord = { ...existing, ...patch, id, updatedAt: Date.now() };
    return this.ensureManager(next);
  }

  async loadManagers(division: number): Promise<ManagerRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('league_managers')
          .select('*')
          .eq('division', division)
          .order('points', { ascending: false });
        if (!error && Array.isArray(data)) return data.map(fromRow);
      } catch {
        /* fall through to the local cache */
      }
    }
    return this.localManagers()
      .filter((record) => record.division === division)
      .sort((a, b) => b.points - a.points);
  }

  /** Bulk register the deterministic rival managers so the board is shareable. */
  async seedManagers(records: ManagerRecord[]): Promise<void> {
    await Promise.all(records.map((record) => this.ensureManager(record)));
  }

  // ---------------------------------------------------------------- zones

  async saveZone(team: LeagueTeam, assignment: ZoneAssignment): Promise<void> {
    const store = this.readLocal();
    store.assignments[assignment.managerId] = assignment;
    const existing = store.managers[assignment.managerId];
    if (existing) {
      store.managers[assignment.managerId] = {
        ...existing,
        division: assignment.division,
        zone: assignment.zone,
        zoneCount: assignment.zoneCount,
        points: team.points,
        ovr: team.ovr,
        updatedAt: Date.now(),
      };
    }
    this.writeLocal(store);
    if (!this.client) return;
    try {
      await this.client.from('league_zones').upsert({
        manager_id: assignment.managerId,
        division: assignment.division,
        zone: assignment.zone,
        zone_count: assignment.zoneCount,
        assigned_at: new Date().toISOString(),
      });
    } catch {
      /* local assignment remains authoritative */
    }
  }

  async loadZone(division: number, zone: number): Promise<ManagerRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('league_managers')
          .select('*')
          .eq('division', division)
          .eq('zone', zone)
          .order('points', { ascending: false });
        if (!error && Array.isArray(data)) return data.map(fromRow);
      } catch {
        /* fall through */
      }
    }
    return this.localManagers()
      .filter((record) => record.division === division && record.zone === zone)
      .sort((a, b) => b.points - a.points);
  }

  // ---------------------------------------------------------------- matches

  async recordMatch(match: MatchRecord): Promise<void> {
    const store = this.readLocal();
    store.matches = [match, ...store.matches].slice(0, MAX_LOCAL_MATCHES);
    this.writeLocal(store);
    if (!this.client) return;
    try {
      await this.client.from('league_matches').insert({
        id: match.id,
        manager_id: match.managerId,
        division: match.division,
        zone: match.zone,
        opponent_id: match.opponentId,
        opponent_name: match.opponentName,
        home_score: match.homeScore,
        away_score: match.awayScore,
        won: match.won,
        played_at: new Date(match.at).toISOString(),
      });
    } catch {
      /* local history already holds the result */
    }
  }

  async recentMatches(managerId: string, limit = 20): Promise<MatchRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('league_matches')
          .select('*')
          .eq('manager_id', managerId)
          .order('played_at', { ascending: false })
          .limit(limit);
        if (!error && Array.isArray(data)) return data.map(matchFromRow);
      } catch {
        /* fall through */
      }
    }
    return this.readLocal().matches.filter((match) => match.managerId === managerId).slice(0, limit);
  }

  /** Managers registered locally or remotely, newest first (leaderboard / scouting). */
  async snapshotManagers(): Promise<ManagerRecord[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('league_managers')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(240);
        if (!error && Array.isArray(data) && data.length) return data.map(fromRow);
      } catch {
        /* fall through */
      }
    }
    return this.localManagers().sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

type ManagerRow = {
  id: string;
  manager: string;
  team_name: string;
  avatar: string | null;
  perk: string | null;
  perk2: string | null;
  division: number;
  zone: number;
  zone_count: number;
  points: number;
  ovr: number;
  squad: SquadCard[] | null;
  updated_at: string | null;
};

const fromRow = (row: ManagerRow): ManagerRecord => ({
  id: row.id,
  manager: row.manager,
  teamName: row.team_name,
  avatar: row.avatar ?? undefined,
  perk: row.perk ?? undefined,
  perk2: row.perk2 ?? undefined,
  division: row.division ?? 0,
  zone: row.zone ?? 0,
  zoneCount: row.zone_count ?? 1,
  points: row.points ?? 0,
  ovr: row.ovr ?? 50,
  squad: Array.isArray(row.squad) ? row.squad : [],
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
});

type MatchRow = {
  id: string;
  manager_id: string;
  division: number;
  zone: number;
  opponent_id: string;
  opponent_name: string;
  home_score: number;
  away_score: number;
  won: boolean;
  played_at: string;
};

const matchFromRow = (row: MatchRow): MatchRecord => ({
  id: row.id,
  managerId: row.manager_id,
  division: row.division,
  zone: row.zone ?? 0,
  opponentId: row.opponent_id,
  opponentName: row.opponent_name,
  homeScore: row.home_score,
  awayScore: row.away_score,
  won: row.won,
  at: row.played_at ? new Date(row.played_at).getTime() : Date.now(),
});

export const leagueService = new LeagueService();
