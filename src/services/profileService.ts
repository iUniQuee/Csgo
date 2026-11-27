/**
 * Cloud save for one manager, stored in `public.profiles`.
 *
 * The row holds the club identity, progression and the whole collection
 * (`owned_cards`, `active_squad`, `daily_quests` are JSONB), so a player can sign
 * in on another device and continue. Every call is a no-op when Supabase keys are
 * not configured, which keeps local mode working.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';

export type CloudProfile = {
  clubName: string;
  managerName: string;
  avatar: string;
  level: number;
  xp: number;
  perks: string[];
  coins: number;
  division: number;
  zone: number;
  ownedCards: unknown[];
  activeSquad: Record<string, string>;
  dailyQuests: unknown;
  /** Equipped club badge (a completed club's name), empty when none is worn. */
  clubBadge: string;
  /** Clubs whose 5/5 reward has already been claimed. */
  claimedClubs: string[];
  /** Selected crest id (see src/emblems.tsx). */
  emblem: string;
  /** Primary club accent colour as a hex string. */
  accent: string;
  updatedAt: number;
};

export type CloudProfileSave = Omit<CloudProfile, 'updatedAt'>;

type ProfileRow = {
  club_name?: string | null;
  manager_name?: string | null;
  avatar?: string | null;
  level?: number | null;
  xp?: number | null;
  perks?: unknown;
  coins?: number | null;
  division?: number | null;
  zone?: number | null;
  owned_cards?: unknown;
  active_squad?: unknown;
  daily_quests?: unknown;
  club_badge?: string | null;
  claimed_clubs?: unknown;
  emblem?: string | null;
  accent?: string | null;
  updated_at?: string | null;
};

const BASE_PROFILE_COLUMNS = 'club_name, manager_name, avatar, level, xp, perks, coins, division, zone, owned_cards, active_squad, daily_quests, updated_at';
const PROFILE_COLUMNS = `${BASE_PROFILE_COLUMNS}, club_badge, claimed_clubs, emblem, accent`;

/** Older installs may not have run the optional-column migration yet. */
const isMissingOptionalColumn = (error: unknown): boolean => {
  const candidate = error as { code?: string; message?: string; details?: string } | null;
  const message = `${candidate?.message ?? ''} ${candidate?.details ?? ''}`;
  return candidate?.code === 'PGRST204'
    || candidate?.code === '42703'
    || /could not find the '.*' column|column .* does not exist/i.test(message);
};

const number = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const text = (value: unknown, fallback = ''): string => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const record = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
};

/** Missing table / RLS problems are reported once instead of on every autosave tick. */
let reported = false;
const report = (message: string, error: unknown): void => {
  if (reported) return;
  reported = true;
  console.warn(message, error);
};

export async function loadCloudProfile(userId: string): Promise<CloudProfile | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    let result = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
    if (result.error && isMissingOptionalColumn(result.error)) {
      // Keep cloud saves working before the optional profile columns are added.
      result = await client.from('profiles').select(BASE_PROFILE_COLUMNS).eq('id', userId).maybeSingle();
    }
    const { data, error } = result;
    if (error) throw error;
    if (!data) return null;
    const row = data as ProfileRow;
    return {
      clubName: text(row.club_name, 'YOUR CLUB'),
      managerName: text(row.manager_name, 'NEW MANAGER'),
      avatar: text(row.avatar, 'falcon'),
      level: number(row.level, 1),
      xp: number(row.xp, 0),
      perks: list(row.perks).filter((perk): perk is string => typeof perk === 'string'),
      coins: number(row.coins, 2500),
      division: number(row.division, 0),
      zone: number(row.zone, 0),
      ownedCards: list(row.owned_cards),
      activeSquad: record(row.active_squad),
      dailyQuests: row.daily_quests ?? null,
      clubBadge: text(row.club_badge, ''),
      claimedClubs: list(row.claimed_clubs).filter((club): club is string => typeof club === 'string'),
      emblem: text(row.emblem, 'shield'),
      accent: text(row.accent, '#f97316'),
      updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
    };
  } catch (error) {
    report('[profiles] Could not load the cloud save. Did you run the SQL script?', error);
    return null;
  }
}

export async function saveCloudProfile(userId: string, snapshot: CloudProfileSave): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const base = {
      id: userId,
      club_name: snapshot.clubName,
      manager_name: snapshot.managerName,
      avatar: snapshot.avatar,
      level: snapshot.level,
      xp: snapshot.xp,
      perks: snapshot.perks,
      coins: snapshot.coins,
      division: snapshot.division,
      zone: snapshot.zone,
      owned_cards: snapshot.ownedCards,
      active_squad: snapshot.activeSquad,
      daily_quests: snapshot.dailyQuests,
      updated_at: new Date().toISOString(),
    };
    const full = {
      ...base,
      club_badge: snapshot.clubBadge,
      claimed_clubs: snapshot.claimedClubs,
      emblem: snapshot.emblem,
      accent: snapshot.accent,
    };
    let result = await client.from('profiles').upsert(full, { onConflict: 'id' });
    if (result.error && isMissingOptionalColumn(result.error)) {
      // Older schema: save the core club and collection rather than failing every tick.
      result = await client.from('profiles').upsert(base, { onConflict: 'id' });
    }
    if (result.error) throw result.error;
    return true;
  } catch (error) {
    report('[profiles] Could not save to the cloud. Did you run the SQL script?', error);
    return false;
  }
}

export const profileService = { isRemote: isSupabaseConfigured, load: loadCloudProfile, save: saveCloudProfile };
