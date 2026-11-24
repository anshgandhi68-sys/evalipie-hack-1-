import Link from "next/link";

/** Evalipie.in logo mark + wordmark */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="evx" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#evx)" />
      <path d="M13 12h14M13 20h10M13 28h14M13 12v16" stroke="#022c22" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="29.5" cy="20" r="2.6" fill="#022c22" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Evalipie<span className="text-emerald-400">.in</span>
    </span>
  );
}

export function BrandLink({ href = "/", size = 34, textClass = "text-lg text-white" }: { href?: string; size?: number; textClass?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Evalipie.in home">
      <LogoMark size={size} />
      <Wordmark className={textClass} />
    </Link>
  );
}
