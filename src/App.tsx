import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BadgeCheck,
  Box,
  ChevronRight,
  CircleHelp,
  Coins,
  Crosshair,
  Crown,
  Filter,
  Gem,
  Grid2X2,
  LayoutGrid,
  LockKeyhole,
  Medal,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Star,
  Store,
  Swords,
  Target,
  Trophy,
  Zap,
  UserRound,
  Users,
  X,
} from 'lucide-react';

type Page = 'squad' | 'store' | 'club' | 'arena' | 'profile';
type Tier = 'Bronze' | 'Gold' | 'Star' | 'Icon';
type Role = 'AWPer' | 'Entry' | 'IGL' | 'Rifler' | 'Lurker';
type Perk = 'Tactical Genius' | 'Aim Coach' | 'Scout Master';
type Avatar = 'falcon' | 'wolf' | 'visor' | 'tiger' | 'ghost' | 'sentinel';
type PlayerCard = {
  id: string;
  name: string;
  team: string;
  country: string;
  role: Role;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
  tier: Tier;
};
type OwnedCard = PlayerCard & { instanceId: string };
type Profile = { nickname: string; teamName: string; avatar: Avatar; perk: Perk };
type SaveData = { profile: Profile; coins: number; owned: OwnedCard[]; squad: Record<Role, string>; page: Page; newCardIds: string[]; managerXp: number };
type PackCard = OwnedCard & { revealed?: boolean };

const roles: Role[] = ['Entry', 'AWPer', 'IGL', 'Rifler', 'Lurker'];
const tiers: Tier[] = ['Bronze', 'Gold', 'Star', 'Icon'];
const tierConfig: Record<Tier, { color: string; soft: string; price: number; sell: number; subtitle: string }> = {
  Bronze: { color: '#a9784a', soft: 'rgba(169,120,74,.14)', price: 500, sell: 100, subtitle: 'Rising talent' },
  Gold: { color: '#f5c451', soft: 'rgba(245,196,81,.14)', price: 1500, sell: 400, subtitle: 'Established star' },
  Star: { color: '#d98cff', soft: 'rgba(217,140,255,.14)', price: 0, sell: 1500, subtitle: 'Elite performer' },
  Icon: { color: '#55e8ef', soft: 'rgba(85,232,239,.14)', price: 0, sell: 4000, subtitle: 'Major legend' },
};
const perkDetails: Record<Perk, string> = {
  'Tactical Genius': '+3 Team Chemistry',
  'Aim Coach': '+2 Aim to all players',
  'Scout Master': '+15% Coins from Quick Sell',
};
const avatarDetails: Record<Avatar, { label: string; icon: string; color: string }> = {
  falcon: { label: 'Falcon', icon: 'F', color: '#f97316' },
  wolf: { label: 'Wolf', icon: 'W', color: '#a78bfa' },
  visor: { label: 'Visor', icon: 'V', color: '#22d3ee' },
  tiger: { label: 'Tiger', icon: 'T', color: '#fbbf24' },
  ghost: { label: 'Ghost', icon: 'G', color: '#94a3b8' },
  sentinel: { label: 'Sentinel', icon: 'S', color: '#34d399' },
};

const playerSeed: Array<[string, string, string, Role, number, Tier]> = [
  ['exit', 'Imperial', 'BR', 'Entry', 70, 'Bronze'], ['STYKO', 'GamerLegion', 'SK', 'Rifler', 71, 'Bronze'], ['sdy', 'Monte', 'UA', 'IGL', 71, 'Bronze'], ['Krad', 'BetBoom', 'RU', 'Entry', 72, 'Bronze'], ['Jerry', 'PARIVISION', 'RU', 'IGL', 72, 'Bronze'], ['zorte', 'BetBoom', 'RU', 'AWPer', 73, 'Bronze'], ['JDC', 'BIG', 'DE', 'Lurker', 73, 'Bronze'], ['siuhy', 'MOUZ NXT', 'PL', 'IGL', 74, 'Bronze'], ['regali', '9INE', 'RO', 'AWPer', 74, 'Bronze'], ['prosus', 'BIG', 'DE', 'Entry', 75, 'Bronze'], ['arT', 'MIBR', 'BR', 'IGL', 75, 'Bronze'], ['saffee', 'FURIA', 'BR', 'AWPer', 76, 'Bronze'], ['dumau', 'Legacy', 'BR', 'Rifler', 76, 'Bronze'], ['latto', 'Legacy', 'BR', 'Lurker', 76, 'Bronze'], ['skullz', 'paiN', 'BR', 'Rifler', 76, 'Bronze'],
  ['Techno4K', 'The MongolZ', 'MN', 'Rifler', 77, 'Gold'], ['910', 'The MongolZ', 'MN', 'IGL', 78, 'Gold'], ['jL', 'NAVI', 'LT', 'Entry', 80, 'Gold'], ['Aleksib', 'NAVI', 'FI', 'IGL', 79, 'Gold'], ['karrigan', 'FaZe', 'DK', 'IGL', 77, 'Gold'], ['w0nderful', 'NAVI', 'UA', 'AWPer', 83, 'Gold'], ['frozen', 'FaZe', 'SK', 'Rifler', 82, 'Gold'], ['NertZ', 'HEROIC', 'IL', 'Lurker', 81, 'Gold'], ['EliGE', 'FaZe', 'US', 'Rifler', 81, 'Gold'], ['Twistzz', 'Liquid', 'CA', 'Rifler', 82, 'Gold'], ['huNter-', 'G2', 'BA', 'Entry', 83, 'Gold'], ['HooXi', 'G2', 'DK', 'IGL', 77, 'Gold'], ['rain', 'FaZe', 'NO', 'Entry', 80, 'Gold'], ['torzsi', 'MOUZ', 'HU', 'AWPer', 80, 'Gold'], ['Jimpphat', 'MOUZ', 'FI', 'Lurker', 82, 'Gold'],
  ['Senzu', 'The MongolZ', 'MN', 'AWPer', 85, 'Star'], ['bLitz', 'The MongolZ', 'MN', 'IGL', 86, 'Star'], ['NiKo', 'Falcons', 'BA', 'Rifler', 89, 'Star'], ['ropz', 'FaZe', 'EE', 'Lurker', 88, 'Star'], ['sh1ro', 'Spirit', 'RU', 'AWPer', 88, 'Star'], ['broky', 'FaZe', 'LV', 'AWPer', 87, 'Star'], ['Spinx', 'Vitality', 'IL', 'Rifler', 86, 'Star'], ['flameZ', 'Vitality', 'IL', 'Entry', 85, 'Star'], ['xertioN', 'MOUZ', 'IL', 'Entry', 85, 'Star'], ['stavn', 'Astralis', 'DK', 'Lurker', 86, 'Star'],
  ['donk', 'Spirit', 'RU', 'Entry', 95, 'Icon'], ['ZywOo', 'Vitality', 'FR', 'AWPer', 96, 'Icon'], ['m0NESY', 'G2', 'RU', 'AWPer', 94, 'Icon'], ['Prime s1mple', 'NAVI', 'UA', 'AWPer', 96, 'Icon'], ['device', 'Astralis', 'DK', 'AWPer', 91, 'Icon'],
];

const database: PlayerCard[] = playerSeed.map(([name, team, country, role, ovr, tier], index) => ({
  id: `player-${index + 1}`,
  name, team, country, role, ovr, tier,
  aim: Math.min(99, ovr + (index % 5) - 2),
  rfl: Math.min(99, ovr + ((index * 3) % 5) - 2),
  sns: Math.min(99, ovr + ((index * 2) % 5) - 2),
  clt: Math.min(99, ovr + ((index * 4) % 5) - 2),
}));

const starterIds = database.filter((card) => card.tier === 'Bronze').slice(0, 5).map((card) => card.id);
const emptySquad: Record<Role, string> = { Entry: '', AWPer: '', IGL: '', Rifler: '', Lurker: '' };

const createStarterCards = (): OwnedCard[] => {
  const bronzeByRole = roles.map((role) => database.filter((card) => card.tier === 'Bronze' && card.role === role));
  return bronzeByRole.map((options, index) => {
    const card = options[Math.floor(Math.random() * options.length)] ?? database.find((item) => item.id === starterIds[index])!;
    return { ...card, instanceId: `starter-${index}-${card.id}` };
  });
};
const createProfile = (): Profile => ({ nickname: '', teamName: 'The MongolZ', avatar: 'falcon', perk: 'Tactical Genius' });
const randomId = (): string => Math.random().toString(36).slice(2, 10);
const getPackTier = (pack: Tier): Tier => {
  const roll = Math.random() * 100;
  if (pack === 'Bronze') return roll < 85 ? 'Bronze' : 'Gold';
  if (pack === 'Gold') return roll < 70 ? 'Gold' : roll < 95 ? 'Star' : 'Icon';
  return roll < 50 ? 'Star' : 'Icon';
};
const makePackCard = (packTier: Tier): PackCard => {
  const tier = getPackTier(packTier);
  const options = database.filter((card) => card.tier === tier);
  const card = options[Math.floor(Math.random() * options.length)];
  return { ...card, instanceId: `${randomId()}-${card.id}`, revealed: false };
};

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile>(createProfile);
  const [coins, setCoins] = useState(2500);
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [squad, setSquad] = useState<Record<Role, string>>(emptySquad);
  const [page, setPage] = useState<Page>('squad');
  const [showCreation, setShowCreation] = useState(false);
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [newCardIds, setNewCardIds] = useState<string[]>([]);
  const [managerXp, setManagerXp] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('cs2-ultimate-team-save');
    if (saved) {
      const data = JSON.parse(saved) as SaveData;
      setProfile(data.profile); setCoins(data.coins); setOwned(data.owned); setSquad(data.squad); setPage(data.page); setNewCardIds(data.newCardIds ?? []); setManagerXp(data.managerXp ?? 0);
    } else setShowCreation(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || showCreation) return;
    const data: SaveData = { profile, coins, owned, squad, page, newCardIds, managerXp };
    localStorage.setItem('cs2-ultimate-team-save', JSON.stringify(data));
  }, [hydrated, showCreation, profile, coins, owned, squad, page, newCardIds, managerXp]);

  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timeout); }, [toast]);

  const squadCards = roles.map((role) => owned.find((card) => card.instanceId === squad[role])).filter((card): card is OwnedCard => Boolean(card));
  const teamRating = squadCards.length ? Math.round(squadCards.reduce((sum, card) => sum + card.ovr, 0) / squadCards.length) : 0;
  const chemistry = calculateChemistry(squadCards, profile.perk);
  const openCreation = (nextProfile: Profile): void => {
    const starters = createStarterCards();
    const nextSquad = { ...emptySquad };
    starters.forEach((card) => { nextSquad[card.role] = card.instanceId; });
    setProfile(nextProfile); setOwned(starters); setSquad(nextSquad); setShowCreation(false); setToast('Starter squad assembled. Welcome to Ultimate Team.');
  };
  const resetProfile = (): void => { localStorage.removeItem('cs2-ultimate-team-save'); setProfile(createProfile()); setCoins(2500); setOwned([]); setSquad(emptySquad); setNewCardIds([]); setManagerXp(0); setPage('squad'); setShowCreation(true); setPack(null); };
  const quickSell = (card: OwnedCard): void => {
    const multiplier = profile.perk === 'Scout Master' ? 1.15 : 1;
    const value = Math.round(tierConfig[card.tier].sell * multiplier);
    setCoins((current) => current + value); setOwned((current) => current.filter((item) => item.instanceId !== card.instanceId));
    setSquad((current) => Object.fromEntries(Object.entries(current).map(([role, id]) => [role, id === card.instanceId ? '' : id])) as Record<Role, string>);
    setToast(`${card.name} sold for ${value.toLocaleString()} coins`);
  };
  const purchasePack = (packTier: Tier, price: number): void => {
    if (coins < price) return;
    const generated = [0, 1, 2].map(() => makePackCard(packTier));
    const cardsForClub = generated.map((card) => { const copy = { ...card }; delete copy.revealed; return copy; });
    setCoins((current) => current - price);
    setOwned((current) => [...current, ...cardsForClub]);
    setNewCardIds((current) => [...current, ...cardsForClub.map((card) => card.instanceId)]);
    setPack(generated);
    setToast('Pack secured. All 3 cards are now in My Club.');
  }; 
  const awardArenaWin = (reward: number, xp: number): void => { setCoins((current) => current + reward); setManagerXp((current) => current + xp); setToast(`Victory reward: +${reward.toLocaleString()} coins · +${xp} XP`); };

  if (!hydrated) return null;
  return <div className="ultimate-app min-h-screen bg-[#0f172a] text-slate-200">
    <Sidebar page={page} setPage={setPage} profile={profile} />
    <main className="ultimate-main">
      <Header profile={profile} coins={coins} onReset={resetProfile} />
      <div className="ultimate-content">
        {page === 'squad' && <SquadPage owned={owned} squad={squad} setSquad={setSquad} teamRating={teamRating} chemistry={chemistry} profile={profile} onGoClub={() => setPage('club')} />}
        {page === 'store' && <StorePage coins={coins} onBuyPack={purchasePack} />}
        {page === 'club' && <ClubPage owned={owned} squad={squad} setSquad={setSquad} newCardIds={newCardIds} onSell={quickSell} />}
        {page === 'arena' && <ArenaPage teamRating={teamRating} chemistry={chemistry} perk={profile.perk} onWin={awardArenaWin} />}
        {page === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} managerXp={managerXp} />}
      </div>
    </main>
    {showCreation && <CreationModal onComplete={openCreation} />}
    {pack && <PackOverlay pack={pack} onClose={() => setPack(null)} onReveal={(instanceId) => setPack((current) => current?.map((card) => card.instanceId === instanceId ? { ...card, revealed: true } : card) ?? null)} onRevealAll={() => setPack((current) => current?.map((card) => ({ ...card, revealed: true })) ?? null)} onContinue={() => { setPack(null); setPage('club'); }} />}
    {toast && <div className="toast"><BadgeCheck size={17} /> {toast}</div>}
  </div>;
}

function Sidebar({ page, setPage, profile }: { page: Page; setPage: (page: Page) => void; profile: Profile }) {
  const items: Array<{ id: Page; label: string; icon: typeof Users; note?: string }> = [
    { id: 'squad', label: 'My Squad', icon: Users, note: 'LINEUP' }, { id: 'store', label: 'Store / Packs', icon: Store, note: 'PACKS' }, { id: 'club', label: 'My Club', icon: LayoutGrid, note: 'COLLECTION' }, { id: 'arena', label: 'Play Arena', icon: Swords, note: 'STEP 2' }, { id: 'profile', label: 'Profile', icon: UserRound, note: 'MANAGER' },
  ];
  return <aside className="ut-sidebar"><div className="ut-logo"><div className="ut-logo-icon"><Crosshair size={19} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="manager-mini"><div className="avatar-circle" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div><strong>{profile.nickname || 'New Manager'}</strong><span>{profile.teamName}</span></div></div><div className="sidebar-label">MAIN MENU</div><nav>{items.map(({ id, label, icon: Icon, note }) => <button key={id} className={`ut-nav ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span><small>{note}</small></button>)}</nav><div className="sidebar-bottom"><div className="season-card"><Sparkles size={15} className="text-orange-400" /><div><strong>Season 01</strong><span>Road to the Major</span></div></div><div className="sidebar-version">ULTIMATE TEAM · 2026</div></div></aside>;
}

function Header({ profile, coins, onReset }: { profile: Profile; coins: number; onReset: () => void }) {
  return <header className="ut-header"><div className="mobile-title">CS2 <span>ULTIMATE TEAM</span></div><div className="header-spacer" /><div className="header-manager"><div className="avatar-circle small" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div className="header-manager-name"><span>MANAGER</span><strong>{profile.nickname || 'New Manager'}</strong></div></div><div className="header-team"><span>TEAM</span><strong>{profile.teamName}</strong></div><div className="coin-balance"><Coins size={16} /><div><span>COINS</span><strong>{coins.toLocaleString()}</strong></div></div><button className="reset-profile" onClick={onReset}><RotateCcw size={14} /> Reset Profile</button></header>;
}

function SquadPage({ owned, squad, setSquad, teamRating, chemistry, profile, onGoClub }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; teamRating: number; chemistry: number; profile: Profile; onGoClub: () => void }) {
  return <><PageTitle eyebrow="MY CLUB / ACTIVE LINEUP" title="My Squad" subtitle="Build your strongest five and chase the perfect chemistry." action={<button className="outline-button" onClick={onGoClub}><Grid2X2 size={15} /> Browse Club</button>} /><div className="squad-hero"><div className="squad-hero-copy"><div className="eyebrow orange">ACTIVE SQUAD</div><h2>{profile.teamName}</h2><p>Five roles. One server. Make every card count.</p><div className="squad-stat-row"><div><span>TEAM OVR</span><strong>{teamRating || '--'}</strong></div><div><span>CHEMISTRY</span><strong className="green-text">{chemistry}/100</strong></div><div><span>CARDS</span><strong>{owned.length}</strong></div></div></div><div className="squad-emblem"><Trophy size={42} /><span>TMZ</span></div></div><div className="section-row"><div><div className="eyebrow">STARTING FIVE</div><h3>Formation 1-1-1-1-1</h3></div><div className="chem-meter"><span>CHEMISTRY</span><div><i style={{ width: `${chemistry}%` }} /></div></div></div><div className="squad-grid">{roles.map((role) => <SquadSlot key={role} role={role} card={owned.find((item) => item.instanceId === squad[role])} onGoClub={onGoClub} onRemove={() => setSquad({ ...squad, [role]: '' })} />)}</div><div className="squad-tip"><Sparkles size={16} /><span><strong>Squad tip:</strong> Same-team links and shared nationalities increase chemistry. Add a player from The MongolZ to unlock a strong green link.</span></div></>;
}

function SquadSlot({ role, card, onGoClub, onRemove }: { role: Role; card?: OwnedCard; onGoClub: () => void; onRemove: () => void }) {
  return <div className={`squad-slot ${card ? 'filled' : ''}`}>{card ? <><button className="remove-slot" onClick={onRemove}><X size={13} /></button><FutCard card={card} compact /></> : <button className="empty-slot" onClick={onGoClub}><div className="plus-mark">+</div><strong>{role}</strong><span>ADD PLAYER</span></button>}<div className="slot-label">{role}</div></div>;
}

function FutCard({ card, compact = false, onClick, locked = false, isNew = false }: { card: PlayerCard; compact?: boolean; onClick?: () => void; locked?: boolean; isNew?: boolean }) {
  const config = tierConfig[card.tier];
  return <button className={`fut-card tier-${card.tier.toLowerCase()} ${compact ? 'compact' : ''} ${locked ? 'locked' : ''}`} onClick={onClick} style={{ '--tier-color': config.color, '--tier-soft': config.soft } as React.CSSProperties}><div className="card-shine" />{isNew && <span className="new-card-badge">NEW</span>}<div className="card-top"><span className="card-ovr">{locked ? '?' : card.ovr}</span><span className="card-role">{card.role}</span><div className="card-rarity-icon">{card.tier === 'Icon' ? <Crown size={13} /> : card.tier === 'Star' ? <Star size={13} /> : <Medal size={13} />}</div></div><div className="card-portrait">{locked ? <LockKeyhole size={compact ? 25 : 34} /> : <><span className="country-flag">{countryFlag(card.country)}</span><small>{card.team}</small></>}</div><div className="card-name">{locked ? 'UNOWNED' : card.name}</div><div className="card-meta"><span>{countryFlag(card.country)} {card.country}</span><span>{card.tier}</span></div><div className="card-stats"><span><b>{locked ? '--' : card.aim}</b> AIM</span><span><b>{locked ? '--' : card.rfl}</b> RFL</span><span><b>{locked ? '--' : card.sns}</b> SNS</span><span><b>{locked ? '--' : card.clt}</b> CLT</span></div></button>;
}

function StorePage({ coins, onBuyPack }: { coins: number; onBuyPack: (tier: Tier, price: number) => void }) {
  return <><PageTitle eyebrow="THE MARKETPLACE" title="Store / Packs" subtitle="Turn coins into firepower. Every pack contains three player cards." action={<div className="coin-pill"><Coins size={15} /> {coins.toLocaleString()} Coins</div>} /><div className="store-banner"><div className="store-banner-glow" /><div><div className="eyebrow orange">LIMITED DROP · SEASON 01</div><h2>Road to the Major</h2><p>Open packs. Build chemistry. Become untouchable.</p></div><div className="store-banner-icon"><Gem size={38} /></div></div><div className="section-row store-heading"><div><div className="eyebrow">PACKS</div><h3>Choose your drop</h3></div><span className="muted-note"><CircleHelp size={14} /> All packs contain 3 cards · saved instantly</span></div><div className="pack-grid"><PackProduct tier="Bronze" price={500} description="A reliable starting point for your club." odds="85% Bronze · 15% Gold" onBuy={() => onBuyPack('Bronze', 500)} disabled={coins < 500} /><PackProduct tier="Gold" price={1500} description="Solid tier-one talent with a chance at stardom." odds="70% Gold · 25% Star · 5% Icon" onBuy={() => onBuyPack('Gold', 1500)} disabled={coins < 1500} featured /><PackProduct tier="Icon" price={5000} description="Only the biggest names from the biggest stage." odds="50% Star · 50% Icon" onBuy={() => onBuyPack('Icon', 5000)} disabled={coins < 5000} /></div></>;
}

function PackProduct({ tier, price, description, odds, onBuy, disabled, featured = false }: { tier: Tier; price: number; description: string; odds: string; onBuy: () => void; disabled: boolean; featured?: boolean }) { const config = tierConfig[tier]; return <div className={`pack-product ${featured ? 'featured' : ''}`} style={{ '--pack-color': config.color, '--pack-soft': config.soft } as React.CSSProperties}>{featured && <div className="featured-label">MOST POPULAR</div>}<div className="pack-art"><div className="pack-glow" /><div className="pack-symbol">{tier === 'Bronze' ? <Medal size={37} /> : tier === 'Gold' ? <Trophy size={37} /> : <Crown size={37} />}</div><strong>{tier === 'Icon' ? 'MAJOR' : tier.toUpperCase()}</strong><span>PLAYER PACK</span></div><div className="pack-copy"><div className="pack-title-row"><h3>{tier === 'Icon' ? 'Major Legend Pack' : `${tier} Pack`}</h3><span>{tierConfig[tier].subtitle}</span></div><p>{description}</p><div className="pack-odds"><span>DROP RATES</span><strong>{odds}</strong></div><button className="buy-button" disabled={disabled} onClick={onBuy}><Coins size={15} /> {price.toLocaleString()} <span>BUY PACK</span></button></div></div>; }

function ClubPage({ owned, squad, setSquad, newCardIds, onSell }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; newCardIds: string[]; onSell: (card: OwnedCard) => void }) {
  const [view, setView] = useState<'owned' | 'catalog'>('owned');
  const [tierFilter, setTierFilter] = useState<Tier | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [query, setQuery] = useState('');
  const filtered = owned.filter((card) => (tierFilter === 'All' || card.tier === tierFilter) && (roleFilter === 'All' || card.role === roleFilter) && card.name.toLowerCase().includes(query.toLowerCase()));
  const addToSquad = (card: OwnedCard): void => { if (Object.values(squad).includes(card.instanceId)) return; setSquad({ ...squad, [card.role]: card.instanceId }); };
  const ownedIds = new Set(owned.map((card) => card.id));
  return <><PageTitle eyebrow="YOUR COLLECTION" title="My Club" subtitle={view === 'owned' ? `${owned.length} player cards collected across four tiers.` : 'Explore every player available in the 45-card database.'} action={<div className="club-tabs"><button className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>My Owned Cards <span>{owned.length}</span></button><button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>All Players Catalog <span>45</span></button></div>} />{view === 'owned' ? <><div className="club-toolbar"><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player..." /></div><div className="filter-group"><Filter size={14} className="text-slate-500" /><select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as Tier | 'All')}><option value="All">All Tiers</option>{tiers.map((tier) => <option key={tier}>{tier}</option>)}</select><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | 'All')}><option value="All">All Roles</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></div></div>{filtered.length ? <div className="club-grid">{filtered.map((card) => <div className="club-item" key={card.instanceId}><FutCard card={card} isNew={newCardIds.includes(card.instanceId)} onClick={() => addToSquad(card)} /><div className="club-actions"><button onClick={() => addToSquad(card)} className={Object.values(squad).includes(card.instanceId) ? 'active' : ''}>{Object.values(squad).includes(card.instanceId) ? <BadgeCheck size={14} /> : <Shield size={14} />} {Object.values(squad).includes(card.instanceId) ? 'In Squad' : `Use as ${card.role}`}</button><button onClick={() => onSell(card)} className="sell-button"><Coins size={13} /> {tierConfig[card.tier].sell}</button></div></div>)}</div> : <div className="empty-club"><Box size={32} /><h3>No cards found</h3><p>Try another filter or open a pack to grow your club.</p></div>}</> : <Catalog ownedIds={ownedIds} newCardIds={newCardIds} />}</>;
}

function Catalog({ ownedIds, newCardIds }: { ownedIds: Set<string>; newCardIds: string[] }) {
  const catalogTiers: Tier[] = ['Icon', 'Star', 'Gold', 'Bronze'];
  return <div className="catalog-view"><div className="catalog-note"><Gem size={15} /> Owned cards are shown in full color. Locked cards reveal their tier and player details once collected.</div>{catalogTiers.map((tier) => <section className="catalog-section" key={tier}><div className="catalog-heading"><div><div className="eyebrow" style={{ color: tierConfig[tier].color }}>{tier === 'Icon' ? 'ICON / MVP' : tier.toUpperCase()}</div><h3>{tier === 'Icon' ? 'Major legends' : tierConfig[tier].subtitle}</h3></div><span>{database.filter((card) => card.tier === tier && ownedIds.has(card.id)).length} / {database.filter((card) => card.tier === tier).length} collected</span></div><div className="catalog-grid">{database.filter((card) => card.tier === tier).map((card) => { const owned = ownedIds.has(card.id); const fresh = newCardIds.some((id) => owned && id.endsWith(`-${card.id}`)); return <div className="catalog-item" key={card.id}><FutCard card={card} locked={!owned} isNew={fresh} /><div className={`catalog-status ${owned ? 'owned' : ''}`}>{owned ? <><BadgeCheck size={12} /> Collected</> : <><LockKeyhole size={12} /> Not packed</>}</div></div>; })}</div></section>)}</div>;
}

function ArenaPage({ teamRating, chemistry, perk, onWin }: { teamRating: number; chemistry: number; perk: Perk; onWin: (reward: number, xp: number) => void }) {
  const [opponentId, setOpponentId] = useState('tier2');
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ us: 0, them: 0 });
  const [feed, setFeed] = useState<string[]>(['R1 [Freeze] Both teams are ready. Choose your pace.']);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const opponents = [{ id: 'tier2', name: 'Tier 2 Mix', ovr: 72, reward: 500, color: 'bronze' }, { id: 'g2faze', name: 'G2 / FaZe', ovr: 82, reward: 1000, color: 'gold' }, { id: 'vitality', name: 'Vitality / Spirit', ovr: 88, reward: 2000, color: 'star' }];
  const opponent = opponents.find((item) => item.id === opponentId) ?? opponents[0];
  const startMatch = (): void => { setLive(true); setPaused(false); setResult(null); setRound(1); setScore({ us: 0, them: 0 }); setFeed(['R1 [Freeze] Pistol round begins. Both teams purchase.']); };
  const finish = (won: boolean): void => { setLive(false); setResult(won ? 'win' : 'loss'); if (won) onWin(opponent.reward, 100 + opponent.reward / 10); };
  const playRound = useCallback((): void => {
    if (!live || paused || result) return;
    const perkBonus = perk === 'Tactical Genius' ? 0.04 : perk === 'Aim Coach' ? 0.025 : 0;
    const winChance = Math.max(0.25, Math.min(0.78, 0.5 + (teamRating - opponent.ovr) / 180 + chemistry / 700 + perkBonus));
    const won = Math.random() < winChance;
    const nextScore = { us: score.us + (won ? 1 : 0), them: score.them + (won ? 0 : 1) };
    const names = ['910', 'bLitz', 'Senzu', 'Techno4K', 'mzinho'];
    const line = won ? `R${round} [${names[Math.floor(Math.random() * names.length)]}] opens the site and closes the round. ${nextScore.us}:${nextScore.them}.` : `R${round} [${opponent.name}] punish the setup and win the retake. ${nextScore.us}:${nextScore.them}.`;
    setScore(nextScore); setRound((current) => current + 1); setFeed((current) => [line, ...current].slice(0, 8));
    if (nextScore.us >= 13 || nextScore.them >= 13) finish(nextScore.us >= 13);
  }, [live, paused, result, perk, teamRating, chemistry, opponent, round, score]);
  useEffect(() => { if (!live || paused || result) return; const timer = window.setInterval(playRound, speed === 2 ? 750 : 1500); return () => window.clearInterval(timer); }, [live, paused, result, speed, playRound]);
  if (live || result) return <ArenaLive opponent={opponent} score={score} round={round} feed={feed} paused={paused} speed={speed} setSpeed={setSpeed} onPause={() => setPaused((current) => !current)} onRound={playRound} onSkip={() => finish(true)} result={result} onExit={() => { setLive(false); setResult(null); }} />;
  return <><PageTitle eyebrow="COMPETITIVE PLAY" title="Play Arena" subtitle="Win tactical matches to earn coins and Manager XP." /><div className="arena-lobby"><div className="arena-lobby-art"><div className="arena-radar"><div className="radar-ring one" /><div className="radar-ring two" /><div className="radar-cross" /><div className="arena-dot one" /><div className="arena-dot two" /><div className="arena-dot three" /></div><div className="arena-lobby-emblem"><Swords size={34} /></div></div><div className="arena-lobby-copy"><div className="eyebrow orange">ARENA MATCHMAKING</div><h2>Choose your opponent.</h2><p>Your active five, chemistry, and manager perk influence every round. Win the BO1 to collect the listed coin reward.</p><div className="arena-stat-line"><span><small>TEAM OVR</small><strong>{teamRating || '--'}</strong></span><span><small>CHEMISTRY</small><strong>{chemistry}</strong></span><span><small>XP ON WIN</small><strong>+{100 + opponent.reward / 10}</strong></span></div><div className="opponent-list">{opponents.map((item) => <button key={item.id} className={`opponent-option ${opponentId === item.id ? 'selected' : ''}`} onClick={() => setOpponentId(item.id)}><span className={`opponent-tier ${item.color}`}>{item.ovr}</span><span><strong>{item.name}</strong><small>{item.ovr} OVR AI opponent</small></span><b><Coins size={13} /> +{item.reward.toLocaleString()}</b></button>)}</div><button className="primary-button arena-start" onClick={startMatch}><Play size={16} fill="currentColor" /> START MATCH</button></div></div></>;
}

function ArenaLive({ opponent, score, round, feed, paused, speed, setSpeed, onPause, onRound, onSkip, result, onExit }: { opponent: { name: string; ovr: number; reward: number }; score: { us: number; them: number }; round: number; feed: string[]; paused: boolean; speed: number; setSpeed: (speed: number) => void; onPause: () => void; onRound: () => void; onSkip: () => void; result: 'win' | 'loss' | null; onExit: () => void }) {
  const dots = Array.from({ length: 10 }, (_, index) => ({ id: index, x: 10 + ((index * 31 + round * 7) % 80), y: 15 + ((index * 47 + round * 5) % 72), team: index < 5 ? 'ct' : 't' }));
  return <div className="arena-live-page"><div className="arena-live-head"><div><div className="eyebrow orange">LIVE ARENA · ROUND {Math.min(round, 24)}</div><div className="live-score"><strong>THE MONGOLZ</strong><b>{score.us}</b><span>:</span><b className="enemy-score">{score.them}</b><strong>{opponent.name.toUpperCase()}</strong></div></div><div className="arena-live-meta"><span><small>ALIVE</small><b>5 — 5</b></span><span><small>AI OVR</small><b>{opponent.ovr}</b></span></div></div><div className="arena-live-grid"><div><div className="tactical-map"><div className="map-grid" />{dots.map((dot) => <div className={`tactical-dot ${dot.team}`} style={{ left: `${dot.x}%`, top: `${dot.y}%` }} key={dot.id}><span>{dot.team === 'ct' ? ['910', 'bLitz', 'Senzu', 'Techno4K', 'mzinho'][dot.id] : ['AI-1', 'AI-2', 'AI-3', 'AI-4', 'AI-5'][dot.id - 5]}</span></div>)}<div className="site-marker a">A</div><div className="site-marker b">B</div><span className="map-caption">ANCIENT · TACTICAL VIEW</span></div><div className="arena-controls"><button onClick={onPause} className="control-button">{paused ? <Play size={14} fill="currentColor" /> : <span>Ⅱ</span>} {paused ? 'Play' : 'Pause'}</button><button onClick={() => setSpeed(speed === 2 ? 1 : 2)} className={`control-button ${speed === 2 ? 'selected' : ''}`}><Zap size={14} /> 2x Speed</button><button onClick={onRound} className="control-button">Skip Round <ChevronRight size={14} /></button><button onClick={onSkip} className="control-button accent">Skip to Result <Trophy size={14} /></button></div></div><div className="arena-feed"><div className="feed-title"><span>ROUND FEED</span><i>LIVE</i></div>{feed.map((line, index) => <div className={`arena-feed-line ${index === 0 ? 'latest' : ''}`} key={`${line}-${index}`}><span />{line}</div>)}</div></div>{result && <div className="arena-result"><div className={result === 'win' ? 'result-icon win' : 'result-icon loss'}>{result === 'win' ? <Trophy size={28} /> : <Shield size={28} />}</div><div className="eyebrow">MATCH COMPLETE</div><h2>{result === 'win' ? 'VICTORY' : 'DEFEAT'}</h2><p>{result === 'win' ? `You beat ${opponent.name} and earned ${opponent.reward.toLocaleString()} coins.` : `${opponent.name} takes the server this time. Rebuild and try again.`}</p><button className="primary-button" onClick={onExit}>Return to Arena <ChevronRight size={15} /></button></div>}</div>;
}

function ProfilePage({ profile, setProfile, managerXp }: { profile: Profile; setProfile: (profile: Profile) => void; managerXp: number }) { const [nickname, setNickname] = useState(profile.nickname); const [teamName, setTeamName] = useState(profile.teamName); const save = (): void => setProfile({ ...profile, nickname: nickname.trim() || 'Manager', teamName: teamName.trim() || 'The MongolZ' }); return <><PageTitle eyebrow="MANAGER HUB" title="Profile" subtitle="Shape the identity behind your Ultimate Team." /><div className="profile-layout"><div className="profile-card"><div className="profile-portrait" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><h2>{profile.nickname || 'New Manager'}</h2><p>{profile.teamName}</p><div className="profile-level"><span>SEASON LEVEL</span><strong>{Math.floor(managerXp / 1000) + 1}</strong><div><i style={{ width: `${Math.min(100, managerXp % 1000 / 10)}%` }} /></div><small>{managerXp} / {(Math.floor(managerXp / 1000) + 1) * 1000} XP</small></div></div><div className="profile-settings"><div className="settings-block"><div className="eyebrow">MANAGER DETAILS</div><div className="field-grid"><label><span>Manager Nickname</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={22} /></label><label><span>Team Name</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} maxLength={22} /></label></div></div><div className="settings-block"><div className="eyebrow">CHOOSE AVATAR</div><div className="avatar-picker">{(Object.keys(avatarDetails) as Avatar[]).map((avatar) => <button key={avatar} onClick={() => setProfile({ ...profile, avatar })} className={profile.avatar === avatar ? 'selected' : ''} style={{ '--avatar-color': avatarDetails[avatar].color } as React.CSSProperties}><span>{avatarDetails[avatar].icon}</span><small>{avatarDetails[avatar].label}</small></button>)}</div></div><div className="settings-block"><div className="eyebrow">ACTIVE TEAM PERK</div><div className="perk-picker">{(['Tactical Genius', 'Aim Coach', 'Scout Master'] as Perk[]).map((perk) => <button key={perk} onClick={() => setProfile({ ...profile, perk })} className={profile.perk === perk ? 'selected' : ''}><span className="perk-icon">{perk === 'Tactical Genius' ? <Target size={17} /> : perk === 'Aim Coach' ? <Crosshair size={17} /> : <Search size={17} />}</span><span><strong>{perk}</strong><small>{perkDetails[perk]}</small></span>{profile.perk === perk && <BadgeCheck size={16} />}</button>)}</div></div><button onClick={save} className="primary-button profile-save"><Pencil size={14} /> Save Profile</button></div></div></>; }

function CreationModal({ onComplete }: { onComplete: (profile: Profile) => void }) { const [profile, setProfile] = useState<Profile>(createProfile); const complete = (): void => onComplete({ ...profile, nickname: profile.nickname.trim() || 'Coach' }); return <div className="creation-screen"><div className="creation-panel"><div className="creation-intro"><div className="ut-logo centered"><div className="ut-logo-icon"><Crosshair size={22} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="eyebrow orange">WELCOME TO SEASON 01</div><h1>Build your legacy.</h1><p>Assemble a squad from the biggest names in Counter-Strike and take your club to the Major.</p><div className="intro-points"><span><Sparkles size={15} /> 45 real player cards</span><span><Trophy size={15} /> 4 card tiers</span><span><Coins size={15} /> 2,500 starter coins</span></div></div><div className="creation-form"><div className="eyebrow">MANAGER SETUP · 01</div><h2>Who is calling the shots?</h2><label className="creation-label"><span>Manager Nickname</span><input autoFocus value={profile.nickname} onChange={(event) => setProfile({ ...profile, nickname: event.target.value })} placeholder="Enter your nickname" maxLength={22} /></label><label className="creation-label"><span>Team Name</span><input value={profile.teamName} onChange={(event) => setProfile({ ...profile, teamName: event.target.value })} maxLength={22} /></label><div className="creation-label"><span>Choose your manager avatar</span><div className="avatar-picker creation-avatars">{(Object.keys(avatarDetails) as Avatar[]).map((avatar) => <button key={avatar} onClick={() => setProfile({ ...profile, avatar })} className={profile.avatar === avatar ? 'selected' : ''} style={{ '--avatar-color': avatarDetails[avatar].color } as React.CSSProperties}><span>{avatarDetails[avatar].icon}</span><small>{avatarDetails[avatar].label}</small></button>)}</div></div><div className="creation-label"><span>Select your team perk</span><div className="perk-picker creation-perks">{(['Tactical Genius', 'Aim Coach', 'Scout Master'] as Perk[]).map((perk) => <button key={perk} onClick={() => setProfile({ ...profile, perk })} className={profile.perk === perk ? 'selected' : ''}><span className="perk-icon">{perk === 'Tactical Genius' ? <Target size={16} /> : perk === 'Aim Coach' ? <Crosshair size={16} /> : <Search size={16} />}</span><span><strong>{perk}</strong><small>{perkDetails[perk]}</small></span></button>)}</div></div><button className="primary-button creation-submit" onClick={complete}>Create manager & open starter squad <ChevronRight size={16} /></button></div></div></div>; }

function PackOverlay({ pack, onClose, onReveal, onRevealAll, onContinue }: { pack: PackCard[]; onClose: () => void; onReveal: (instanceId: string) => void; onRevealAll: () => void; onContinue: () => void }) { const revealedCount = pack.filter((card) => card.revealed).length; return <div className="pack-overlay"><div className="pack-modal"><button className="overlay-close" onClick={onClose}><X size={18} /></button><div className="eyebrow orange">PACK OPENING · SAVED TO CLUB</div><h2>Reveal your players</h2><p>Every card is already secured in My Club. Reveal them now, then review your new collection.</p><div className="pack-cards">{pack.map((card) => <div className="reveal-wrap" key={card.instanceId}>{card.revealed ? <div className="revealed-card"><FutCard card={card} isNew /><div className="revealed-actions"><span className="actioned"><BadgeCheck size={14} /> Saved to My Club</span></div></div> : <button className="face-down" onClick={() => onReveal(card.instanceId)}><div className="face-logo"><Crosshair size={30} /><span>CS2</span></div><div className="face-lines" /><span>CLICK TO REVEAL</span></button>}</div>)}</div><div className="reveal-footer"><span>{revealedCount} / 3 revealed</span>{revealedCount < 3 ? <button className="primary-button" onClick={onRevealAll}><Sparkles size={15} /> Reveal All</button> : <button className="primary-button" onClick={onContinue}>Continue to My Club <ChevronRight size={15} /></button>}</div></div></div>; }

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function countryFlag(country: string): string { const flags: Record<string, string> = { BR: '🇧🇷', SK: '🇸🇰', UA: '🇺🇦', RU: '🇷🇺', DE: '🇩🇪', PL: '🇵🇱', RO: '🇷🇴', IL: '🇮🇱', MN: '🇲🇳', LT: '🇱🇹', FI: '🇫🇮', DK: '🇩🇰', HU: '🇭🇺', EE: '🇪🇪', BA: '🇧🇦', FR: '🇫🇷', LV: '🇱🇻', NO: '🇳🇴', CA: '🇨🇦', US: '🇺🇸' }; return flags[country] ?? '🏳️'; }
function calculateChemistry(cards: OwnedCard[], perk: Perk): number { if (!cards.length) return 0; const teams = new Set(cards.map((card) => card.team)); const countries = new Set(cards.map((card) => card.country)); const links = cards.reduce((sum, card, index) => sum + cards.slice(index + 1).filter((other) => other.team === card.team || other.country === card.country).length, 0); return Math.min(100, Math.round((cards.length / 5) * 48 + Math.min(30, links * 7) + Math.max(0, teams.size === 1 ? 12 : 0) + Math.max(0, countries.size === 1 ? 8 : 0) + (perk === 'Tactical Genius' ? 3 : 0))); }

export default App;
