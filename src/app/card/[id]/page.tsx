import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { BadgeCheck, Briefcase, Lock, MapPin, ShieldAlert, ShieldCheck, Star, ThumbsUp } from "lucide-react";
import { LEVEL_HI, RUBRICS, TRADE_LABEL, calculateTrustScore, credentialPayload, getStore, verifyCredential } from "@/lib/store";
import StickerButton from "./StickerButton";
import { BrandLink } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default async function SkillCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tamper?: string }> }) {
  const { id } = await params;
  const { tamper } = await searchParams;
  const w = getStore().workers.find((x) => x.id === id);

  if (!w || !w.verified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <div>
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Skill Card not found</h1>
          <p className="mt-1 text-sm text-slate-400">This worker hasn&apos;t completed video verification yet.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:underline">
            ← Back to Evalipie.in
          </Link>
        </div>
      </main>
    );
  }

  // Live HMAC verification (optionally simulate tampering: a forged level upgrade)
  const tampered = tamper === "1";
  const candidate = tampered ? { ...w, level: "Expert" as const, aiScore: 99 } : w;
  const valid = verifyCredential(candidate, w.signature);

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const url = `${proto}://${host}/card/${w.id}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#052e16", light: "#ffffff" } });

  const b = calculateTrustScore(w);
  const avgRating = w.ratings.length ? w.ratings.reduce((a, c) => a + c, 0) / w.ratings.length : 0;
  const t = TRADE_LABEL[w.trade];
  const passed = w.rubric.filter((c) => c.passed).length;
  const payloadHash = (await import("crypto")).createHash("sha256").update(credentialPayload(w)).digest("hex");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-200">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="no-print mb-2 flex items-center justify-between text-xs text-slate-500">
          <BrandLink size={26} textClass="text-base text-white" />
          <span className="rounded-full border border-slate-800 px-2.5 py-1">Public Digital Skill Card</span>
        </div>

        {/* Verification banner */}
        <div className={`flex items-center gap-3 rounded-2xl border p-3 ${valid ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/50 bg-rose-500/10"}`}>
          {valid ? <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-400" /> : <ShieldAlert className="h-7 w-7 shrink-0 text-rose-400" />}
          <div className="min-w-0">
            <div className={`font-bold ${valid ? "text-emerald-300" : "text-rose-300"}`}>{valid ? "✓ Cryptographically Verified" : "✗ Signature mismatch — card tampered"}</div>
            <div className="truncate font-mono text-[10px] text-slate-400">HMAC-SHA256 · sig {w.signature.slice(0, 24)}…</div>
          </div>
        </div>

        {/* Main card */}
        <section id="skill-card" className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 shadow-2xl shadow-emerald-900/30">
          <div className="p-5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
              <span>Evalipie.in · Skill Card</span>
              <span>#{w.id.toUpperCase()}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-slate-950 shadow-lg" style={{ background: `hsl(${w.avatarHue} 70% 60%)` }}>
                {w.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.5 text-2xl font-bold text-white">
                  {w.name} {valid && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />}
                </h1>
                <div className="text-sm text-emerald-100/80">
                  {t.emoji} {t.en} · {t.hi}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" /> {w.area}, Bengaluru · {w.years} yrs exp.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950">
                {w.level} · {LEVEL_HI[w.level]}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300">
                <Lock className="h-3 w-3" /> Phone hidden · privacy protected
              </span>
            </div>
          </div>

          {/* Trust score */}
          <div className="border-t border-white/5 bg-black/20 p-5">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#34d399" strokeWidth="3" strokeDasharray={`${(w.trustScore / 100) * 97.4} 97.4`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-black text-white">{w.trustScore}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Trust</div>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                <MiniBar label="AI skill test" pct="40%" value={b.ai} max={40} color="bg-violet-400" />
                <MiniBar label="Vouches" pct="30%" value={b.vouches} max={30} color="bg-teal-400" />
                <MiniBar label="Jobs & ratings" pct="30%" value={b.jobs} max={30} color="bg-amber-400" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat icon={<Briefcase className="h-3.5 w-3.5" />} value={String(w.jobsCompleted)} label="Jobs done" />
              <Stat icon={<Star className="h-3.5 w-3.5" />} value={avgRating ? avgRating.toFixed(1) : "–"} label="Avg rating" />
              <Stat icon={<ThumbsUp className="h-3.5 w-3.5" />} value={String(w.vouches.length)} label="Vouches" />
            </div>
          </div>
        </section>

        {/* Rubric */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">AI video assessment</h2>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
              {w.aiScore}/100 · {passed}/{w.rubric.length} passed
            </span>
          </div>
          <p className="mb-2 text-xs text-slate-500">Task: {RUBRICS[w.trade].task} · liveness-checked</p>
          <ul className="space-y-2">
            {w.rubric.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.passed ? "bg-emerald-500 text-emerald-950" : "bg-rose-500/80 text-white"}`}>{c.passed ? "✓" : "✗"}</span>
                <span>
                  <span className="text-slate-200">{c.name}</span>
                  <span className="block text-xs text-slate-500">{c.observation}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vouches */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 font-semibold text-white">Verified vouches</h2>
          {w.vouches.length === 0 ? (
            <p className="text-sm text-slate-500">No vouches yet.</p>
          ) : (
            <ul className="space-y-2">
              {w.vouches.map((v, i) => (
                <li key={i} className="rounded-xl bg-slate-950/60 p-3 text-sm">
                  <p className="text-slate-300">“{v.note}”</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-teal-300">
                    <BadgeCheck className="h-3.5 w-3.5" /> {v.by}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* QR */}
        <section className="rounded-2xl border border-slate-800 bg-white p-5 text-center text-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="card-qr" src={qr} alt="Skill card QR" className="mx-auto h-52 w-52" />
          <p className="mt-2 text-xs text-slate-500">Scan to verify this worker&apos;s skills instantly</p>
          <StickerButton qr={qr} name={w.name} trade={`${t.en} · ${w.level}`} trust={w.trustScore} id={w.id} />
        </section>

        {/* Signature details */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 font-mono text-[10px] leading-relaxed text-slate-500">
          <div className="mb-1 font-sans text-xs font-semibold text-slate-300">Credential proof</div>
          <div>alg: HMAC-SHA256</div>
          <div className="break-all">payload_sha256: {payloadHash}</div>
          <div className="break-all">signature: {w.signature}</div>
          <div>issued: {new Date(w.verifiedAt).toLocaleString("en-IN")}</div>
          <div className="no-print mt-2 font-sans text-xs">
            {tampered ? (
              <Link href={`/card/${w.id}`} className="text-emerald-400 hover:underline">
                ← View original (valid) credential
              </Link>
            ) : (
              <Link href={`/card/${w.id}?tamper=1`} className="text-rose-400 hover:underline">
                🧪 Try tampering (forge level → Expert, score → 99)
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniBar({ label, pct, value, max, color }: { label: string; pct: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[11px]">
        <span className="text-slate-300">
          {label} <span className="text-slate-500">({pct})</span>
        </span>
        <span className="font-semibold text-white">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-slate-950/50 py-2">
      <div className="flex items-center justify-center gap-1 text-lg font-bold text-white">
        {icon}
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
