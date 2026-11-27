import type { CSSProperties, ReactNode } from 'react';

/** The twelve club emblems available in the profile editor. */
export type EmblemId =
  | 'dragon'
  | 'eagle'
  | 'wolf'
  | 'crown'
  | 'sword'
  | 'shield'
  | 'skull'
  | 'bolt'
  | 'phoenix'
  | 'bear'
  | 'tiger'
  | 'viper';

export type EmblemDefinition = { id: EmblemId; label: string; icon: ReactNode };

export const DEFAULT_ACCENT = '#f97316';
export const EMBLEM_ACCENTS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#14b8a6', '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#e2e8f0'];

export const EMBLEMS: EmblemDefinition[] = [
  {
    id: 'dragon',
    label: 'Dragon',
    icon: <path d="M3 6l4 2 3-4 2 4 4-2-1 5 5 3-5 1-2 4-3-3-4 2 1-5-4-2 4-1z" />,
  },
  {
    id: 'eagle',
    label: 'Eagle',
    icon: <path d="M12 3l2 4 7-2-4 5 4 5-6-1-3 7-3-7-6 1 4-5-4-5 7 2z" />,
  },
  {
    id: 'wolf',
    label: 'Wolf',
    icon: <path d="M4 3l4 3h8l4-3-1 7 2 4-4 6-4-2-4 2-4-6 2-4z" />,
  },
  {
    id: 'crown',
    label: 'Crown',
    icon: <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z" />,
  },
  {
    id: 'sword',
    label: 'Sword',
    icon: <path d="M14 2h6v6L10 18l-4-4zM5 15l4 4-3 3H2v-4z" />,
  },
  {
    id: 'shield',
    label: 'Shield',
    icon: <path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5zM11 7h2v6h-2zM11 15h2v2h-2z" />,
  },
  {
    id: 'skull',
    label: 'Skull',
    icon: <path d="M12 2a8 8 0 00-8 8c0 3 1.5 5 3 6v4h3v-2h4v2h3v-4c1.5-1 3-3 3-6a8 8 0 00-8-8zM8 9a2 2 0 114 0 2 2 0 01-4 0zm4 0a2 2 0 114 0 2 2 0 01-4 0z" />,
  },
  {
    id: 'bolt',
    label: 'Bolt',
    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  },
  {
    id: 'phoenix',
    label: 'Phoenix',
    icon: <path d="M12 2c2 4 1 6 3 8 2-1 3-3 3-5 2 4 1 8-1 10l3 5-5-2-1 4-2-4-2 4-1-4-5 2 3-5C3 13 2 9 4 5c0 2 1 4 3 5 2-2 1-4 3-8z" />,
  },
  {
    id: 'bear',
    label: 'Bear',
    icon: <path d="M6 3a3 3 0 013 3h6a3 3 0 013-3 3 3 0 011 6 7 7 0 11-14 0 3 3 0 011-6zm2 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 15h6l-3 3z" />,
  },
  {
    id: 'tiger',
    label: 'Tiger',
    icon: <path d="M4 2l5 4h6l5-4-1 8 2 5-5 7-4-3-4 3-5-7 2-5zM9 10h2v2H9zm4 0h2v2h-2zM10 15h4l-2 2z" />,
  },
  {
    id: 'viper',
    label: 'Viper',
    icon: <path d="M12 2c4 0 7 3 7 7 0 3-2 5-5 5H9a2 2 0 000 4h6v4H9a6 6 0 110-12h5a1 1 0 000-2c-3 0-5-1-5-3 0-2 1.5-3 3-3z" />,
  },
];

export const emblemById = (id?: string | null): EmblemDefinition =>
  EMBLEMS.find((emblem) => emblem.id === id) ?? EMBLEMS.find((emblem) => emblem.id === 'shield') ?? EMBLEMS[0];

/** Small inline SVG club crest used in standings, scoreboards and the profile editor. */
export function TeamEmblem({ emblem, accent, size = 18, className = '' }: { emblem?: string | null; accent?: string | null; size?: number; className?: string }) {
  const design = emblemById(emblem);
  const color = accent || DEFAULT_ACCENT;
  return (
    <span
      className={`team-emblem-svg ${className}`.trim()}
      style={{ '--emblem-accent': color, width: size, height: size } as CSSProperties}
      title={`${design.label} emblem`}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={`${design.label} emblem`} fill="currentColor">
        {design.icon}
      </svg>
    </span>
  );
}
