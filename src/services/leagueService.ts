/**
 * Live division service, backed by `public.league_teams`.
 *
 * One row per real manager. The row carries the seat (division + zone) and the
 * season record, while `profiles` carries the club identity, so a zone read can
 * embed the manager name and avatar. When Supabase is not configured every call
 * degrades to an empty result and the app keeps using its AI-only rooms.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';

export type OnlineTeamRow = {
  userId: string;
  clubName: string;
  managerName: string;
  avatar: string;
  division: number;
  zone: number;
  squadOvr: number;
  wins: number;
  losses: number;
  roundDiff: number;
  points: number;
  updatedAt: number;
};

export type MyTeamRow = {
  userId: string;
  clubName: string;
  division: number;
  zone: number;
  squadOvr: number;
  wins: number;
  losses: number;
  roundDiff: number;
  points: number;
};

export type TopClubRow = {
  rank: number;
  userId: string;
  clubName: string;
  managerName: string;
  emblem: string;
  division: number;
  teamOvr: number;
  wins: number;
  losses: number;
  roundDiff: number;
  points: number;
};

type TopClubProfile = { manager_name?: string | null; emblem?: string | null };

type TopClubRaw = {
  user_id?: string | null;
  club_name?: string | null;
  division?: number | null;
  squad_ovr?: number | null;
  wins?: number | null;
  losses?: number | null;
  round_diff?: number | null;
  points?: number | null;
  profiles?: TopClubProfile | TopClubProfile[] | null;
};

type ProfileEmbed = { manager_name?: string | null; avatar?: string | null } | null;

type TeamRow = {
  user_id?: string | null;
  club_name?: string | null;
  division?: number | null;
  zone?: number | null;
  squad_ovr?: number | null;
  wins?: number | null;
  losses?: number | null;
  round_diff?: number | null;
  points?: number | null;
  updated_at?: string | null;
  profiles?: ProfileEmbed | ProfileEmbed[];
};

const number = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const text = (value: unknown, fallback = ''): string => (typeof value === 'string' && value.trim() ? value.trim() : fallback);

/** `profiles(...)` comes back as an object, or an array on older PostgREST versions. */
const embeddedProfile = (row: TeamRow): ProfileEmbed => {
  if (Array.isArray(row.profiles)) return row.profiles[0] ?? null;
  return row.profiles ?? null;
};

/** Reported once, so a missing table does not spam the console every minute. */
let reported = false;
const report = (message: string, error: unknown): void => {
  if (reported) return;
  reported = true;
  console.warn(message, error);
};

export const leagueService = {
  /** True when the live division table is in use. */
  get isRemote(): boolean { return isSupabaseConfigured; },

  /** Every real manager seated in one division + zone, best ranked first. */
  async fetchZone(division: number, zone: number): Promise<OnlineTeamRow[]> {
    const client = getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('league_teams')
        .select('user_id, club_name, division, zone, squad_ovr, wins, losses, round_diff, points, updated_at, profiles(manager_name, avatar)')
        .eq('division', division)
        .eq('zone', zone)
        .order('points', { ascending: false })
        .order('round_diff', { ascending: false })
        .limit(16);
      if (error) throw error;
      return (data ?? []).flatMap((raw) => {
        const row = raw as TeamRow;
        const userId = text(row.user_id);
        if (!userId) return [];
        const profile = embeddedProfile(row);
        return [{
          userId,
          clubName: text(row.club_name, 'NEW CLUB'),
          managerName: text(profile?.manager_name, 'MANAGER'),
          avatar: text(profile?.avatar, 'falcon'),
          division: number(row.division),
          zone: number(row.zone),
          squadOvr: number(row.squad_ovr, 50),
          wins: number(row.wins),
          losses: number(row.losses),
          roundDiff: number(row.round_diff),
          points: number(row.points),
          updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
        }];
      });
    } catch (error) {
      report('[league_teams] Could not load the live zone. Did you run the SQL script?', error);
      return [];
    }
  },

  /**
   * Global club leaderboard: highest division first, then points, then team
   * rating (squad OVR). Joins `profiles` for the manager name and club emblem.
   */
  async fetchTopClubs(limit = 50): Promise<TopClubRow[]> {
    const client = getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('league_teams')
        .select('user_id, club_name, division, squad_ovr, wins, losses, round_diff, points, profiles(manager_name, emblem)')
        .order('division', { ascending: false })
        .order('points', { ascending: false })
        .order('squad_ovr', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).flatMap((raw, index) => {
        const row = raw as TopClubRaw;
        const userId = text(row.user_id);
        if (!userId) return [];
        const profile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null;
        return [{
          rank: index + 1,
          userId,
          clubName: text(row.club_name, 'NEW CLUB'),
          managerName: text(profile?.manager_name, 'MANAGER'),
          emblem: text(profile?.emblem, 'shield'),
          division: number(row.division),
          teamOvr: number(row.squad_ovr, 50),
          wins: number(row.wins),
          losses: number(row.losses),
          roundDiff: number(row.round_diff),
          points: number(row.points),
        }];
      });
    } catch (error) {
      report('[league_teams] Could not load the global club leaderboard. Did you run the SQL script?', error);
      return [];
    }
  },

  /** Upsert the signed-in manager's seat after every result / zone change. */
  async saveMyTeam(row: MyTeamRow): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;
    try {
      const { error } = await client.from('league_teams').upsert({
        user_id: row.userId,
        club_name: row.clubName,
        division: row.division,
        zone: row.zone,
        squad_ovr: row.squadOvr,
        wins: row.wins,
        losses: row.losses,
        round_diff: row.roundDiff,
        points: row.points,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      return true;
    } catch (error) {
      report('[league_teams] Could not save your league seat. Did you run the SQL script?', error);
      return false;
    }
  },
};
