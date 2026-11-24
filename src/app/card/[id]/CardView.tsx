"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { BadgeCheck, Briefcase, Loader2, Lock, MapPin, ShieldAlert, ShieldCheck, Star, ThumbsUp } from "lucide-react";
import { BRAND_BLUE, BRAND_LIME, Globe, Logotype } from "@/components/Brand";
import StickerButton from "./StickerButton";

type CardData = {
  found: boolean;
  valid: boolean;
  tampered: boolean;
  worker: {
    id: string;
    name: string;
    trade: string;
    tradeEn: string;
    tradeHi: string;
    emoji: string;
    level: string;
    levelHi: string;
    area: string;
    years: number;
    aiScore: number;
    trustScore: number;
    jobsCompleted: number;
    avgRating: number;
    rubric: { name: string; passed: boolean; observation: string }[];
    task: string;
    vouches: { by: string; note: string }[];
    breakdown: { ai: number; vouches: number; jobs: number; total: number };
    verifiedAt: number;
    signature: string;
    payloadHash: string;
  };
};

export default function CardView({ id, tamper }: { id: string; tamper: boolean }) {
  const [data, setData] = useState<CardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/card/${encodeURIComponent(id)}${tamper ? "?tamper=1" : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json()) as CardData;
        if (cancelled) return;
        if (!r.ok || !d.found) {
          setStatus("missing");
          return;
        }
        setData(d);
        setStatus("ok");
      })
      .catch(() => !cancelled && setStatus("missing"));
    QRCode.toDataURL(`${window.location.origin}/card/${id}`, { margin: 1, width: 360, color: { dark: "#1B1D22", light: "#ffffff" } })
      .then((u) => !cancelled && setQr(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, tamper]);

  if (status === "loading") {
    return (
      <main className="paper-site flex min-h-screen flex-col items-center justify-center gap-4 font-sans">
        <Globe size={52} fg={BRAND_BLUE} bg="#F3EFE6" className="animate-pulse" />
        <div className="flex items-center text-sm text-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Skill Card…
        </div>
      </main>
    );
  }

  if (status === "missing" || !data) {
    return (
      <main className="paper-site flex min-h-screen items-center justify-center p-6 text-center font-sans">
        <div>
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[#B8651B]" />
          <h1 className="text-2xl font-medium text-ink">Skill Card not found</h1>
          <p className="mt-1 max-w-sm text-sm text-muted">This worker hasn&apos;t completed video verification yet, or the demo was reset.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/studio" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-cobalt">
              Open demo studio
            </Link>
            <Link href="/" className="rounded-full border border-hair px-5 py-2.5 text-sm font-medium text-ink hover:bg-panel">
              Evalipie.in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { worker: w, valid, tampered } = data;
  const b = w.breakdown;
  const passed = w.rubric.filter((c) => c.passed).length;
  const initials = w.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <main className="paper-site relative min-h-screen px-4 py-8 font-sans">
      <div className="blueprint pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-cobalt/15 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-md space-y-4">
        <div className="no-print mb-3 flex items-center justify-between">
          <Link href="/" aria-label="Evalipie.in home">
            <Logotype height={16} color="#1B1D22" globe={BRAND_BLUE} gap="#F3EFE6" />
          </Link>
          <span className="crumb text-muted">Skill Card / {w.id.toUpperCase()}</span>
        </div>

        {/* Verification banner */}
        <div className={`flex items-center gap-3 rounded-2xl border p-3.5 ${valid ? "border-cobalt/25 bg-cobalt/[.06]" : "border-[#C2410C]/30 bg-[#C2410C]/[.07]"}`}>
          {valid ? <ShieldCheck className="h-7 w-7 shrink-0 text-cobalt" /> : <ShieldAlert className="h-7 w-7 shrink-0 text-[#C2410C]" />}
          <div className="min-w-0">
            <div className={`font-semibold ${valid ? "text-cobalt" : "text-[#C2410C]"}`}>{valid ? "✓ Cryptographically Verified" : "✗ Signature mismatch — card tampered"}</div>
            <div className="truncate font-mono text-[10px] text-muted">HMAC-SHA256 · sig {w.signature.slice(0, 24)}…</div>
          </div>
        </div>

        {/* Main card — brand blue */}
        <section id="skill-card" className="relative overflow-hidden rounded-3xl bg-[#214BD4] text-white shadow-[0_40px_80px_-40px_rgba(33,75,212,.8)]">
          <div className="pointer-events-none absolute inset-0 opacity-[.10] [background-image:linear-gradient(#D5DC5C_1px,transparent_1px),linear-gradient(90deg,#D5DC5C_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <Logotype height={12} color={BRAND_LIME} gap={BRAND_BLUE} />
              <span className="crumb text-[#D5DC5C]/80">Skill Card</span>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D5DC5C] text-2xl font-semibold text-[#1B1D22]">{initials}</div>
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
                  {w.name} {valid && <BadgeCheck className="h-5 w-5 shrink-0 text-[#D5DC5C]" />}
                </h1>
                <div className="text-sm text-white/80">
                  {w.emoji} {w.tradeEn} · {w.tradeHi}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-white/65">
                  <MapPin className="h-3 w-3" /> {w.area}, Bengaluru · {w.years} yrs exp.
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#D5DC5C] px-3 py-1 text-xs font-semibold text-[#1B1D22]">
                {w.level} · {w.levelHi}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                <Lock className="h-3 w-3" /> Phone hidden · privacy protected
              </span>
            </div>
          </div>

          <div className="relative border-t border-white/15 bg-black/10 p-5">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#D5DC5C" strokeWidth="3" strokeDasharray={`${(w.trustScore / 100) * 97.4} 97.4`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-semibold">{w.trustScore}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/60">Trust</div>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                <MiniBar label="AI skill test" pct="40%" value={b.ai} max={40} op={1} />
                <MiniBar label="Vouches" pct="30%" value={b.vouches} max={30} op={0.7} />
                <MiniBar label="Jobs & ratings" pct="30%" value={b.jobs} max={30} op={0.45} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat icon={<Briefcase className="h-3.5 w-3.5" />} value={String(w.jobsCompleted)} label="Jobs done" />
              <Stat icon={<Star className="h-3.5 w-3.5" />} value={w.avgRating ? w.avgRating.toFixed(1) : "–"} label="Avg rating" />
              <Stat icon={<ThumbsUp className="h-3.5 w-3.5" />} value={String(w.vouches.length)} label="Vouches" />
            </div>
          </div>
        </section>

        {/* Rubric */}
        <section className="rounded-2xl border border-hair bg-[#FBF9F4] p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-medium text-ink">AI video assessment</h2>
            <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 text-xs font-semibold text-cobalt">
              {w.aiScore}/100 · {passed}/{w.rubric.length} passed
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">Task: {w.task} · liveness-checked</p>
          <ul className="space-y-2.5">
            {w.rubric.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${c.passed ? "bg-cobalt text-white" : "bg-[#C2410C]/85 text-white"}`}>{c.passed ? "✓" : "✗"}</span>
                <span>
                  <span className="text-ink">{c.name}</span>
                  <span className="block text-xs text-muted">{c.observation}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vouches */}
        <section className="rounded-2xl border border-hair bg-[#FBF9F4] p-5">
          <h2 className="mb-3 font-medium text-ink">Verified vouches</h2>
          {w.vouches.length === 0 ? (
            <p className="text-sm text-muted">No vouches yet.</p>
          ) : (
            <ul className="space-y-2">
              {w.vouches.map((v, i) => (
                <li key={i} className="rounded-xl bg-panel/70 p-3 text-sm">
                  <p className="serif-em text-[17px] leading-snug text-ink">“{v.note}”</p>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-cobalt">
                    <BadgeCheck className="h-3.5 w-3.5" /> {v.by}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* QR */}
        <section className="rounded-2xl border border-hair bg-white p-5 text-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img id="card-qr" src={qr} alt="Skill card QR" className="mx-auto h-52 w-52" />
          ) : (
            <div className="mx-auto h-52 w-52 animate-pulse rounded-lg bg-panel" />
          )}
          <p className="mt-2 text-xs text-muted">Scan to verify this worker&apos;s skills instantly</p>
          {qr && <StickerButton qr={qr} name={w.name} trade={`${w.tradeEn} · ${w.level}`} trust={w.trustScore} id={w.id} />}
        </section>

        {/* Signature details */}
        <section className="rounded-2xl border border-hair bg-[#FBF9F4] p-4 font-mono text-[10px] leading-relaxed text-muted">
          <div className="crumb mb-1 font-sans text-ink">Credential proof</div>
          <div>alg: HMAC-SHA256</div>
          <div className="break-all">payload_sha256: {w.payloadHash}</div>
          <div className="break-all">signature: {w.signature}</div>
          <div>issued: {new Date(w.verifiedAt).toLocaleString("en-IN")}</div>
          <div className="no-print mt-2 font-sans text-xs">
            {tampered ? (
              <Link href={`/card/${w.id}`} className="text-cobalt hover:underline">
                ← View original (valid) credential
              </Link>
            ) : (
              <Link href={`/card/${w.id}?tamper=1`} className="text-[#C2410C] hover:underline">
                🧪 Try tampering (forge level → Expert, score → 99)
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniBar({ label, pct, value, max, op }: { label: string; pct: string; value: number; max: number; op: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px]">
        <span className="text-white/85">
          {label} <span className="text-white/50">({pct})</span>
        </span>
        <span className="font-semibold">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-[#D5DC5C]" style={{ width: `${(value / max) * 100}%`, opacity: op }} />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 py-2">
      <div className="flex items-center justify-center gap-1 text-lg font-semibold">
        {icon}
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}
