import type { ReactNode } from 'react';

/**
 * Compact SVG country flags used on player cards and pack walkouts.
 * Flags are intentionally simplified for a 24x16 badge, but keep the
 * recognisable field colours and charge of each country.
 */
const FLAGS: Record<string, ReactNode> = {
  AR: <><rect width="24" height="16" fill="#74acdf" /><rect y="5.3" width="24" height="5.4" fill="#fff" /><circle cx="12" cy="8" r="1.7" fill="#f6b40e" /><circle cx="12" cy="8" r=".75" fill="#85340a" /></>,
  AU: <><rect width="24" height="16" fill="#012169" /><path d="M0 0h12v8H0z" fill="#012169" /><path d="M0 0l12 8M12 0L0 8" stroke="#fff" strokeWidth="1.6" /><path d="M0 0l12 8M12 0L0 8" stroke="#c8102e" strokeWidth=".7" /><path d="M6 0v8M0 4h12" stroke="#fff" strokeWidth="2.2" /><path d="M6 0v8M0 4h12" stroke="#c8102e" strokeWidth="1" /><path d="M18 10.5l.7 2 2.1.1-1.7 1.2.6 2-1.7-1.2-1.7 1.2.6-2-1.7-1.2 2.1-.1z" fill="#fff" /></>,
  BA: <><rect width="24" height="16" fill="#002395" /><path d="M5 0h8L5 16z" fill="#fecb00" /><path d="M14 1l1.2 1.1M17 5l1.2 1.1M20 9l1.2 1.1M14 9l1.2 1.1M17 13l1.2 1.1" stroke="#fff" strokeWidth=".9" /></>,
  BR: <><rect width="24" height="16" fill="#009b3a" /><path d="M12 1.7L22 8l-10 6.3L2 8z" fill="#fedf00" /><circle cx="12" cy="8" r="3.4" fill="#002776" /><path d="M8.8 8.3c2.2-.7 4.7-.3 6.6.8" stroke="#fff" strokeWidth=".55" fill="none" /></>,
  BY: <><rect width="24" height="10" fill="#c8313e" /><rect y="10" width="24" height="6" fill="#00966e" /><path d="M2 0v10M6 0v10M10 0v10M14 0v10M18 0v10M22 0v10" stroke="#fff" strokeWidth="1.1" opacity=".8" /><path d="M1 2h4M1 5h4M1 8h4M7 2h4M7 5h4M7 8h4M13 2h4M13 5h4M13 8h4M19 2h4M19 5h4M19 8h4" stroke="#c8313e" strokeWidth="1" /></>,
  CA: <><rect width="24" height="16" fill="#fff" /><rect width="6" height="16" fill="#d80621" /><rect x="18" width="6" height="16" fill="#d80621" /><path d="M12 3.2l1 2.6 2.1-1.4-.7 2.5 2.5.1-2 1.7 1.2 2.1-2.6-.7.1 2.5-1.6-1.9-1.6 1.9.1-2.5-2.6.7 1.2-2.1-2-1.7 2.5-.1-.7-2.5 2.1 1.4z" fill="#d80621" /></>,
  CN: <><rect width="24" height="16" fill="#de2910" /><path d="M5 3.2l.7 2.1 2.2.1-1.8 1.3.7 2.1-1.8-1.3-1.8 1.3.7-2.1L2.1 5.4l2.2-.1z" fill="#ffde00" /><circle cx="10.3" cy="3.3" r=".55" fill="#ffde00" /><circle cx="12" cy="5.2" r=".55" fill="#ffde00" /><circle cx="12" cy="8" r=".55" fill="#ffde00" /><circle cx="10.3" cy="9.9" r=".55" fill="#ffde00" /></>,
  CZ: <><rect width="24" height="8" fill="#fff" /><rect y="8" width="24" height="8" fill="#d7141a" /><path d="M0 0l9 8-9 8z" fill="#11457e" /></>,
  DE: <><rect width="24" height="5.34" fill="#000" /><rect y="5.34" width="24" height="5.33" fill="#dd0000" /><rect y="10.67" width="24" height="5.33" fill="#ffce00" /></>,
  DK: <><rect width="24" height="16" fill="#c8102e" /><path d="M7 0h3v16H7zM0 6.5h24v3H0z" fill="#fff" /></>,
  EE: <><rect width="24" height="5.34" fill="#0072ce" /><rect y="5.34" width="24" height="5.33" fill="#000" /><rect y="10.67" width="24" height="5.33" fill="#fff" /></>,
  ES: <><rect width="24" height="16" fill="#aa151b" /><rect y="4" width="24" height="8" fill="#f1bf00" /><path d="M6 6h4v4H6z" fill="#aa151b" opacity=".8" /></>,
  FI: <><rect width="24" height="16" fill="#fff" /><path d="M7 0h4v16H7zM0 6h24v4H0z" fill="#002f6c" /></>,
  FR: <><rect width="8" height="16" fill="#0055a4" /><rect x="8" width="8" height="16" fill="#fff" /><rect x="16" width="8" height="16" fill="#ef4135" /></>,
  GB: <><rect width="24" height="16" fill="#012169" /><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" /><path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.5" /><path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5" /><path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.6" /></>,
  GR: <><rect width="24" height="16" fill="#0d5eaf" /><path d="M0 2h24M0 5h24M0 8h24M0 11h24M0 14h24" stroke="#fff" strokeWidth="2" /><path d="M0 0h9v9H0z" fill="#0d5eaf" /><path d="M4.5 0v9M0 4.5h9" stroke="#fff" strokeWidth="2" /></>,
  GT: <><rect width="24" height="16" fill="#4997d0" /><rect x="8" width="8" height="16" fill="#fff" /><circle cx="12" cy="8" r="2" fill="#f6c344" /><path d="M10.5 7l1.5-1 1.5 1v2l-1.5 1-1.5-1z" fill="#4b8f3a" /></>,
  HU: <><rect width="24" height="5.34" fill="#ce2939" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#477050" /></>,
  IL: <><rect width="24" height="16" fill="#fff" /><rect y="2" width="24" height="2" fill="#0038b8" /><rect y="12" width="24" height="2" fill="#0038b8" /><path d="M12 5.4l2.5 4.3h-5z" fill="none" stroke="#0038b8" strokeWidth=".8" /><path d="M12 10.6L9.5 6.3h5z" fill="none" stroke="#0038b8" strokeWidth=".8" /></>,
  KZ: <><rect width="24" height="16" fill="#00afca" /><circle cx="12" cy="8" r="2.4" fill="#fec50c" /><path d="M12 3.2v1M12 11.8v1M7.2 8h1M15.8 8h1M8.6 4.6l.7.7M14.7 10.7l.7.7M15.4 4.6l-.7.7M9.3 10.7l-.7.7" stroke="#fec50c" strokeWidth=".8" /></>,
  LT: <><rect width="24" height="5.34" fill="#fdb913" /><rect y="5.34" width="24" height="5.33" fill="#006a44" /><rect y="10.67" width="24" height="5.33" fill="#c1272d" /></>,
  LV: <><rect width="24" height="6.4" fill="#9e3039" /><rect y="6.4" width="24" height="3.2" fill="#fff" /><rect y="9.6" width="24" height="6.4" fill="#9e3039" /></>,
  MK: <><rect width="24" height="16" fill="#d20000" /><circle cx="12" cy="8" r="2.2" fill="#ffe600" /><path d="M12 0l1.2 5.8L12 8 10.8 5.8zM12 16l1.2-5.8L12 8l-1.2 2.2zM0 8l5.8-1.2L8 8l-2.2 1.2zM24 8l-5.8-1.2L16 8l2.2 1.2z" fill="#ffe600" /></>,
  MN: <><rect width="24" height="16" fill="#c4272f" /><rect x="8" width="8" height="16" fill="#015197" /><circle cx="12" cy="8" r="1.7" fill="#f9cf02" /><path d="M12 4.5v1.2M12 10.3v1.2M8.5 8h1.2M14.3 8h1.2M9.5 5.5l.8.8M13.7 9.7l.8.8M14.5 5.5l-.8.8M10.3 9.7l-.8.8" stroke="#f9cf02" strokeWidth=".7" /></>,
  NO: <><rect width="24" height="16" fill="#ba0c2f" /><path d="M6 0h4v16H6zM0 6h24v4H0z" fill="#fff" /><path d="M7 0h2v16H7zM0 7h24v2H0z" fill="#00205b" /></>,
  PL: <><rect width="24" height="8" fill="#fff" /><rect y="8" width="24" height="8" fill="#dc143c" /></>,
  PT: <><rect width="9.6" height="16" fill="#006600" /><rect x="9.6" width="14.4" height="16" fill="#ff0000" /><circle cx="9.6" cy="8" r="2.6" fill="#ffcc00" /><circle cx="9.6" cy="8" r="1.4" fill="#fff" /></>,
  RO: <><rect width="8" height="16" fill="#002b7f" /><rect x="8" width="8" height="16" fill="#fcd116" /><rect x="16" width="8" height="16" fill="#ce1126" /></>,
  RS: <><rect width="24" height="16" fill="#c6363c" /><rect y="5.34" width="24" height="5.33" fill="#0c4076" /><rect y="10.67" width="24" height="5.33" fill="#fff" /><path d="M8 5h4v4H8z" fill="#c6363c" stroke="#fff" strokeWidth=".5" /></>,
  RU: <><rect width="24" height="5.34" fill="#fff" /><rect y="5.34" width="24" height="5.33" fill="#0039a6" /><rect y="10.67" width="24" height="5.33" fill="#d52b1e" /></>,
  SE: <><rect width="24" height="16" fill="#006aa7" /><path d="M7 0h3v16H7zM0 6.5h24v3H0z" fill="#fecc00" /></>,
  SK: <><rect width="24" height="5.34" fill="#fff" /><rect y="5.34" width="24" height="5.33" fill="#0b4ea2" /><rect y="10.67" width="24" height="5.33" fill="#ee1c25" /><path d="M7 4.5h5v5.2c-1.5 1.3-2.4 1.6-2.5 2.3-.1-.7-1-1-2.5-2.3z" fill="#ee1c25" stroke="#fff" strokeWidth=".5" /><path d="M9.5 5.4v4.1M8.3 7.2h2.4" stroke="#fff" strokeWidth=".55" /></>,
  TR: <><rect width="24" height="16" fill="#e30a17" /><circle cx="10" cy="8" r="3.2" fill="#fff" /><circle cx="11.3" cy="8" r="2.5" fill="#e30a17" /><path d="M15.3 6.4l.5 1.5 1.6.1-1.3.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.3-.9 1.6-.1z" fill="#fff" /></>,
  UA: <><rect width="24" height="8" fill="#0057b7" /><rect y="8" width="24" height="8" fill="#ffd700" /></>,
  US: <><rect width="24" height="16" fill="#fff" /><path d="M0 1.8h24M0 5.4h24M0 9h24M0 12.6h24" stroke="#b22234" strokeWidth="1.8" /><rect width="10" height="8.6" fill="#3c3b6e" /><path d="M1.6 1.5h.7M4 1.5h.7M6.4 1.5h.7M8.8 1.5h.7M2.8 3.7h.7M5.2 3.7h.7M7.6 3.7h.7M1.6 5.9h.7M4 5.9h.7M6.4 5.9h.7M8.8 5.9h.7" stroke="#fff" strokeWidth=".7" /></>,
  XK: <><rect width="24" height="16" fill="#244aa5" /><path d="M8 4.5l1.2.6 1.5-.4.7 1.5 1.6.5.2 1.7-1.1 1.3.2 1.7-1.5.8-1.5-.8-1.5.8-1.5-.8.2-1.7-1.1-1.3.2-1.7 1.6-.5.7-1.5 1.5.4z" fill="#d0a650" /><circle cx="7.3" cy="4" r=".45" fill="#fff" /><circle cx="9.8" cy="3" r=".45" fill="#fff" /><circle cx="12" cy="2.6" r=".45" fill="#fff" /></>,
  ZA: <><rect width="24" height="16" fill="#007a4d" /><path d="M0 0l10 8L0 16z" fill="#000" /><path d="M0 2l8 6-8 6" fill="none" stroke="#ffb612" strokeWidth="1.6" /><path d="M0 0l10 8H24" fill="none" stroke="#fff" strokeWidth="2.5" /><path d="M0 16l10-8H24" fill="none" stroke="#fff" strokeWidth="2.5" /><rect y="6.5" width="24" height="3" fill="#de3831" /></>,
  BE: <><rect width="8" height="16" fill="#000" /><rect x="8" width="8" height="16" fill="#fdda24" /><rect x="16" width="8" height="16" fill="#ef3340" /></>,
  BG: <><rect width="24" height="5.34" fill="#fff" /><rect y="5.34" width="24" height="5.33" fill="#00966e" /><rect y="10.67" width="24" height="5.33" fill="#d62612" /></>,
  CL: <><rect width="24" height="8" fill="#fff" /><rect y="8" width="24" height="8" fill="#d52b1e" /><rect width="10" height="8" fill="#0039a6" /><path d="M5 2.4l.75 2.3 2.4.05-1.95 1.4.75 2.3-1.95-1.4-1.95 1.4.75-2.3-1.95-1.4 2.4-.05z" fill="#fff" /></>,
  ID: <><rect width="24" height="8" fill="#ce1126" /><rect y="8" width="24" height="8" fill="#fff" /></>,
  IQ: <><rect width="24" height="5.34" fill="#ce1126" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#000" /><text x="12" y="9.9" textAnchor="middle" fontSize="3" fontWeight="800" fill="#007a3d">الله أكبر</text></>,
  IR: <><rect width="24" height="5.34" fill="#239f40" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#da0000" /><path d="M12 5.6l.8 1.5-1.6 1.1h1.9l.7 1.6.7-1.6h1.9l-1.6-1.1.8-1.5z" fill="#da0000" /></>,
  LB: <><rect width="24" height="5.34" fill="#ee161f" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#ee161f" /><path d="M8.2 4.2l3.8 7.8 3.8-7.8z" fill="#007a3d" /></>,
  ME: <><rect width="24" height="16" fill="#c40308" /><rect x=".8" y=".8" width="22.4" height="14.4" fill="none" stroke="#d4af37" strokeWidth="1" /><path d="M8 5.5l2.5-1.8 2.5 1.8 1-.8v2.2l-2 2.5-.8 2.2h-1.4l-.8-2.2-2-2.5V4.7z" fill="#d4af37" /></>,
  MX: <><rect width="8" height="16" fill="#006847" /><rect x="8" width="8" height="16" fill="#fff" /><rect x="16" width="8" height="16" fill="#ce1126" /><circle cx="12" cy="8" r="2.6" fill="#8b5a2b" /><path d="M9.7 8.2c1.2-1.2 3.4-1 4.4.4l-.8.5c-.8-1-2.3-1-3.2-.2z" fill="#007a3d" /></>,
  NZ: <><rect width="24" height="16" fill="#012169" /><path d="M0 0h12v8H0z" fill="#012169" /><path d="M0 0l12 8M12 0L0 8" stroke="#fff" strokeWidth="1.6" /><path d="M0 0l12 8M12 0L0 8" stroke="#c8102e" strokeWidth=".7" /><path d="M6 0v8M0 4h12" stroke="#fff" strokeWidth="2.2" /><path d="M6 0v8M0 4h12" stroke="#c8102e" strokeWidth="1" /><path d="M18 3.2l.6 1.8 1.9.1-1.5 1.1.6 1.8-1.6-1.1-1.6 1.1.6-1.8-1.5-1.1 1.9-.1zM21 9l.5 1.4 1.5.1-1.2.9.5 1.4-1.3-.9-1.3.9.5-1.4-1.2-.9 1.5-.1zM15.5 11.5l.5 1.4 1.5.1-1.2.9.5 1.4-1.3-.9-1.3.9.5-1.4-1.2-.9 1.5-.1z" fill="#c8102e" stroke="#fff" strokeWidth=".35" /></>,
  PH: <><rect width="24" height="8" fill="#0038a8" /><rect y="8" width="24" height="8" fill="#ce1126" /><path d="M0 0l10 8-10 8z" fill="#fff" /><circle cx="4" cy="8" r="1.3" fill="#fcd116" /><path d="M4 4.8l.3 1 1-.3-.6.8.7.7-1-.2-.4 1-.3-1-1 .2.7-.7-.6-.8 1 .3z" fill="#fcd116" /></>,
  PK: <><rect width="24" height="16" fill="#01411c" /><rect width="6" height="16" fill="#fff" /><circle cx="15" cy="8" r="3.2" fill="#fff" /><circle cx="16.1" cy="7.5" r="2.7" fill="#01411c" /><path d="M19 5.4l.5 1.5 1.6.1-1.3.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.3-.9 1.6-.1z" fill="#fff" /></>,
  PS: <><rect width="24" height="5.34" fill="#000" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#007a3d" /><path d="M0 0l10 8-10 8z" fill="#ce1126" /></>,
  TM: <><rect width="24" height="16" fill="#00843d" /><rect x="3" width="4" height="16" fill="#d22630" /><path d="M4.2 2.2l.7 1.5 1.6.1-1.3.9.5 1.5-1.5-.9-1.5.9.5-1.5-1.3-.9 1.6-.1zM4.2 8l.7 1.5 1.6.1-1.3.9.5 1.5-1.5-.9-1.5.9.5-1.5-1.3-.9 1.6-.1z" fill="#f9cf02" /><circle cx="15" cy="8" r="3.1" fill="#fff" /><circle cx="16.1" cy="7.4" r="2.6" fill="#00843d" /><path d="M19.2 4.9l.5 1.4 1.5.1-1.2.9.5 1.4-1.3-.9-1.3.9.5-1.4-1.2-.9 1.5-.1z" fill="#fff" /></>,
  UY: <><rect width="24" height="16" fill="#fff" /><path d="M0 2h24M0 5h24M0 8h24M0 11h24M0 14h24" stroke="#0038a8" strokeWidth="1.4" /><rect width="10" height="10" fill="#fff" /><circle cx="5" cy="5" r="2.4" fill="#fcd116" /><circle cx="5" cy="5" r="1.5" fill="#fff" /><path d="M5 3.4v3.2M3.7 5h2.6M4 4l2 2M6 4L4 6" stroke="#fcd116" strokeWidth=".4" /></>,
  UZ: <><rect width="24" height="5.34" fill="#0099b5" /><rect y="5.34" width="24" height="5.33" fill="#fff" /><rect y="10.67" width="24" height="5.33" fill="#1eb53a" /><path d="M0 5h24M0 10.7h24" stroke="#ce1126" strokeWidth=".8" /><circle cx="5.5" cy="3.8" r="1.9" fill="#fff" /><circle cx="6.2" cy="3.4" r="1.6" fill="#0099b5" /><path d="M8.4 2.2l.35 1.1 1.1.05-.9.65.35 1.1-.9-.65-.9.65.35-1.1-.9-.65 1.1-.05z" fill="#fff" /></>,
  VN: <><rect width="24" height="16" fill="#da251d" /><path d="M12 2.8l1.25 3.85 4.05.1-3.28 2.38 1.25 3.85L12 10.6l-3.27 2.38 1.25-3.85-3.28-2.38 4.05-.1z" fill="#ffde00" /></>,
};

export function CountryFlag({ code, className = '' }: { code: string; className?: string }) {
  const key = (code || '').trim().toUpperCase();
  const flag = FLAGS[key];
  return (
    <svg
      className={`country-flag-svg ${className}`.trim()}
      viewBox="0 0 24 16"
      role="img"
      aria-label={key ? `${key} flag` : 'Unknown country'}
    >
      {flag ?? <><rect width="24" height="16" fill="#334155" /><text x="12" y="10.6" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#cbd5e1">{key || '??'}</text></>}
    </svg>
  );
}

/** A sleek, neutral pro-player silhouette used behind the flag badge. */
export function PlayerSilhouette({ compact = false }: { compact?: boolean }) {
  return (
    <svg className={`player-silhouette ${compact ? 'compact' : ''}`.trim()} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="21" r="11" fill="currentColor" />
      <path d="M10 62c.7-13.7 9.8-22 22-22s21.3 8.3 22 22z" fill="currentColor" opacity=".82" />
      <path d="M22 62c1.2-9.2 4.6-14.1 10-14.1S40.8 52.8 42 62z" fill="#0b1220" opacity=".24" />
      <path d="M21 17.5a11 11 0 0 1 22 0" fill="none" stroke="#0b1220" strokeWidth="2.4" opacity=".55" />
      <rect x="17.5" y="19" width="4.2" height="7" rx="2.1" fill="#0b1220" opacity=".55" />
      <rect x="42.3" y="19" width="4.2" height="7" rx="2.1" fill="#0b1220" opacity=".55" />
      <path d="M40 24.5c2.4 1.6 3.2 4 3 6.6" fill="none" stroke="#0b1220" strokeWidth="1.5" opacity=".5" />
      <path d="M25 55l7 4 7-4" fill="none" stroke="#fff" strokeWidth="1.1" opacity=".18" />
    </svg>
  );
}
