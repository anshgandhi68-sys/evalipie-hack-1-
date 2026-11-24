"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Command, Mic, Play } from "lucide-react";
import { BRAND_BLUE, BRAND_LIME, LogoMark, Logotype } from "@/components/Brand";
import {
  CommandPalette,
  MotionRoot,
  ParticleField,
  PauseMotionPill,
  clamp01,
  easeOut,
  sectionProgress,
  useFrame,
  useScrolledPast,
} from "./motion";

export type LandingWorker = {
  id: string;
  name: string;
  trade: "electrician" | "plumber" | "mason" | "carpenter";
  tradeLabel: string;
  emoji: string;
  level: string;
  area: string;
  trustScore: number;
  jobs: number;
  rating: number;
  vouches: number;
  aiScore: number;
  passed: number;
  hue: number;
};
export type LandingData = {
  stats: { verified: number; avgTrust: number; jobsDone: number; wageProtected: number };
  workers: LandingWorker[];
  sampleId: string;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Crumb({ n, label, className = "" }: { n: string; label?: string; className?: string }) {
  return (
    <div className={`crumb flex items-center gap-2 text-muted ${className}`}>
      <span>Evalipie.in / {n}</span>
      {label && (
        <span className="hidden items-center gap-2 sm:flex">
          <span className="h-px w-6 bg-hair" />
          <span>{label}</span>
        </span>
      )}
    </div>
  );
}

// ============================================================
export default function Landing({ data }: { data: LandingData }) {
  return (
    <div className="paper-site relative min-h-screen overflow-x-clip font-sans">
      <MotionRoot />
      <ParticleField heroId="hero" targetId="hero-target" storyId="story" gridId="story-grid" />
      <Nav />
      <main className="relative z-[2]">
        <Hero />
        <Story />
        <Manifesto />
        <Gallery data={data} />
        <ProductStory />
        <Figures />
        <Pricing />
      </main>
      <Footer />
      <PauseMotionPill />
      <CommandPalette sampleCardId={data.sampleId} />
    </div>
  );
}

// ============================================================
// Nav — absolute at first, blurred paper bar after 40px
// ============================================================
function Nav() {
  const scrolled = useScrolledPast(40);
  return (
    <header className={`${scrolled ? "fixed border-b border-hair bg-paper/75 backdrop-blur-xl" : "absolute border-b border-transparent"} inset-x-0 top-0 z-[60] transition-colors duration-300`}>
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-5 md:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Evalipie.in home">
          <Logotype height={19} color="#1B1D22" globe={BRAND_BLUE} gap="#F3EFE6" />
        </Link>
        <nav className="hidden items-center gap-7 text-[13.5px] text-muted md:flex">
          <a href="#story" className="transition hover:text-ink">How it works</a>
          <a href="#workers" className="transition hover:text-ink">Workers</a>
          <a href="#product" className="transition hover:text-ink">Product</a>
          <a href="#pricing" className="transition hover:text-ink">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event("open-palette"))}
            className="hidden items-center gap-1.5 rounded-full border border-hair px-3 py-1.5 text-xs text-muted transition hover:border-ink/30 hover:text-ink sm:flex"
            aria-label="Open command palette"
          >
            <Command className="h-3 w-3" /> K
          </button>
          <Link href="/studio" className="group flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-cobalt">
            Launch demo <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// Hero — particles assemble a Skill Card over the first 120vh
// ============================================================
function Hero() {
  const router = useRouter();
  const [text, setText] = useState("");
  const notes = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const p = clamp01(window.scrollY / (window.innerHeight * 1.2));
    if (notes.current) notes.current.style.opacity = String(clamp01((p - 0.7) / 0.25));
    if (cue.current) cue.current.style.opacity = String(1 - clamp01(p / 0.15));
  });

  const go = () => {
    const q = text.trim();
    router.push(q ? `/studio?q=${encodeURIComponent(q)}` : "/studio");
  };

  return (
    <section id="hero" className="relative md:h-[220vh]">
      <div className="relative overflow-hidden md:sticky md:top-0 md:h-screen">
        {/* blueprint grid + cobalt glow */}
        <div className="blueprint pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
        <div className="pointer-events-none absolute -right-40 -top-48 h-[640px] w-[640px] rounded-full bg-cobalt/15 blur-[130px]" />

        <div className="relative mx-auto grid h-full max-w-[1320px] items-center gap-10 px-5 pb-16 pt-28 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pb-0 md:pt-16">
          <div>
            <Crumb n="01" label="Skill verification on WhatsApp" />
            <h1 className="display mt-6 font-medium text-ink">
              Skills that <span className="serif-em text-cobalt">prove themselves.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-muted">
              A voice note and thirty seconds of real work become a signed Skill Card for India&apos;s electricians, plumbers, masons and carpenters — matched to nearby jobs at a fair wage.
            </p>

            {/* prompt card */}
            <div className="mt-8 max-w-[560px] rounded-2xl border border-hair bg-[#FBF9F4]/90 p-2 shadow-[0_30px_60px_-35px_rgba(27,29,34,.45)] backdrop-blur">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go();
                }}
                rows={3}
                placeholder="Describe or record your skill… e.g. “Mera naam Suresh hai, 6 saal se plumber hoon, HSR Layout”"
                className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/80 focus:outline-none"
              />
              <div className="flex items-center gap-2 border-t border-hair px-2 pt-2">
                <Link href="/studio" className="flex h-9 w-9 items-center justify-center rounded-full border border-hair text-ink transition hover:border-cobalt hover:text-cobalt" aria-label="Record a voice note">
                  <Mic className="h-4 w-4" />
                </Link>
                <div className="hidden gap-1 text-[11px] text-muted sm:flex">
                  {["हिन्दी", "ಕನ್ನಡ", "தமிழ்", "EN"].map((l) => (
                    <span key={l} className="rounded-full bg-panel px-2 py-1">{l}</span>
                  ))}
                </div>
                <button onClick={go} className="group ml-auto flex items-center gap-1.5 rounded-full bg-cobalt px-4 py-2.5 text-[13.5px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(33,75,212,.8)] transition hover:bg-ink">
                  Generate Skill Card <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted">No app · No forms · Your phone number stays private</p>
          </div>

          {/* particle target */}
          <div className="relative hidden md:block">
            <div id="hero-target" className="relative mx-auto aspect-[1/0.8] w-full max-w-[520px]" />
            <div ref={notes} className="pointer-events-none absolute inset-0 opacity-0" aria-hidden>
              <span className="crumb absolute left-[2%] top-[6%] text-muted">Fig. 01 — Skill Card</span>
              <span className="absolute right-[0%] top-[18%] rounded-full border border-hair bg-paper px-2.5 py-1 text-[11px] text-ink">Trust ring · 62</span>
              <span className="absolute bottom-[14%] right-[4%] rounded-full border border-hair bg-paper px-2.5 py-1 text-[11px] text-ink">QR seal · HMAC-SHA256</span>
              <span className="absolute bottom-[20%] left-[0%] rounded-full border border-hair bg-paper px-2.5 py-1 text-[11px] text-ink">5 / 5 rubric checks</span>
            </div>
          </div>
          <div id="hero-target-mobile" className="mx-auto aspect-[1/0.8] w-full max-w-[380px] md:hidden" />
        </div>

        <div ref={cue} className="crumb pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-muted md:flex">
          Scroll to assemble <span className="inline-block h-6 w-px animate-pulse bg-muted" />
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Sticky story — 300vh, three chapters, tilting app window
// ============================================================
const CHAPTERS = [
  { n: "01", t: "Speak", h: "A voice note becomes a profile.", d: "Workers introduce themselves in their own language. Gemini pulls out name, trade, years and area — no forms, no typing." },
  { n: "02", t: "Prove", h: "Thirty seconds of real work, graded.", d: "A random liveness code is spoken on camera. The AI grades the work against a 5-point safety & quality rubric." },
  { n: "03", t: "Earn", h: "A fair job, one tap away.", d: "Nearby jobs arrive on WhatsApp with a Fair Wage Shield. Lowballed? Counter in one tap. Every rated job raises the Trust Score." },
];

function Story() {
  const section = useRef<HTMLElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const [ch, setCh] = useState(0);
  const chRef = useRef(0);

  useFrame(() => {
    if (!section.current) return;
    const p = sectionProgress(section.current);
    const t = easeOut(clamp01(p / 0.22));
    if (win.current) {
      win.current.style.transform = `perspective(1600px) rotateX(${(1 - t) * 26}deg) rotateY(${(1 - t) * -16}deg) translateY(${(1 - t) * 70}px) scale(${0.9 + 0.1 * t})`;
      win.current.style.opacity = String(0.35 + 0.65 * clamp01(p / 0.08 + 0.4));
    }
    fills.current.forEach((f, i) => {
      if (f) f.style.transform = `scaleX(${clamp01((p - i / 3) * 3)})`;
    });
    const next = p < 0.36 ? 0 : p < 0.69 ? 1 : 2;
    if (next !== chRef.current) {
      chRef.current = next;
      setCh(next);
    }
  });

  return (
    <section id="story" ref={section} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1320px] flex-1 items-center gap-8 px-5 pt-20 md:grid-cols-[0.8fr_1.2fr] md:px-10">
          <div className="relative min-h-[220px]">
            <Crumb n="02" label="How it works" />
            {CHAPTERS.map((c, i) => (
              <div key={c.n} className={`absolute inset-x-0 top-10 transition-all duration-700 ${ch === i ? "translate-y-0 opacity-100" : i < ch ? "-translate-y-4 opacity-0" : "translate-y-4 opacity-0"}`}>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-cobalt">{c.n}</span>
                  <span className="serif-em text-3xl text-ink">{c.t}</span>
                </div>
                <h2 className="display-sm mt-3 font-medium text-ink">{c.h}</h2>
                <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-muted">{c.d}</p>
              </div>
            ))}
          </div>

          <div ref={win} className="relative mx-auto w-full max-w-[720px] origin-center will-change-transform">
            <div className="overflow-hidden rounded-2xl border border-hair bg-[#FBF9F4]/40 shadow-[0_50px_100px_-40px_rgba(27,29,34,.45)]">
              <div className="flex items-center gap-2 border-b border-hair bg-paper px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5675B]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E9B949]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#5BBF6A]" />
                <div className="mx-auto rounded-md bg-panel px-10 py-1 font-mono text-[11px] text-muted">evalipie.in/studio</div>
              </div>
              <div id="story-grid" className="relative h-[340px] sm:h-[400px]">
                <ChapterPanel show={ch === 0}>
                  <SpeakPanel />
                </ChapterPanel>
                <ChapterPanel show={ch === 1}>
                  <ProvePanel />
                </ChapterPanel>
                <ChapterPanel show={ch === 2}>
                  <EarnPanel />
                </ChapterPanel>
              </div>
            </div>
          </div>
        </div>

        {/* chapter index */}
        <div className="mx-auto mb-8 grid w-full max-w-[1320px] grid-cols-3 gap-4 px-5 md:px-10">
          {CHAPTERS.map((c, i) => (
            <div key={c.n}>
              <div className="h-px overflow-hidden bg-hair">
                <span ref={(el) => { fills.current[i] = el; }} className="block h-px w-full origin-left bg-cobalt" style={{ transform: "scaleX(0)" }} />
              </div>
              <div className={`crumb mt-2 transition-colors ${ch === i ? "text-ink" : "text-muted"}`}>
                {c.n} {c.t}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChapterPanel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center p-5 transition-all duration-700 sm:p-8 ${show ? "scale-100 opacity-100" : "pointer-events-none scale-[.97] opacity-0"}`}>
      {children}
    </div>
  );
}

const card = "rounded-xl border border-hair bg-[#FBF9F4] shadow-[0_20px_40px_-28px_rgba(27,29,34,.45)]";

function SpeakPanel() {
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-2">
      <div className={`${card} p-4`}>
        <div className="crumb text-muted">Voice note · 0:09</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper"><Play className="h-3.5 w-3.5 fill-paper" /></span>
          <span className="flex h-8 flex-1 items-center gap-[3px]">
            {Array.from({ length: 26 }).map((_, i) => (
              <span key={i} className="w-[3px] rounded-full bg-cobalt/70" style={{ height: 6 + ((i * 37) % 22) }} />
            ))}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-snug text-ink">“नमस्ते, मेरा नाम रमेश कुमार है। मैं आठ साल से बिजली का काम करता हूँ। कोरमंगला में रहता हूँ।”</p>
      </div>
      <div className={`${card} hidden p-4 sm:block`}>
        <div className="crumb text-cobalt">Extracted profile</div>
        <dl className="mt-3 space-y-2 text-[13px]">
          {[
            ["Name", "Ramesh Kumar"],
            ["Trade", "⚡ Electrician"],
            ["Experience", "8 years"],
            ["Area", "Koramangala"],
            ["Language", "हिन्दी (hi)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-hair pb-1.5 last:border-0">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ProvePanel() {
  const crit = ["Power isolated at MCB", "Correct colour coding", "Tight terminal connections", "Earthing connected", "Insulated tools & posture"];
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-[1fr_1.1fr]">
      <div className={`${card} relative hidden overflow-hidden p-0 sm:block`}>
        <div className="flex aspect-video items-center justify-center bg-[repeating-linear-gradient(45deg,#E9E4D8_0_8px,#F3EFE6_8px_16px)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/80 text-paper"><Play className="h-4 w-4 fill-paper" /></span>
        </div>
        <div className="flex items-center justify-between p-3">
          <span className="crumb text-muted">Liveness code</span>
          <span className="flex gap-1">
            {["4", "7"].map((d) => (
              <span key={d} className="flex h-7 w-6 items-center justify-center rounded-md bg-cobalt text-sm font-semibold text-white">{d}</span>
            ))}
          </span>
        </div>
      </div>
      <div className={`${card} p-4`}>
        <div className="flex items-center justify-between">
          <span className="crumb text-cobalt">AI assessment</span>
          <span className="text-2xl font-semibold text-ink">88<span className="text-sm text-muted">/100</span></span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {crit.map((c) => (
            <li key={c} className="flex items-center gap-2 text-[13px] text-ink">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cobalt text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg bg-panel px-3 py-2 text-[12px] text-ink">Verified · <b>Expert</b> electrician</div>
      </div>
    </div>
  );
}

function EarnPanel() {
  return (
    <div className="grid w-full items-center gap-4 sm:grid-cols-[1.2fr_0.8fr]">
      <div className={`${card} p-4`}>
        <div className="crumb text-muted">New job · 0.4 km</div>
        <div className="mt-2 text-[15px] font-medium text-ink">Electrician · Koramangala · 3 days</div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-muted"><span>₹600</span><span>Fair range ₹850–₹1,100</span><span>₹1,300</span></div>
          <div className="relative mt-1.5 h-2 rounded-full bg-panel">
            <span className="absolute inset-y-0 left-[35.7%] right-[28.6%] rounded-full bg-cobalt/25" />
            <span className="absolute -top-1 h-4 w-0.5 bg-[#D9822B]" style={{ left: "14.3%" }} />
            <span className="absolute -top-1 h-4 w-0.5 bg-cobalt" style={{ left: "57%" }} />
          </div>
          <div className="mt-2 flex justify-between text-[12px]"><span className="text-[#B8651B]">Offer ₹700 · 18% below</span><span className="font-medium text-cobalt">Counter ₹1,000</span></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] font-medium">
          <span className="rounded-lg border border-hair py-2 text-ink">1 · Accept</span>
          <span className="rounded-lg border border-hair py-2 text-ink">2 · Skip</span>
          <span className="rounded-lg bg-ink py-2 text-paper">3 · ₹1,000</span>
        </div>
      </div>
      <div className={`${card} hidden p-4 text-center sm:block`}>
        <div className="crumb text-muted">Trust Score</div>
        <div className="mt-2 text-5xl font-semibold tracking-tight text-ink">62</div>
        <div className="mt-1 text-[12px] text-cobalt">▲ 45 → 62 after ⭐ 5.0</div>
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-panel">
          <span className="bg-cobalt" style={{ width: "35%" }} />
          <span className="bg-cobalt/60" style={{ width: "10%" }} />
          <span className="bg-cobalt/30" style={{ width: "17%" }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Manifesto — each word lights up as it crosses the viewport centre
// ============================================================
function Manifesto() {
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const plain = "Every skilled hand already knows its worth. We just help it".split(" ");
  const em = ["prove", "it."];

  useFrame(() => {
    const mid = window.innerHeight * 0.55;
    for (const w of words.current) {
      if (!w) continue;
      const r = w.getBoundingClientRect();
      w.style.opacity = String(0.15 + 0.85 * clamp01((mid - r.top) / 90));
    }
  });

  let k = 0;
  return (
    <section className="relative z-[2] bg-paper py-40 md:py-56">
      <div className="mx-auto max-w-[1100px] px-5 md:px-10">
        <Crumb n="03" label="Manifesto" />
        <p className="display-md mt-10 font-medium text-ink">
          {plain.map((w) => {
            const i = k++;
            return (
              <span key={i} ref={(el) => { words.current[i] = el; }} className="inline-block pr-[0.25em]" style={{ opacity: 0.15 }}>
                {w}
              </span>
            );
          })}
          {em.map((w) => {
            const i = k++;
            return (
              <span key={i} ref={(el) => { words.current[i] = el; }} className="serif-em inline-block pr-[0.25em] text-cobalt" style={{ opacity: 0.15 }}>
                {w}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

// ============================================================
// Gallery — filter chips + fanning Skill Card sheets
// ============================================================
const CHIPS = [
  { k: "all", l: "All trades" },
  { k: "electrician", l: "Electricians" },
  { k: "plumber", l: "Plumbers" },
  { k: "mason", l: "Masons" },
  { k: "carpenter", l: "Carpenters" },
] as const;

function Gallery({ data }: { data: LandingData }) {
  const [f, setF] = useState<(typeof CHIPS)[number]["k"]>("all");
  const list = useMemo(() => {
    const pool = f === "all" ? data.workers.filter((w, i, a) => a.findIndex((x) => x.trade === w.trade) === i) : data.workers.filter((w) => w.trade === f);
    return pool.slice(0, 3);
  }, [f, data.workers]);

  return (
    <section id="workers" className="relative z-[2] border-t border-hair bg-paper py-28">
      <div className="mx-auto max-w-[1320px] px-5 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
          <div>
            <Crumb n="04" label="Live network" />
            <h2 className="display-md mt-5 font-medium text-ink">
              Verified hands, <span className="serif-em text-cobalt">near you.</span>
            </h2>
          </div>
          <div className="flex gap-8 text-sm">
            <Mini v={String(data.stats.verified)} l="Verified" />
            <Mini v={String(data.stats.avgTrust)} l="Avg trust" />
            <Mini v={inr(data.stats.wageProtected)} l="Wages protected" />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2" data-reveal>
          {CHIPS.map((c) => (
            <button
              key={c.k}
              onClick={() => setF(c.k)}
              className={`rounded-full border px-4 py-2 text-[13px] transition ${f === c.k ? "border-ink bg-ink text-paper" : "border-hair text-ink hover:border-ink/40"}`}
            >
              {c.l}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {list.map((w) => (
            <WorkerCard key={w.id} w={w} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Mini({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-tight text-ink">{v}</div>
      <div className="crumb mt-1 text-muted">{l}</div>
    </div>
  );
}

function WorkerCard({ w }: { w: LandingWorker }) {
  const initials = w.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <Link href={`/card/${w.id}`} className="group block" data-reveal>
      <div className="sheet-stack relative flex aspect-[4/3.2] items-center justify-center rounded-2xl border border-hair bg-panel/60">
        {/* back sheets */}
        <div className="sheet sheet-2 absolute h-[62%] w-[66%] rounded-lg border border-hair bg-[#FBF9F4] p-3">
          <div className="crumb text-muted">Vouches · {w.vouches}</div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="mt-2 h-1.5 rounded bg-panel" style={{ width: `${80 - i * 18}%` }} />)}
        </div>
        <div className="sheet sheet-1 absolute h-[62%] w-[66%] rounded-lg border border-hair bg-[#FBF9F4] p-3">
          <div className="crumb text-muted">Rubric · {w.passed}/5</div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mt-1.5 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${i < w.passed ? "bg-cobalt" : "bg-hair"}`} />
              <span className="h-1 flex-1 rounded bg-panel" />
            </div>
          ))}
        </div>
        {/* front sheet: the Skill Card */}
        <div className="sheet sheet-0 dotgrid relative h-[62%] w-[66%] rounded-lg border border-hair bg-[#FBF9F4] p-3 shadow-[0_14px_30px_-18px_rgba(27,29,34,.35)]">
          <div className="flex items-center justify-between">
            <span className="crumb text-muted">Skill Card</span>
            <span className="crumb text-cobalt">✓ Signed</span>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold text-ink" style={{ background: `hsl(${w.hue} 45% 82%)` }}>{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-ink">{w.name}</div>
              <div className="text-[11px] text-muted">{w.emoji} {w.tradeLabel} · {w.level}</div>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <div className="text-2xl font-semibold leading-none text-ink">{w.trustScore}</div>
              <div className="crumb mt-1 text-muted">Trust</div>
            </div>
            <QrGlyph seed={w.hue} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="text-[17px] font-medium text-ink">{w.name}</div>
          <div className="mt-0.5 text-[13px] text-muted">{w.tradeLabel} · {w.area} · {w.jobs} jobs · ★ {w.rating.toFixed(1)}</div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-hair text-ink transition group-hover:border-cobalt group-hover:bg-cobalt group-hover:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function QrGlyph({ seed }: { seed: number }) {
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++) {
      const finder = (i < 2 && j < 2) || (i < 2 && j > 4) || (i > 4 && j < 2);
      if (finder || ((i * 31 + j * 17 + seed * 7) ^ (i * j)) % 5 < 2) cells.push(<rect key={`${i}-${j}`} x={j * 4} y={i * 4} width="3.4" height="3.4" fill="#1B1D22" />);
    }
  return <svg width="30" height="30" viewBox="0 0 28 28">{cells}</svg>;
}

// ============================================================
// Product story — steps left, sticky chat mockup right + language swatches
// ============================================================
const LANGS = {
  hi: { label: "हिन्दी", tint: "#EFE7D6", hello: "नमस्ते! 🙏 अपना नाम, काम और इलाका बताइए।", done: "धन्यवाद रमेश जी! आपकी प्रोफ़ाइल बन गई है।", next: "अब 30 सेकंड का वीडियो भेजें और यह नंबर बोलें: 47" },
  kn: { label: "ಕನ್ನಡ", tint: "#E3E6DA", hello: "ನಮಸ್ಕಾರ! 🙏 ನಿಮ್ಮ ಹೆಸರು, ಕೆಲಸ ಮತ್ತು ಪ್ರದೇಶ ತಿಳಿಸಿ.", done: "ಧನ್ಯವಾದಗಳು ರಮೇಶ್! ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸಿದ್ಧವಾಗಿದೆ.", next: "ಈಗ 30 ಸೆಕೆಂಡಿನ ವೀಡಿಯೊ ಕಳುಹಿಸಿ ಮತ್ತು ಈ ಸಂಖ್ಯೆ ಹೇಳಿ: 47" },
  ta: { label: "தமிழ்", tint: "#EADFD8", hello: "வணக்கம்! 🙏 உங்கள் பெயர், வேலை மற்றும் பகுதியைச் சொல்லுங்கள்.", done: "நன்றி ரமேஷ்! உங்கள் சுயவிவரம் தயாராக உள்ளது.", next: "இப்போது 30 வினாடி வீடியோவை அனுப்பி இந்த எண்ணைச் சொல்லுங்கள்: 47" },
  en: { label: "English", tint: "#E1E3E8", hello: "Namaste! 🙏 Tell us your name, trade and area.", done: "Thank you Ramesh! Your profile is ready.", next: "Now send a 30-second video and say this number: 47" },
} as const;
type LangKey = keyof typeof LANGS;

const STEPS = [
  { t: "It listens first.", d: "Workers send a voice note in Hindi, Kannada, Tamil or English. No app, no form, no spelling — just talk." },
  { t: "It answers in kind.", d: "Every reply is written and spoken back in the worker's own language and script, so nothing is lost in translation." },
  { t: "It never gives you away.", d: "Phone numbers never appear on cards or in employer results. Employers reach workers only through Evalipie.in." },
];

function ProductStory() {
  const [lang, setLang] = useState<LangKey>("hi");
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useFrame(() => {
    const mid = window.innerHeight / 2;
    let best = 0;
    let bestD = Infinity;
    steps.current.forEach((s, i) => {
      if (!s) return;
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  });

  const L = LANGS[lang];
  const ring = (i: number) => (active === i ? "ring-[1.5px] ring-cobalt/45 shadow-[0_8px_24px_-12px_rgba(33,75,212,.6)]" : "");

  return (
    <section id="product" className="relative z-[2] border-t border-hair bg-paper py-28">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 md:grid-cols-2 md:px-10">
        <div>
          <Crumb n="05" label="Product" />
          <h2 className="display-md mt-5 font-medium text-ink" data-reveal>
            An agent that speaks <span className="serif-em text-cobalt">their language.</span>
          </h2>
          <div className="mt-6">
            {STEPS.map((s, i) => (
              <div key={s.t} ref={(el) => { steps.current[i] = el; }} className="flex min-h-[46vh] items-center md:min-h-[62vh]">
                <div className={`transition-opacity duration-500 ${active === i ? "opacity-100" : "opacity-35"}`}>
                  <span className="font-mono text-sm text-cobalt">0{i + 1}</span>
                  <h3 className="display-sm mt-2 font-medium text-ink">{s.t}</h3>
                  <p className="mt-3 max-w-md text-[16px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="md:sticky md:top-24">
            <div className="overflow-hidden rounded-2xl border border-hair bg-[#FBF9F4] shadow-[0_50px_100px_-45px_rgba(27,29,34,.5)]">
              <div className="flex items-center gap-3 border-b border-hair px-4 py-3">
                <span className="overflow-hidden rounded-full"><LogoMark size={30} /></span>
                <div>
                  <div className="text-[14px] font-semibold text-ink">Evalipie.in</div>
                  <div className="text-[11px] text-muted">WhatsApp · Business account</div>
                </div>
                <span className="crumb ml-auto text-muted">{L.label}</span>
              </div>
              <div className="space-y-3 px-4 py-5 transition-colors duration-700" style={{ background: L.tint, minHeight: 360 }}>
                <Bubble className={ring(1)}>{L.hello}</Bubble>
                <Bubble me className={ring(0)}>
                  <span className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 fill-ink" />
                    <span className="flex items-center gap-[2px]">{Array.from({ length: 20 }).map((_, i) => <span key={i} className="w-[2px] rounded bg-ink/40" style={{ height: 4 + ((i * 7) % 12) }} />)}</span>
                    <span className="text-[11px] text-muted">0:09</span>
                  </span>
                </Bubble>
                <Bubble className={ring(1)}>{L.done}</Bubble>
                <Bubble className={ring(2)}>
                  <span className="crumb text-muted">Skill Card</span>
                  <div className="mt-1 flex items-center justify-between gap-6">
                    <span className="text-[13px] font-semibold">Ramesh Kumar · Electrician</span>
                    <span className="text-[11px] text-cobalt">🔒 Phone hidden</span>
                  </div>
                </Bubble>
                <Bubble className={ring(1)}>{L.next}</Bubble>
              </div>
            </div>
            {/* floating swatch bar */}
            <div className="mx-auto -mt-5 flex w-fit items-center gap-1 rounded-full border border-hair bg-paper/95 p-1 shadow-[0_16px_40px_-18px_rgba(27,29,34,.5)] backdrop-blur" role="radiogroup" aria-label="Reply language">
              {(Object.keys(LANGS) as LangKey[]).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={lang === k}
                  onClick={() => setLang(k)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition ${lang === k ? "bg-ink text-paper" : "text-ink hover:bg-panel"}`}
                >
                  <span className="h-3 w-3 rounded-full border border-ink/10" style={{ background: LANGS[k].tint }} />
                  {LANGS[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({ children, me, className = "" }: { children: React.ReactNode; me?: boolean; className?: string }) {
  return (
    <div className={`w-fit max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-snug text-ink shadow-sm transition-shadow ${me ? "ml-auto rounded-tr-sm bg-[#DCE1FF]" : "rounded-tl-sm bg-[#FBF9F4]"} ${className}`}>
      {children}
    </div>
  );
}

// ============================================================
// Feature figures — exploded axonometric layers on a scroll sine
// ============================================================
const FIGS = [
  { title: "The Skill Card", sub: "Identity, rubric and seal — signed together so no layer can change alone.", layers: ["Identity", "5-point rubric", "Signature seal"], kind: "card" as const },
  { title: "The Trust Score", sub: "Three independent signals, weighted 40 / 30 / 30, updated after every job.", layers: ["AI assessment · 40%", "Vouches · 30%", "Jobs & ratings · 30%"], kind: "trust" as const },
  { title: "Fair Wage Shield", sub: "Every offer is laid over the fair market range before the worker sees it.", layers: ["Market range", "Employer offer", "Counter-offer"], kind: "wage" as const },
];

function Figures() {
  const section = useRef<HTMLElement>(null);
  const layers = useRef<(SVGGElement | null)[]>([]);

  useFrame(() => {
    if (!section.current) return;
    const r = section.current.getBoundingClientRect();
    const h = window.innerHeight;
    const p = clamp01((h - r.top) / (r.height + h));
    const s = Math.sin(p * Math.PI);
    layers.current.forEach((g, i) => {
      if (!g) return;
      const level = i % 3;
      g.setAttribute("transform", `translate(0 ${-level * (14 + 46 * s)})`);
    });
  });

  return (
    <section ref={section} id="figures" className="relative z-[2] border-t border-hair bg-paper py-28">
      <div className="mx-auto max-w-[1320px] px-5 md:px-10">
        <div data-reveal>
          <Crumb n="06" label="Architecture" />
          <h2 className="display-md mt-5 font-medium text-ink">
            Three layers of <span className="serif-em text-cobalt">trust.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {FIGS.map((f, fi) => (
            <figure key={f.title} data-reveal>
              <div className="blueprint flex items-center justify-center rounded-2xl border border-hair bg-panel/50 py-6">
                <svg viewBox="0 0 260 300" className="h-[280px] w-full max-w-[300px]" aria-label={`${f.title} exploded diagram`}>
                  {[0, 1, 2].map((li) => (
                    <g key={li} ref={(el) => { layers.current[fi * 3 + li] = el; }}>
                      <Slab cx={130} cy={210} top={li === 2} kind={f.kind} layer={li} />
                    </g>
                  ))}
                </svg>
              </div>
              <figcaption className="mt-5">
                <div className="crumb text-muted">Fig. 0{fi + 2}</div>
                <div className="mt-1 text-xl font-medium text-ink">{f.title}</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.sub}</p>
                <ol className="mt-4 space-y-1.5 text-[13px] text-ink">
                  {[...f.layers].reverse().map((l, i) => (
                    <li key={l} className="flex items-center gap-2 border-t border-hair pt-1.5">
                      <span className="font-mono text-[11px] text-cobalt">{String.fromCharCode(65 + i)}</span>
                      {l}
                    </li>
                  ))}
                </ol>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** An isometric slab: a 100×100 square projected with a 2:1 iso matrix, plus side faces. */
function Slab({ cx, cy, top, kind, layer }: { cx: number; cy: number; top: boolean; kind: "card" | "trust" | "wage"; layer: number }) {
  const T = 7;
  const fill = top ? "#FBF9F4" : layer === 1 ? "#EFEBE1" : "#E9E4D8";
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <polygon points={`86.6,0 0,50 0,${50 + T} 86.6,${T}`} fill="#D9D3C4" stroke="rgba(27,29,34,.25)" strokeWidth="0.6" />
      <polygon points={`-86.6,0 0,50 0,${50 + T} -86.6,${T}`} fill="#CFC8B8" stroke="rgba(27,29,34,.25)" strokeWidth="0.6" />
      <g transform="matrix(0.866 0.5 -0.866 0.5 0 0)">
        <rect x="-50" y="-50" width="100" height="100" fill={fill} stroke="rgba(27,29,34,.35)" strokeWidth="0.7" />
        <SlabContent kind={kind} layer={layer} />
      </g>
    </g>
  );
}

function SlabContent({ kind, layer }: { kind: "card" | "trust" | "wage"; layer: number }) {
  const ink = "#1B1D22";
  const co = "#214BD4";
  if (kind === "card") {
    if (layer === 0)
      return (
        <g>
          <circle cx="-30" cy="-30" r="9" fill="none" stroke={ink} strokeWidth="1.4" />
          <rect x="-15" y="-35" width="45" height="4" fill={ink} opacity=".7" />
          <rect x="-15" y="-26" width="30" height="3" fill={ink} opacity=".35" />
        </g>
      );
    if (layer === 1)
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <circle cx="-34" cy={-34 + i * 16} r="3.5" fill={co} />
              <rect x="-26" y={-35.5 + i * 16} width={50 - i * 5} height="3" fill={ink} opacity=".4" />
            </g>
          ))}
        </g>
      );
    return (
      <g>
        {Array.from({ length: 49 }).map((_, k) => {
          const i = Math.floor(k / 7);
          const j = k % 7;
          const finder = (i < 2 && j < 2) || (i < 2 && j > 4) || (i > 4 && j < 2);
          return finder || (i * 5 + j * 3) % 3 === 0 ? <rect key={k} x={-35 + j * 10} y={-35 + i * 10} width="8" height="8" fill={k % 4 === 0 ? co : ink} /> : null;
        })}
      </g>
    );
  }
  if (kind === "trust") {
    const w = [40, 30, 30][layer];
    const op = [1, 0.6, 0.35][layer];
    return (
      <g>
        <rect x="-40" y="-8" width="80" height="16" fill="none" stroke={ink} strokeWidth="1" opacity=".4" />
        <rect x="-40" y="-8" width={(w / 40) * 80 * 0.85} height="16" fill={co} opacity={op} />
        <text x="0" y="30" textAnchor="middle" fontSize="12" fontFamily="var(--font-dm-sans)" fill={ink}>{w}%</text>
      </g>
    );
  }
  // wage
  if (layer === 0)
    return (
      <g>
        <rect x="-40" y="-4" width="80" height="8" fill={ink} opacity=".12" />
        <rect x="-10" y="-4" width="34" height="8" fill={co} opacity=".35" />
      </g>
    );
  if (layer === 1) return <rect x="-30" y="-12" width="3" height="24" fill="#D9822B" />;
  return (
    <g>
      <rect x="4" y="-12" width="3" height="24" fill={co} />
      <path d="M-27 0 L2 0" stroke={co} strokeWidth="1.5" strokeDasharray="3 3" />
    </g>
  );
}

// ============================================================
// Pricing
// ============================================================
function Pricing() {
  const plans = [
    { name: "Worker", price: "₹0", per: "forever", note: "For electricians, plumbers, masons & carpenters.", items: ["Voice onboarding in your language", "AI skill test with liveness check", "Signed Skill Card + QR sticker", "Job alerts with Fair Wage Shield"], cta: "Start on WhatsApp", href: "/studio" },
    { name: "Contractor", price: "₹999", per: "/ month", note: "For contractors, builders & RWAs hiring nearby.", items: ["Unlimited job posts, by voice or form", "Ranked matches: distance + Trust Score", "Scan-to-verify any toolbox QR", "Vouch for your best crew"], cta: "Post a job", href: "/studio?tab=employer", featured: true },
    { name: "Enterprise", price: "Custom", per: "", note: "For facility managers, platforms & skilling programmes.", items: ["Bulk verification drives", "Credential verification API", "Wage-compliance reporting", "Dedicated onboarding"], cta: "Book a walkthrough", href: "/studio" },
  ];
  return (
    <section id="pricing" className="relative z-[2] border-t border-hair bg-paper py-28">
      <div className="mx-auto max-w-[1320px] px-5 md:px-10">
        <div className="text-center" data-reveal>
          <Crumb n="07" label="Pricing" className="justify-center" />
          <h2 className="display-md mt-5 font-medium text-ink">
            Free for workers. <span className="serif-em text-cobalt">Always.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} data-reveal className={`flex flex-col rounded-2xl border p-7 ${p.featured ? "border-[#214BD4] bg-[#214BD4] text-paper" : "border-hair bg-[#FBF9F4] text-ink"}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{p.name}</span>
                {p.featured && <span className="crumb rounded-full bg-lime px-2.5 py-1 text-ink">Popular</span>}
              </div>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
                <span className={p.featured ? "text-paper/60" : "text-muted"}>{p.per}</span>
              </div>
              <p className={`mt-3 text-[14px] ${p.featured ? "text-paper/70" : "text-muted"}`}>{p.note}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px]">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2.5">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.featured ? "text-lime" : "text-cobalt"}`} />
                    {it}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`mt-8 flex items-center justify-center gap-1.5 rounded-full py-3 text-[14px] font-medium transition ${p.featured ? "bg-lime text-ink hover:bg-white" : "border border-ink/80 text-ink hover:bg-ink hover:text-paper"}`}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Prototype pricing, shown for illustration. Fair-wage ranges are sample data.</p>
      </div>
    </section>
  );
}

// ============================================================
function Footer() {
  return (
    <footer className="relative z-[2] border-t border-hair bg-paper">
      <div className="relative overflow-hidden bg-[#214BD4]" data-reveal>
        <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(#D5DC5C_1px,transparent_1px),linear-gradient(90deg,#D5DC5C_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto flex max-w-[1320px] flex-col items-center gap-6 px-5 py-20 md:px-10 md:py-28">
          <Logotype height={64} color={BRAND_LIME} gap={BRAND_BLUE} className="h-auto w-full max-w-[880px]" />
          <div className="crumb text-[#D5DC5C]/80">Your skill is your ID · आपका हुनर, आपकी पहचान</div>
        </div>
      </div>
      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-20 md:px-10">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div>
            <div className="display-md font-medium text-ink">
              Your skill is <span className="serif-em text-cobalt">your ID.</span>
            </div>
            <div className="mt-3 text-muted">आपका हुनर, आपकी पहचान</div>
          </div>
          <Link href="/studio" className="group flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition hover:bg-cobalt">
            Launch the demo studio <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-hair pt-6 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="font-medium text-ink">Evalipie.in</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#story" className="hover:text-ink">How it works</a>
            <a href="#workers" className="hover:text-ink">Workers</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/studio" className="hover:text-ink">Demo studio</Link>
          </div>
          <div className="crumb">Press ⌘K for commands</div>
        </div>
      </div>
    </footer>
  );
}
