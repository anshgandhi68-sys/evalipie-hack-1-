import Link from "next/link";

/** Evalipie.in brand colours (from the official logo) */
export const BRAND_BLUE = "#214BD4";
export const BRAND_LIME = "#D5DC5C";

/**
 * The globe from the Evalipie.in logo.
 * `fg` = land + outer ring, `bg` = ocean/gap colour.
 */
export function Globe({ size = 36, fg = BRAND_LIME, bg = BRAND_BLUE, className = "" }: { size?: number; fg?: string; bg?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={`shrink-0 ${className}`}>
      <GlobeShape cx={50} cy={50} r={50} fg={fg} bg={bg} />
    </svg>
  );
}

/** Globe drawn inside any SVG at (cx, cy) with radius r (no ids → SSR-safe). */
function GlobeShape({ cx, cy, r, fg, bg }: { cx: number; cy: number; r: number; fg: string; bg: string }) {
  const k = r / 50;
  return (
    <g transform={`translate(${cx - 50 * k} ${cy - 50 * k}) scale(${k})`}>
      <circle cx="50" cy="50" r="49" fill={fg} />
      <g fill={bg}>
        <path d="M13 31 C19 23 30 25 35 31 C39 37 31 44 25 46 C18 48 11 41 13 31Z" />
        <path d="M41 29 C47 25 53 29 51 36 C49 42 59 46 57 54 C55 61 45 59 43 52 C41 46 36 35 41 29Z" />
        <path d="M66 21 C74 23 84 33 87 44 C80 47 72 41 68 37 C62 31 60 22 66 21Z" />
        <path d="M11 58 C19 55 30 61 36 69 C42 78 31 88 22 82 C14 76 8 67 11 58Z" />
        <path d="M60 70 C68 65 80 66 87 62 C85 72 77 82 67 86 C58 89 53 76 60 70Z" />
        <path d="M30 12 C36 10 42 12 40 17 C37 20 31 19 30 12Z" />
        <circle cx="73" cy="55" r="3" />
        <circle cx="46" cy="70" r="2.4" />
      </g>
      <circle cx="50" cy="50" r="45" fill="none" stroke={bg} strokeWidth="2.8" />
    </g>
  );
}

/**
 * The thin-stroke EVAL◯PIE.IN logotype.
 * `color` = letters, `globe` = globe land colour, `gap` = globe ocean colour.
 */
export function Logotype({
  height = 22,
  color = BRAND_LIME,
  globe,
  gap = BRAND_BLUE,
  className = "",
  title = "Evalipie.in",
}: {
  height?: number;
  color?: string;
  globe?: string;
  gap?: string;
  className?: string;
  title?: string;
}) {
  const sw = 2.3;
  return (
    <svg height={height} viewBox="-2 -1 300 42" className={`shrink-0 ${className}`} role="img" aria-label={title}>
      <title>{title}</title>
      <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {/* E */}
        <path d="M20 4 H0 V36 H20 M0 20 H17" />
        {/* V */}
        <path d="M31 4 L42 36 L53 4" />
        {/* A + L ligature */}
        <path d="M62 36 L74 4 L86 36 H116" />
        <path d="M68 22 H80" />
        <path d="M102 4 V30" />
        {/* P */}
        <path d="M176 36 V4 M176 20 H186 A8 8 0 0 0 186 4 H182" />
        {/* I + E ligature */}
        <path d="M206 36 V4 H234 M220 20 H234 M220 36 H234" />
        {/* I + N ligature */}
        <path d="M258 36 V4 H270 M276 36 V4 L296 36 V4" />
      </g>
      <circle cx="246" cy="36" r="2.4" fill={color} />
      <GlobeShape cx={146} cy={20} r={19} fg={globe ?? color} bg={gap} />
    </svg>
  );
}

/** Compact square mark: lime globe on brand-blue tile (favicon / avatar). */
export function LogoMark({ size = 36, tone = "brand" }: { size?: number; tone?: "brand" | "ink" | "emerald" }) {
  const tile = tone === "ink" ? "#1B1D22" : BRAND_BLUE;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect width="40" height="40" rx="10" fill={tile} />
      <GlobeShape cx={20} cy={20} r={12.5} fg={BRAND_LIME} bg={tile} />
    </svg>
  );
}

/** Text wordmark fallback (used in small UI text) */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Evalipie<span style={{ color: BRAND_LIME }}>.in</span>
    </span>
  );
}

export function BrandLink({ href = "/", height = 18, color = BRAND_LIME, gap = "#020617" }: { href?: string; height?: number; color?: string; gap?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Evalipie.in home">
      <Logotype height={height} color={color} gap={gap} />
    </Link>
  );
}
