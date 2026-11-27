/**
 * Friend challenges read other real managers' clubs from `public.profiles`.
 *
 * The roster comes from their saved `active_squad` resolved against
 * `owned_cards`, so the challenge is played against the five cards they
 * actually fielded (their card levels included), not against a bot rating.
 */
import { getSupabase } from './supabase';

export type ChallengeRosterSpot = {
  role: string;
  name: string;
  team: string;
  tier: string;
  ovr: number;
};

export type ChallengeManager = {
  userId: string;
  clubName: string;
  managerName: string;
  avatar: string;
  division: number;
  xp: number;
  ovr: number;
  roster: ChallengeRosterSpot[];
};

type CardLike = {
  instanceId?: string;
  name?: string;
  team?: string;
  tier?: string;
  role?: string;
  ovr?: number;
  level?: number;
};

type ManagerRow = {
  id?: string | null;
  club_name?: string | null;
  manager_name?: string | null;
  avatar?: string | null;
  division?: number | null;
  xp?: number | null;
  active_squad?: unknown;
  owned_cards?: unknown;
};

const MANAGER_COLUMNS = 'id, club_name, manager_name, avatar, division, xp, active_squad, owned_cards';

/** Mirrors the +1..+5 level bonus used by the club screens, capped at 99. */
const levelBonus = (level?: number): number => {
  const lvl = Math.min(5, Math.max(1, Math.floor(level || 1)));
  return lvl <= 1 ? 0 : lvl === 5 ? 5 : lvl - 1;
};

let reported = false;
const report = (message: string, error: unknown): void => {
  if (reported) return;
  reported = true;
  console.warn(message, error);
};

const toManager = (row: ManagerRow): ChallengeManager => {
  const cards = Array.isArray(row.owned_cards) ? (row.owned_cards as CardLike[]) : [];
  const squad = row.active_squad && typeof row.active_squad === 'object' && !Array.isArray(row.active_squad)
    ? (row.active_squad as Record<string, unknown>)
    : {};
  const roster: ChallengeRosterSpot[] = [];
  Object.values(squad).forEach((instanceId) => {
    if (typeof instanceId !== 'string' || !instanceId) return;
    const card = cards.find((item) => item.instanceId === instanceId);
    if (!card || typeof card.name !== 'string') return;
    roster.push({
      role: typeof card.role === 'string' ? card.role : 'Rifler',
      name: card.name,
      team: typeof card.team === 'string' ? card.team : 'Free agent',
      tier: typeof card.tier === 'string' ? card.tier : 'Gold',
      ovr: Math.min(99, Math.max(1, Math.round(Number(card.ovr) || 50)) + levelBonus(Number(card.level))),
    });
  });
  const ovr = roster.length
    ? Math.max(50, Math.round(roster.reduce((sum, spot) => sum + spot.ovr, 0) / roster.length))
    : 50;
  return {
    userId: String(row.id ?? ''),
    clubName: String(row.club_name ?? 'YOUR CLUB').trim() || 'YOUR CLUB',
    managerName: String(row.manager_name ?? 'MANAGER').trim() || 'MANAGER',
    avatar: String(row.avatar ?? 'falcon'),
    division: Math.max(0, Math.floor(Number(row.division) || 0)),
    xp: Math.max(0, Math.floor(Number(row.xp) || 0)),
    ovr,
    roster,
  };
};

/** Searches real clubs by name. An empty term lists the most experienced managers. */
export async function searchManagers(term: string, excludeUserId: string | null): Promise<ChallengeManager[]> {
  const client = getSupabase();
  if (!client) return [];
  const query = term.trim();
  try {
    let request = client.from('profiles').select(MANAGER_COLUMNS).order('xp', { ascending: false }).limit(8);
    if (query) request = request.ilike('club_name', `%${query}%`);
    if (excludeUserId) request = request.neq('id', excludeUserId);
    const { data, error } = await request;
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map((row) => toManager(row as ManagerRow));
  } catch (error) {
    report('[challenge] Could not search managers. Check the profiles table and its select policy.', error);
    return [];
  }
}

export const challengeService = { search: searchManagers };
