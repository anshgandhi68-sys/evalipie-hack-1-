import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Languages,
  Lock,
  MapPin,
  Mic,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { BrandLink, LogoMark, Wordmark } from "@/components/Brand";
import { TRADE_LABEL, getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Landing() {
  const s = getStore();
  const verified = s.workers.filter((w) => w.verified);
  const avgTrust = Math.round(verified.reduce((a, w) => a + w.trustScore, 0) / Math.max(1, verified.length));
  const jobsDone = verified.reduce((a, w) => a + w.jobsCompleted, 0);
  const featured = [...verified].sort((a, b) => b.trustScore - a.trustScore).filter((w, i, arr) => arr.findIndex((x) => x.trade === w.trade) === i).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-400/30">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 sm:px-8">
          <BrandLink />
          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#trust" className="transition hover:text-white">Trust Score</a>
            <a href="#employers" className="transition hover:text-white">For employers</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href={`/card/${featured[0]?.id ?? "w01"}`} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block">
              Sample card
            </Link>
            <Link href="/studio" className="group flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300">
              Launch live demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="absolute right-0 top-40 h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" /> Voice-first AI on WhatsApp · Powered by Gemini
              </div>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Your skill is
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">your ID.</span>
              </h1>
              <p className="mt-3 text-lg font-medium text-slate-400">आपका हुनर, आपकी पहचान</p>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Evalipie.in turns a 30-second WhatsApp video into a cryptographically signed Skill Card for India&apos;s electricians, plumbers, masons and carpenters —
                then matches them to nearby jobs at a fair wage. No forms, no certificates, no English required.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/studio" className="group flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-semibold text-emerald-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-300">
                  Try the live demo <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={`/card/${featured[0]?.id ?? "w01"}`}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  <QrCode className="h-5 w-5" /> View a Skill Card
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Works in Hindi, Kannada, Tamil & more</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> No app download</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Phone number stays private</span>
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        {/* ---------------- Live stats ---------------- */}
        <section className="border-y border-white/5 bg-slate-900/40">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4">
            <Stat value={String(verified.length)} label="Verified workers in the live network" />
            <Stat value={String(avgTrust)} label="Average Trust Score / 100" />
            <Stat value={jobsDone.toLocaleString("en-IN")} label="Jobs completed & rated" />
            <Stat value={inr(s.wageProtectedInr)} label="Wages protected by Fair Wage Shield" accent />
          </div>
          <p className="pb-4 text-center text-[11px] text-slate-500">Live figures from the demo network (Bengaluru, seeded sample data)</p>
        </section>

        {/* ---------------- Problem ---------------- */}
        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHead eyebrow="The problem" title="Skilled hands, invisible on paper" sub="Millions of tradespeople learn on the job. Without a certificate, their skill can't be proven — so they get paid less and trusted less." />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <Problem icon={<Fingerprint className="h-5 w-5" />} title="No proof of skill" body="Years of experience, zero documents. Employers can't tell an expert from a beginner, so everyone is treated like a beginner." />
            <Problem icon={<Wallet className="h-5 w-5" />} title="Underpaid by default" body="Without market data, workers accept whatever is offered. Lowball daily wages go unchallenged." />
            <Problem icon={<Users className="h-5 w-5" />} title="Trapped in middlemen" body="Work comes through contractors and word of mouth. Good work done for one employer never follows the worker to the next." />
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how" className="relative border-y border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHead eyebrow="How it works" title="One closed loop, entirely on WhatsApp" sub="From a voice note to a better-paid job — and every completed job makes the worker's identity stronger." />
            <ol className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: <Mic className="h-5 w-5" />, t: "Speak, don't type", d: "The worker sends a voice note in their own language. AI extracts name, trade, experience and area." },
                { icon: <Video className="h-5 w-5" />, t: "30-second skill video", d: "A random liveness code is spoken on camera. Gemini grades the work against a 5-point trade rubric — safety first." },
                { icon: <BadgeCheck className="h-5 w-5" />, t: "Signed Skill Card + QR", d: "A tamper-proof digital card with level, rubric and Trust Score. A QR sticker goes on the toolbox." },
                { icon: <MapPin className="h-5 w-5" />, t: "Hyper-local job match", d: "Employers post by form or voice. Workers are ranked by distance and Trust Score and alerted on WhatsApp." },
                { icon: <ShieldCheck className="h-5 w-5" />, t: "Fair Wage Shield", d: "Lowball offers are flagged against fair market ranges. One tap sends a counter-offer." },
                { icon: <TrendingUp className="h-5 w-5" />, t: "Rate & grow", d: "Completed jobs and employer vouches raise the Trust Score live — unlocking better-paid work." },
              ].map((s, i) => (
                <li key={s.t} className="group relative rounded-2xl border border-white/5 bg-slate-900/60 p-6 transition hover:border-emerald-400/30 hover:bg-slate-900">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20 transition group-hover:bg-emerald-400 group-hover:text-emerald-950">{s.icon}</span>
                    <span className="font-mono text-sm text-slate-600">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHead eyebrow="Built for trust" title="Hard to fake. Easy to use." sub="Every design decision serves a worker with a basic smartphone and an employer who needs proof." />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <Feature className="lg:col-span-2" icon={<Eye className="h-5 w-5" />} title="Liveness-checked AI assessment" body="A fresh 2-digit code must be spoken on camera, so replayed, borrowed or AI-generated videos are flagged. Unsafe practice — like working on a live circuit — is caught and coached, not certified.">
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {["Power isolated at MCB", "Correct colour coding", "Tight terminals", "Earthing connected", "Insulated tools"].map((c) => (
                  <span key={c} className="flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-2.5 py-2 text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{c}</span>
                ))}
                <span className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-2 text-rose-300">⚠ Live-wire work → rejected</span>
              </div>
            </Feature>
            <Feature icon={<Languages className="h-5 w-5" />} title="Voice-first, any language" body="Bot replies are written and spoken back in the worker's language. Built for people who would rather talk than type." />
            <Feature icon={<Lock className="h-5 w-5" />} title="Cryptographically signed" body="Every Skill Card is HMAC-SHA256 signed. Change one field and verification fails — instantly, for anyone who scans it." />
            <Feature icon={<Wallet className="h-5 w-5" />} title="Fair Wage Shield" body="Each offer is checked against trade × level wage ranges. Workers see the gap and counter in one tap." />
            <Feature icon={<EyeOff className="h-5 w-5" />} title="Privacy by design" body="Phone numbers never appear on cards or in employer results. Employers reach workers only through Evalipie.in." />
          </div>
        </section>

        {/* ---------------- Trust Score ---------------- */}
        <section id="trust" className="border-y border-white/5 bg-slate-900/40 py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              <SectionHead align="left" eyebrow="Trust Score" title="A reputation that travels with the worker" sub="One transparent number, built from three independent signals. It updates the moment a job is rated." />
              <ul className="mt-8 space-y-3 text-sm text-slate-400">
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" /><span><b className="text-white">40% AI skill assessment</b> — the graded video rubric</span></li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal-400" /><span><b className="text-white">30% verified vouches</b> — past employers confirm real work</span></li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" /><span><b className="text-white">30% jobs & ratings</b> — every completed, rated job on the platform</span></li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-7 shadow-2xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Ramesh K. · Electrician</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300"><TrendingUp className="h-3 w-3" /> +27 this month</span>
              </div>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-6xl font-bold tracking-tight text-white">62</span>
                <span className="mb-2 text-slate-500">/ 100</span>
              </div>
              <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-violet-400" style={{ width: "35%" }} />
                <div className="h-full bg-teal-400" style={{ width: "10%" }} />
                <div className="h-full bg-amber-400" style={{ width: "17%" }} />
              </div>
              <div className="mt-6 space-y-2 text-sm">
                {[
                  ["Verified as Expert by AI", "35"],
                  ["Vouch: Sharma Constructions", "+10"],
                  ["Job completed · ⭐ 5.0", "+17"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2.5">
                    <span className="text-slate-300">{l}</span>
                    <span className="font-mono font-semibold text-emerald-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Workers / Employers ---------------- */}
        <section id="employers" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHead eyebrow="Two sides, one network" title="Built for workers. Trusted by employers." />
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <Audience
              tag="For workers"
              title="Prove your skill once. Get paid fairly every time."
              points={["Onboard with a voice note — in your language", "Free, signed Skill Card + QR toolbox sticker", "Job alerts nearby, with fair-wage warnings", "One-tap counter-offers on lowball jobs", "Your number is never shared"]}
            />
            <Audience
              tag="For employers & contractors"
              title="Hire verified hands near your site — in minutes."
              points={["Post a job by voice or a 30-second form", "Workers ranked by distance + Trust Score", "See the rubric behind every level", "Scan any toolbox QR to verify on the spot", "Build a reliable crew through vouches"]}
              accent
            />
          </div>
        </section>

        {/* ---------------- Featured workers ---------------- */}
        <section className="border-t border-white/5 bg-slate-900/40 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHead align="left" eyebrow="Live network" title="Top verified workers right now" />
              <Link href="/studio" className="flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200">Open the live map <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((w) => (
                <Link key={w.id} href={`/card/${w.id}`} className="group rounded-2xl border border-white/5 bg-slate-950/60 p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-slate-950" style={{ background: `hsl(${w.avatarHue} 70% 62%)` }}>
                      {w.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate font-semibold text-white">{w.name} <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" /></div>
                      <div className="text-xs text-slate-400">{TRADE_LABEL[w.trade].emoji} {TRADE_LABEL[w.trade].en} · {w.area}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold text-white">{w.trustScore}</div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Trust Score</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div className="mb-1 inline-block rounded-full bg-emerald-400/10 px-2 py-0.5 font-medium text-emerald-300">{w.level}</div>
                      <div className="flex items-center justify-end gap-1"><Briefcase className="h-3 w-3" /> {w.jobsCompleted} jobs <Star className="ml-1 h-3 w-3 fill-amber-400 text-amber-400" /> {(w.ratings.reduce((a, b) => a + b, 0) / Math.max(1, w.ratings.length)).toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-500 transition group-hover:text-emerald-300">View Skill Card <ArrowRight className="h-3 w-3" /></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/60 via-slate-900 to-slate-950 px-8 py-16 text-center sm:px-16">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[100px]" />
            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-5xl">See the whole loop in 3 minutes.</h2>
            <p className="relative mx-auto mt-4 max-w-2xl text-slate-400">Voice onboarding, a liveness-checked video, a signed Skill Card, a fair-wage job match and a live Trust Score jump — side by side with the WhatsApp chat.</p>
            <div className="relative mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/studio" className="group flex items-center gap-2 rounded-xl bg-emerald-400 px-7 py-3.5 font-semibold text-emerald-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-300">
                Launch the demo studio <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={28} />
            <div>
              <Wordmark className="text-white" />
              <div className="text-xs">Your skill is your ID · आपका हुनर, आपकी पहचान</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#how" className="hover:text-slate-300">How it works</a>
            <a href="#features" className="hover:text-slate-300">Features</a>
            <Link href="/studio" className="hover:text-slate-300">Demo studio</Link>
          </div>
          <div className="text-xs">Fair-wage ranges shown are illustrative sample data. © {new Date().getFullYear()} Evalipie.in</div>
        </div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      {/* phone */}
      <div className="relative rounded-[2.6rem] border border-white/10 bg-slate-900 p-2.5 shadow-2xl shadow-black/60">
        <div className="overflow-hidden rounded-[2.1rem] bg-[#efeae2]">
          <div className="flex items-center gap-2.5 bg-[#008069] px-4 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white"><LogoMark size={26} /></div>
            <div className="text-sm font-semibold leading-tight">Evalipie.in<div className="text-[10px] font-normal text-white/75">Business account</div></div>
          </div>
          <div className="wa-wall space-y-2 px-3 py-4 text-[12.5px] leading-snug text-[#111b21]">
            <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00a884] text-[9px] text-white">▶</span>
                <span className="flex items-center gap-[2px]">{Array.from({ length: 18 }).map((_, i) => <span key={i} className="w-[2px] rounded bg-[#8696a0]" style={{ height: 4 + ((i * 7) % 11) }} />)}</span>
                <span className="text-[10px] text-[#667781]">0:09</span>
              </div>
            </div>
            <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
              धन्यवाद रमेश जी! 🙏 अब 30 सेकंड का वीडियो भेजें और यह नंबर बोलें:
              <div className="mt-2 flex gap-1.5">
                <span className="flex h-9 w-8 items-center justify-center rounded-md bg-[#008069] text-lg font-black text-white">4</span>
                <span className="flex h-9 w-8 items-center justify-center rounded-md bg-[#008069] text-lg font-black text-white">7</span>
              </div>
            </div>
            <div className="w-fit max-w-[88%] rounded-lg rounded-tl-none border-l-4 border-amber-400 bg-white px-3 py-2 shadow-sm">
              🔔 <b>नया काम!</b> Electrician · Koramangala (0.4 km)
              <br />💰 ₹700/दिन · 🛡️ <span className="text-amber-700">18% below fair range</span>
              <div className="mt-2 grid grid-cols-3 border-t border-black/10 pt-1.5 text-center text-[11px] font-semibold text-[#00a884]">
                <span>✅ Accept</span><span>❌ Skip</span><span>💬 ₹1,000</span>
              </div>
            </div>
            <div className="ml-auto w-fit rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-1.5 shadow-sm">3</div>
            <div className="w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">🎉 Employer accepted ₹1,000/day! You earn <b>₹900 more</b>.</div>
          </div>
        </div>
      </div>

      {/* floating skill card */}
      <div className="absolute -left-6 -bottom-10 hidden w-60 rotate-[-4deg] rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-900 to-slate-950 p-4 shadow-2xl shadow-emerald-900/40 sm:block lg:-left-16">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-emerald-300/70">
          <span>Skill Card</span>
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-sm font-black text-emerald-950">RK</div>
          <div>
            <div className="text-sm font-semibold text-white">Ramesh Kumar</div>
            <div className="text-[11px] text-emerald-100/70">⚡ Electrician · Expert</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-emerald-200">
          <span>✓ Cryptographically verified</span>
          <span className="text-base font-bold text-white">62</span>
        </div>
      </div>

      {/* floating trust chip */}
      <div className="absolute -right-3 top-16 hidden items-center gap-2 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl sm:flex lg:-right-10">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <div className="text-xs">
          <div className="text-slate-400">Trust Score</div>
          <div className="font-bold text-white">45 → 62 <span className="text-emerald-400">▲</span></div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub, align = "center" }: { eyebrow: string; title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-400">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{sub}</p>}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className={`text-3xl font-bold tracking-tight sm:text-4xl ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
      <div className="mt-1.5 text-xs text-slate-400 sm:text-sm">{label}</div>
    </div>
  );
}

function Problem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function Feature({ icon, title, body, className = "", children }: { icon: React.ReactNode; title: string; body: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/80 to-slate-900/30 p-6 transition hover:border-white/10 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      {children}
    </div>
  );
}

function Audience({ tag, title, points, accent }: { tag: string; title: string; points: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border p-8 ${accent ? "border-cyan-400/20 bg-gradient-to-br from-cyan-950/40 to-slate-950" : "border-emerald-400/20 bg-gradient-to-br from-emerald-950/40 to-slate-950"}`}>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accent ? "bg-cyan-400/10 text-cyan-300" : "bg-emerald-400/10 text-emerald-300"}`}>{tag}</span>
      <h3 className="mt-5 text-2xl font-bold tracking-tight text-white">{title}</h3>
      <ul className="mt-6 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-sm text-slate-300">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent ? "text-cyan-400" : "text-emerald-400"}`} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
