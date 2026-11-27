/**
 * Player-to-player transfer market, backed by `public.market_listings`.
 *
 * A listing stores a snapshot of the seller's card, so the buyer can import it
 * even after the seller has removed it from their own club. Sales settle
 * through the seller's own profile row: when a listing is bought the seller
 * sees it in "My listings" and claims the proceeds (price minus the 5% market
 * tax) on their next visit. That keeps every coins write inside the owner's RLS
 * policy instead of crediting another account from the buyer's browser.
 */
import { getSupabase } from './supabase';

export const MARKET_TAX = 0.05;

export type MarketListing = {
  id: string;
  sellerId: string;
  sellerClub: string;
  cardId: string;
  card: Record<string, unknown>;
  price: number;
  status: 'open' | 'sold';
  buyerId: string | null;
  claimed: boolean;
  createdAt: number;
};

type ListingRow = {
  id?: string | null;
  seller_id?: string | null;
  seller_club?: string | null;
  card_id?: string | null;
  card_snapshot?: unknown;
  price?: number | null;
  status?: string | null;
  buyer_id?: string | null;
  claimed?: boolean | null;
  created_at?: string | null;
};

const LISTING_COLUMNS = 'id, seller_id, seller_club, card_id, card_snapshot, price, status, buyer_id, claimed, created_at';

/** Missing table / RLS problems are reported once instead of on every refresh. */
let reported = false;
const report = (message: string, error: unknown): void => {
  if (reported) return;
  reported = true;
  console.warn(message, error);
};

const toListing = (row: ListingRow): MarketListing => ({
  id: String(row.id ?? ''),
  sellerId: String(row.seller_id ?? ''),
  sellerClub: String(row.seller_club ?? 'CLUB'),
  cardId: String(row.card_id ?? ''),
  card: row.card_snapshot && typeof row.card_snapshot === 'object' ? (row.card_snapshot as Record<string, unknown>) : {},
  price: Math.max(0, Math.floor(Number(row.price) || 0)),
  status: row.status === 'sold' ? 'sold' : 'open',
  buyerId: typeof row.buyer_id === 'string' ? row.buyer_id : null,
  claimed: Boolean(row.claimed),
  createdAt: row.created_at ? Date.parse(row.created_at) : 0,
});

/** Net coins a seller receives after the 5% market tax. */
export const marketPayout = (price: number): number => Math.max(0, Math.floor(price * (1 - MARKET_TAX)));

export async function fetchOpenListings(): Promise<MarketListing[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('market_listings')
      .select(LISTING_COLUMNS)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(120);
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map((row) => toListing(row as ListingRow));
  } catch (error) {
    report('[market] Could not load listings. Did you run the market_listings SQL?', error);
    return [];
  }
}

/** Every listing the manager has opened, plus sold ones whose payout is unclaimed. */
export async function fetchMyListings(userId: string): Promise<MarketListing[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('market_listings')
      .select(LISTING_COLUMNS)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map((row) => toListing(row as ListingRow));
  } catch (error) {
    report('[market] Could not load your listings. Did you run the market_listings SQL?', error);
    return [];
  }
}

export async function createListing(input: {
  sellerId: string;
  sellerClub: string;
  price: number;
  card: Record<string, unknown>;
  cardId: string;
}): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('market_listings').insert({
      seller_id: input.sellerId,
      seller_club: input.sellerClub,
      card_id: input.cardId,
      card_snapshot: input.card,
      price: Math.max(1, Math.floor(input.price)),
      status: 'open',
    });
    if (error) throw error;
    return true;
  } catch (error) {
    report('[market] Could not create the listing. Did you run the market_listings SQL?', error);
    return false;
  }
}

export async function cancelListing(listingId: string, sellerId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('market_listings')
      .delete()
      .eq('id', listingId)
      .eq('seller_id', sellerId)
      .eq('status', 'open')
      .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    report('[market] Could not cancel the listing.', error);
    return false;
  }
}

/** Claims an open listing. The guarded update makes two buyers race safely. */
export async function buyListing(listingId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const user = await client.auth.getUser();
    const buyerId = user.data.user?.id;
    if (!buyerId) return false;
    const { data, error } = await client
      .from('market_listings')
      .update({ status: 'sold', buyer_id: buyerId, sold_at: new Date().toISOString(), claimed: false })
      .eq('id', listingId)
      .eq('status', 'open')
      .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    report('[market] Could not buy the listing.', error);
    return false;
  }
}

/** Marks a sold listing as paid out so the seller cannot claim it twice. */
export async function claimSale(listingId: string, sellerId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('market_listings')
      .update({ claimed: true })
      .eq('id', listingId)
      .eq('seller_id', sellerId)
      .eq('status', 'sold')
      .eq('claimed', false)
      .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    report('[market] Could not claim the sale proceeds.', error);
    return false;
  }
}

export const marketService = {
  isRemote: true,
  open: fetchOpenListings,
  mine: fetchMyListings,
  create: createListing,
  cancel: cancelListing,
  buy: buyListing,
  claim: claimSale,
};
