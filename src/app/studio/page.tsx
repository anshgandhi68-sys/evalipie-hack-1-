"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BRAND_BLUE, Globe, LogoMark, Logotype } from "@/components/Brand";
import LiveRecorder from "@/components/LiveRecorder";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCheck,
  Loader2,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  ThumbsUp,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ChatMessage, Criterion, Job, Level, PublicWorker, Snapshot, Trade } from "@/lib/store";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-panel" />,
});

// ------------------------------------------------------------
// Shared UI constants (client-safe)
// ------------------------------------------------------------
const TRADE_META: Record<Trade, { en: string; emoji: string }> = {
  electrician: { en: "Electrician", emoji: "⚡" },
  plumber: { en: "Plumber", emoji: "🔧" },
  mason: { en: "Mason", emoji: "🧱" },
  carpenter: { en: "Carpenter", emoji: "🪚" },
};
const LEVEL_STYLE: Record<Level, string> = {
  Beginner: "bg-[#D9822B]/12 text-[#9A5413]",
  Skilled: "bg-[#2A9D8F]/12 text-[#1D6F65]",
  Expert: "bg-cobalt/10 text-cobalt",
};
const STATES = ["NEW", "AWAITING_PROFILE", "AWAITING_VIDEO", "VERIFIED_IDLE", "JOB_OFFERED", "ACTIVE_JOB", "AWAITING_RATING"] as const;
const STATE_LABEL: Record<(typeof STATES)[number], string> = {
  NEW: "New",
  AWAITING_PROFILE: "Profile",
  AWAITING_VIDEO: "Video",
  VERIFIED_IDLE: "Verified",
  JOB_OFFERED: "Job offered",
  ACTIVE_JOB: "On job",
  AWAITING_RATING: "Rating",
};
const SPEECH_LANG: Record<string, string> = { hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN", bn: "bn-IN", en: "en-IN" };
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const timeStr = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const ago = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
};

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Claim a message for speech across tabs so it is spoken exactly once. */
function claimSpeech(id: string) {
  try {
    const k = `ev-tts-${id}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, String(Date.now()));
  } catch {
    /* storage unavailable — fall back to per-tab dedupe */
  }
  return true;
}

function speechLine(m: ChatMessage): { text: string; lang: string } | null {
  if (!m.text) return null;
  let text = m.text
    .replace(/[*_]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/₹/g, m.lang === "en" ? "rupees " : "रुपये ")
    .split("\n\n")[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
  if (m.kind === "liveness" && m.meta?.code) text = `${text} ${String(m.meta.code).split("").join(" ")}`;
  if (!text) return null;
  return { text, lang: SPEECH_LANG[m.lang || "hi"] || "hi-IN" };
}

const TASKS: Record<Trade, string> = {
  electrician: "Wire a switchboard / socket point",
  plumber: "Fit a tap / join a CPVC pipe",
  mason: "Lay a course of bricks with mortar",
  carpenter: "Make a joint / fix a hinge",
};

/** Render WhatsApp-style *bold* */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <strong key={i} className="font-semibold">
            {p.slice(1, -1)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function useAnimatedNumber(value: number, ms = 900) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return display;
}

const panel = "rounded-2xl border border-hair bg-[#FBF9F4]";
type Toast = { text: string; tone: "ok" | "err" } | null;
type Tab = "map" | "employer" | "god";

// ============================================================
// Page
// ============================================================
export default function DemoStudio() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>("map");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [tts, setTts] = useState(true);
  const spoken = useRef<Set<string>>(new Set());
  const ttsReady = useRef(false);
  // Pause background polling while a request is in flight, so serverless hosts
  // never see overlapping requests (keeps every call on the same warm instance).
  const inFlight = useRef(0);

  const apply = useCallback((s: Snapshot & { error?: string }) => {
    setSnap(s);
    if (s.error) setToast({ text: s.error, tone: "err" });
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current > 0) return;
    try {
      const r = await fetch("/api/jobs", { cache: "no-store" });
      if (r.ok) setSnap(await r.json());
    } catch {
      /* offline – ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Voice-out (Web Speech API) for new bot replies.
  // Guards against "double voice":
  //  • each message is spoken once, even with several studio tabs open (localStorage claim)
  //  • only the visible tab speaks
  //  • new replies cancel anything still playing instead of talking over it
  useEffect(() => {
    try {
      const now = Date.now();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith("ev-tts-") && now - Number(localStorage.getItem(k)) > 10 * 60 * 1000) localStorage.removeItem(k);
      }
    } catch {
      /* storage unavailable */
    }
    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (!snap) return;
    const bots = snap.chat.filter((m) => m.from === "bot");
    if (!ttsReady.current) {
      bots.forEach((m) => spoken.current.add(m.id));
      ttsReady.current = true;
      return;
    }
    const fresh = bots.filter((m) => !spoken.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => spoken.current.add(m.id));
    if (!tts || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (document.visibilityState !== "visible") return;
    const mine = fresh.filter((m) => claimSpeech(m.id));
    if (!mine.length) return;
    const lines = mine.map(speechLine).filter((l): l is { text: string; lang: string } => !!l);
    if (!lines.length) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    window.setTimeout(() => {
      const voices = synth.getVoices();
      lines.forEach(({ text, lang }) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
        if (voice) u.voice = voice;
        u.rate = 1.02;
        synth.speak(u);
      });
    }, 80);
  }, [snap, tts]);

  useEffect(() => {
    if (!tts) window.speechSynthesis?.cancel();
  }, [tts]);

  const sendChat = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      inFlight.current++;
      try {
        const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        apply(await r.json());
      } catch (e) {
        setToast({ text: `Network error: ${(e as Error).message}`, tone: "err" });
      } finally {
        inFlight.current--;
        setBusy(false);
      }
    },
    [apply]
  );

  const godAction = useCallback(
    async (action: string) => {
      inFlight.current++;
      let data: Snapshot & { error?: string; before?: number; after?: number };
      try {
        const r = await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
        data = await r.json();
      } finally {
        inFlight.current--;
      }
      apply(data);
      if (!data.error) {
        if (action === "reset") {
          spoken.current = new Set();
          ttsReady.current = false;
          window.speechSynthesis?.cancel();
          setToast({ text: "Demo reset", tone: "ok" });
        } else if (data.before !== undefined) setToast({ text: `Trust Score ${data.before} → ${data.after}`, tone: "ok" });
      }
    },
    [apply]
  );

  // Deep links from the landing page: /studio?q=<intro text> and /studio?tab=employer
  const booted = useRef(false);
  useEffect(() => {
    if (!snap || booted.current) return;
    booted.current = true;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    if (t === "employer" || t === "god" || t === "map") setTab(t);
    const q = sp.get("q")?.trim();
    if (q || t) window.history.replaceState(null, "", "/studio");
    if (q) {
      (async () => {
        if (snap.demo.state !== "NEW") {
          await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
          spoken.current = new Set();
        }
        await sendChat({ text: q });
      })();
    }
  }, [snap, sendChat]);

  const demoWorker = snap?.workers.find((w) => w.isDemo) ?? null;

  if (!snap) {
    return (
      <div className="paper-site flex h-screen flex-col items-center justify-center gap-4 font-sans">
        <Globe size={56} fg={BRAND_BLUE} bg="#F3EFE6" className="animate-pulse" />
        <div className="flex items-center text-sm text-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting the Evalipie.in demo studio…
        </div>
      </div>
    );
  }

  return (
    <div className="paper-site flex h-screen w-full flex-col overflow-hidden font-sans">
      <TopBar snap={snap} demoWorker={demoWorker} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,34%)_1fr]">
        {/* LEFT: worker's WhatsApp */}
        <section className="relative flex min-h-0 flex-col border-r border-hair bg-panel/50 px-5 pb-4 pt-4">
          <div className="dotgrid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mb-3 flex items-center justify-between">
            <div className="crumb flex items-center gap-2 text-muted">
              <span className="font-mono text-cobalt">A</span> Worker · WhatsApp
            </div>
            <button
              onClick={() => setTts(!tts)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${tts ? "border-cobalt/30 bg-cobalt/[.07] text-cobalt" : "border-hair text-muted hover:text-ink"}`}
              title="Speak bot replies aloud"
            >
              {tts ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Voice replies {tts ? "on" : "off"}
            </button>
          </div>
          <WhatsAppChat snap={snap} busy={busy} send={sendChat} setToast={setToast} />
        </section>

        {/* RIGHT: command centre */}
        <section className="flex min-h-0 min-w-0 flex-col">
          <nav className="flex items-center gap-1 border-b border-hair px-6">
            {(
              [
                ["map", "01", "Live map & feed"],
                ["employer", "02", "Post a job"],
                ["god", "03", "Control room"],
              ] as const
            ).map(([k, n, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3.5 text-[14px] transition ${tab === k ? "border-cobalt text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                <span className={`font-mono text-[11px] ${tab === k ? "text-cobalt" : "text-muted"}`}>{n}</span>
                {label}
              </button>
            ))}
            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <span className="crumb text-muted">Agent state</span>
              <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] text-paper">{snap.demo.state}</span>
            </div>
          </nav>
          <div className="min-h-0 flex-1 overflow-hidden p-6">
            <div className={tab === "map" ? "h-full" : "hidden"}>
              <MapTab snap={snap} />
            </div>
            {tab === "employer" && <EmployerTab snap={snap} apply={apply} setToast={setToast} />}
            {tab === "god" && <GodTab snap={snap} demoWorker={demoWorker} act={godAction} send={sendChat} busy={busy} />}
          </div>
        </section>
      </div>

      {toast && (
        <div
          className={`pop-in fixed bottom-6 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-[0_20px_40px_-15px_rgba(27,29,34,.5)] ${
            toast.tone === "ok" ? "bg-ink text-paper" : "bg-[#C2410C] text-white"
          }`}
        >
          {toast.tone === "ok" ? <Check className="h-4 w-4 text-lime" /> : <ShieldAlert className="h-4 w-4" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Top bar — brand, AI mode, live stats, trust widget
// ============================================================
function TopBar({ snap, demoWorker }: { snap: Snapshot; demoWorker: PublicWorker | null }) {
  const verifiedList = snap.workers.filter((w) => w.verified);
  const openJobs = snap.jobs.filter((j) => j.status !== "completed").length;
  const avgTrust = Math.round(verifiedList.reduce((a, w) => a + w.trustScore, 0) / Math.max(1, verifiedList.length));
  const live = snap.aiMode === "gemini";
  return (
    <header className="relative z-10 flex h-[68px] shrink-0 items-center gap-5 border-b border-hair bg-paper/85 px-6 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2 text-muted transition hover:text-ink" aria-label="Back to Evalipie.in">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Link href="/" aria-label="Evalipie.in home" className="flex items-center">
        <Logotype height={18} color="#1B1D22" globe={BRAND_BLUE} gap="#F3EFE6" />
      </Link>
      <span className="h-5 w-px bg-hair" />
      <span className="crumb text-ink">Demo Studio</span>
      <span
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${live ? "bg-cobalt/10 text-cobalt" : "bg-panel text-muted"}`}
        title={live ? "Live Gemini 2.5 Flash" : "No GEMINI_API_KEY — deterministic demo fallback"}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-cobalt" : "bg-muted"}`} />
        {live ? "Gemini 2.5 Flash · live" : "Demo AI mode"}
      </span>

      <div className="ml-auto flex items-center">
        <Stat label="Verified" value={String(verifiedList.length)} />
        <Stat label="Live jobs" value={String(openJobs)} />
        <Stat label="Avg trust" value={String(avgTrust)} className="hidden xl:block" />
        <Stat label="Wages protected" value={inr(snap.wageProtectedInr)} accent />
      </div>
      <TrustWidget w={demoWorker} />
    </header>
  );
}

function Stat({ label, value, accent, className = "" }: { label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={`border-l border-hair px-4 first:border-l-0 ${className}`}>
      <div className={`text-[17px] font-semibold leading-tight tracking-tight ${accent ? "text-cobalt" : "text-ink"}`}>{value}</div>
      <div className="crumb mt-0.5 text-[9.5px] text-muted">{label}</div>
    </div>
  );
}

function TrustWidget({ w }: { w: PublicWorker | null }) {
  const score = useAnimatedNumber(w?.trustScore ?? 0);
  const [bumpKey, setBumpKey] = useState(0);
  const prev = useRef(w?.trustScore ?? 0);
  useEffect(() => {
    if (w && w.trustScore !== prev.current) {
      prev.current = w.trustScore;
      setBumpKey((k) => k + 1);
    }
  }, [w]);
  if (!w) {
    return (
      <div className="rounded-xl border border-dashed border-ink/20 px-3.5 py-1.5 text-[11px] leading-tight text-muted">
        <div className="crumb text-[9.5px]">Live worker</div>
        awaiting onboarding…
      </div>
    );
  }
  const hist = w.trustHistory.length > 1 ? w.trustHistory : [0, w.trustScore];
  const pts = hist.map((v, i) => `${(i / Math.max(1, hist.length - 1)) * 64},${24 - (v / 100) * 22}`).join(" ");
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cobalt px-3.5 py-1.5 text-white shadow-[0_10px_24px_-14px_rgba(33,75,212,.9)]">
      <div>
        <div className="crumb text-[9.5px] text-lime/90">{w.name.split(" ")[0]}&apos;s trust</div>
        <div key={bumpKey} className="bump text-xl font-semibold leading-none">
          {score}
        </div>
      </div>
      <svg width="64" height="26" className="overflow-visible">
        <polyline points={pts} fill="none" stroke="#D5DC5C" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ============================================================
// WhatsApp chat (authentic WhatsApp inside a refined device)
// ============================================================
function WhatsAppChat({
  snap,
  busy,
  send,
  setToast,
}: {
  snap: Snapshot;
  busy: boolean;
  send: (p: Record<string, unknown>) => Promise<void>;
  setToast: (t: Toast) => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecsRef = useRef(0);
  const [camOpen, setCamOpen] = useState(false);
  const [localVideos, setLocalVideos] = useState<Record<string, string>>({});
  const state = snap.demo.state;
  const hosted = typeof window !== "undefined" && !/^(localhost|127\.|\[::1\])/.test(window.location.hostname);
  const maxUploadMb = hosted ? 3.2 : 19;
  const lastCount = useRef(0);

  useEffect(() => {
    if (snap.chat.length !== lastCount.current || busy) {
      lastCount.current = snap.chat.length;
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }
  }, [snap.chat.length, busy]);

  const submitText = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    await send({ text: t });
  };

  const startRec = async () => {
    window.speechSynthesis?.cancel(); // don't record the bot's own voice
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const b64 = await fileToBase64(blob);
        await send({ audioBase64: b64, audioMime: (rec.mimeType || "audio/webm").split(";")[0], audioSeconds: recSecsRef.current });
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecSecs(0);
      recSecsRef.current = 0;
      timer.current = setInterval(() => {
        recSecsRef.current += 1;
        setRecSecs(recSecsRef.current);
      }, 1000);
    } catch {
      setToast({ text: "Microphone blocked — use “Demo Hindi voice” instead", tone: "err" });
    }
  };
  const stopRec = () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    recRef.current?.stop();
  };

  const sendVideo = async (blob: Blob, mime: string, name: string) => {
    const url = URL.createObjectURL(blob);
    setLocalVideos((v) => ({ ...v, [name]: url }));
    const b64 = await fileToBase64(blob);
    await send({ videoBase64: b64, videoMime: mime || "video/mp4", videoName: name });
  };

  const onVideo = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > maxUploadMb * 1024 * 1024) {
      setToast({ text: `Video too large (max ~${maxUploadMb} MB here). Use “Record live” — it compresses automatically.`, tone: "err" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    await sendVideo(f, f.type || "video/mp4", f.name);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onLiveSend = (blob: Blob, mime: string) => {
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    void sendVideo(blob, mime, `live_${Date.now().toString(36)}.${ext}`);
  };

  const openCamera = () => {
    if (state !== "AWAITING_VIDEO") {
      setToast({ text: "Finish the voice intro first — the bot will then ask for your skill video.", tone: "err" });
      return;
    }
    setCamOpen(true);
  };

  const demoName = snap.workers.find((w) => w.isDemo)?.name;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* device */}
      <div className="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col overflow-hidden rounded-[30px] border border-ink/15 bg-white p-[5px] shadow-[0_40px_80px_-40px_rgba(27,29,34,.55),0_0_0_6px_rgba(255,255,255,.6)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[25px]">
          {/* WA header */}
          <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white">
            <div className="h-9 w-9 overflow-hidden rounded-full">
              <LogoMark size={36} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[15px] font-semibold leading-tight">
                Evalipie.in <BadgeCheck className="h-4 w-4 fill-[#25D366] text-[#008069]" />
              </div>
              <div className="truncate text-[11px] text-white/80">{busy ? "typing…" : `Business account · ${demoName ? `chatting with ${demoName}` : "online"}`}</div>
            </div>
            <Video className="h-5 w-5 opacity-90" />
            <Phone className="h-5 w-5 opacity-90" />
            <MoreVertical className="h-5 w-5 opacity-90" />
          </div>

          {/* Messages */}
          <div ref={scroller} className="wa-wall scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
            <div className="mx-auto mb-2 w-fit max-w-[92%] rounded-md bg-[#ffeecd] px-3 py-1 text-center text-[11px] text-[#54656f] shadow-sm">
              🔒 Messages are end-to-end encrypted. Your phone number is never shown to employers.
            </div>
            {snap.chat.length === 0 && <EmptyChat />}
            {snap.chat.map((m) => (
              <Bubble key={m.id} m={m} snap={snap} send={send} busy={busy} onRecord={openCamera} videoUrl={m.kind === "video" ? localVideos[m.text.replace(/^📹\s*/, "")] : undefined} />
            ))}
            {busy && (
              <div className="flex">
                <div className="typing rounded-lg rounded-tl-none bg-white px-4 py-3 text-xl leading-none text-slate-400 shadow-sm">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0])} />
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
              <button onClick={() => fileRef.current?.click()} disabled={busy} title="Upload skill video" className="text-[#54656f] hover:text-[#008069] disabled:opacity-40">
                <Paperclip className="h-5 w-5" />
              </button>
              <button onClick={openCamera} disabled={busy} title="Record live skill video" className={`disabled:opacity-40 ${state === "AWAITING_VIDEO" ? "text-[#008069]" : "text-[#54656f] hover:text-[#008069]"}`}>
                <Camera className="h-5 w-5" />
              </button>
              {recording ? (
                <div className="flex flex-1 items-center gap-2 text-sm text-rose-600">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> Recording… 0:{String(recSecs).padStart(2, "0")}
                </div>
              ) : (
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitText()}
                  placeholder={state === "JOB_OFFERED" ? "Reply 1, 2 or 3" : "Message"}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              )}
            </div>
            {text.trim() && !recording ? (
              <button onClick={submitText} disabled={busy} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white shadow disabled:opacity-50" aria-label="Send">
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={recording ? stopRec : startRec}
                disabled={busy}
                title={recording ? "Stop & send" : "Record voice note"}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow disabled:opacity-50 ${recording ? "bg-rose-500" : "bg-[#00a884]"}`}
              >
                {recording ? <Square className="h-4 w-4 fill-white" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo shortcuts */}
      <div className="relative mx-auto mt-3 w-full max-w-[480px]">
        <div className="crumb mb-2 text-center text-[10px] text-muted">Demo shortcuts</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <QuickBtn disabled={busy} onClick={() => send({ demoMode: "hindi_voice" })} active={state === "NEW" || state === "AWAITING_PROFILE"}>
            <Mic className="h-3.5 w-3.5" /> Hindi voice note
          </QuickBtn>
          <QuickBtn disabled={busy} onClick={openCamera} active={state === "AWAITING_VIDEO"}>
            <Camera className="h-3.5 w-3.5" /> Record live video
          </QuickBtn>
          <QuickBtn disabled={busy} onClick={() => send({ demoMode: "good_wiring" })}>
            <Video className="h-3.5 w-3.5" /> Good wiring video
          </QuickBtn>
          <QuickBtn disabled={busy} onClick={() => send({ demoMode: "unsafe_wiring" })} warn>
            <ShieldAlert className="h-3.5 w-3.5" /> Unsafe video
          </QuickBtn>
        </div>
      </div>

      <LiveRecorder
        open={camOpen}
        code={snap.demo.livenessCode}
        task={(() => {
          const t = snap.workers.find((w) => w.isDemo)?.trade;
          return t ? TASKS[t] : undefined;
        })()}
        onClose={() => setCamOpen(false)}
        onSend={onLiveSend}
      />
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="mx-auto mt-8 max-w-[84%] rounded-xl bg-white/95 p-5 text-center shadow-sm">
      <Globe size={40} fg={BRAND_BLUE} bg="#ffffff" className="mx-auto" />
      <div className="mt-3 text-[15px] font-semibold text-[#111b21]">Start onboarding</div>
      <p className="mt-1 text-[13px] leading-snug text-[#54656f]">
        Say <b>“hi”</b>, record a voice note, or tap <b>Hindi voice note</b> below. Every reply is spoken back in the worker&apos;s language.
      </p>
    </div>
  );
}

function QuickBtn({ children, onClick, disabled, active, warn }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; warn?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-40 ${
        warn
          ? "border-[#D9822B]/40 bg-[#D9822B]/[.08] text-[#9A5413] hover:bg-[#D9822B]/15"
          : active
            ? "border-ink bg-ink text-paper shadow-[0_8px_18px_-10px_rgba(27,29,34,.7)]"
            : "border-hair bg-[#FBF9F4] text-ink hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function Bubble({
  m,
  snap,
  send,
  busy,
  onRecord,
  videoUrl,
}: {
  m: ChatMessage;
  snap: Snapshot;
  send: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  onRecord: () => void;
  videoUrl?: string;
}) {
  const mine = m.from === "user";
  const base = `pop-in relative max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-1 text-[14px] leading-snug text-[#111b21] shadow-sm ${
    mine ? "ml-auto rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white"
  }`;
  const meta = (
    <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781]">
      {timeStr(m.ts)}
      {mine && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
    </div>
  );
  const translation = m.translation ? <div className="mt-1 border-t border-black/5 pt-1 text-[11.5px] italic text-[#667781]">🌐 {m.translation}</div> : null;

  if (m.kind === "voice") {
    const transcript = (m.meta?.transcript as string) || "";
    const secs = Number(m.meta?.seconds ?? 6);
    return (
      <div className={base} style={{ minWidth: 240 }}>
        <div className="flex items-center gap-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Play className="h-4 w-4 fill-white" />
          </div>
          <div className="flex h-6 flex-1 items-center gap-[2px]">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} className="w-[3px] rounded-full bg-[#8696a0]" style={{ height: `${6 + ((i * 37) % 17)}px` }} />
            ))}
          </div>
          <span className="text-[11px] text-[#667781]">0:{String(secs).padStart(2, "0")}</span>
        </div>
        {transcript && <div className="mt-1 rounded bg-black/5 px-2 py-1 text-[12px] text-[#3b4a54]">📝 {transcript}</div>}
        {meta}
      </div>
    );
  }

  if (m.kind === "video") {
    const demo = m.meta?.demo as string | undefined;
    if (videoUrl && !demo) {
      return (
        <div className={base} style={{ width: 240 }}>
          <video src={videoUrl} controls playsInline className="h-40 w-full rounded-md bg-black object-cover" />
          <div className="mt-1 flex items-center gap-1 truncate text-[12px] text-[#3b4a54]">
            {m.text.includes("live_") ? <span className="rounded bg-rose-500 px-1 text-[9px] font-bold text-white">LIVE</span> : null}
            {m.text}
          </div>
          {meta}
        </div>
      );
    }
    return (
      <div className={base} style={{ width: 240 }}>
        <div className={`relative flex h-36 items-center justify-center overflow-hidden rounded-md ${demo === "unsafe_wiring" ? "bg-gradient-to-br from-[#7c2d12] to-slate-900" : "bg-gradient-to-br from-slate-600 to-slate-900"}`}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff1 0 6px,transparent 6px 12px)" }} />
          <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="h-6 w-6 fill-white" />
          </div>
          <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white">🎥 0:30</span>
        </div>
        <div className="mt-1 truncate text-[12px] text-[#3b4a54]">{m.text}</div>
        {meta}
      </div>
    );
  }

  if (m.kind === "liveness") {
    const code = String(m.meta?.code ?? "--");
    return (
      <div className={base}>
        <Rich text={m.text} />
        <div className="my-2 flex items-center justify-center gap-2.5">
          {code.split("").map((d, i) => (
            <span key={i} className="flex h-14 w-12 items-center justify-center rounded-lg bg-[#214BD4] text-3xl font-semibold text-[#D5DC5C] shadow-inner">
              {d}
            </span>
          ))}
        </div>
        <div className="text-center text-[11px] text-[#667781]">Anti-fraud: proves it&apos;s really you, live 🔐</div>
        {snap.demo.state === "AWAITING_VIDEO" && snap.demo.livenessCode === code && (
          <button onClick={onRecord} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#00a884] py-2 text-[13px] font-semibold text-white hover:bg-[#008069] disabled:opacity-50">
            <Camera className="h-4 w-4" /> Record live video now
          </button>
        )}
        {translation}
        {meta}
      </div>
    );
  }

  if (m.kind === "assessment") {
    const a = m.meta?.assessment as
      | { liveness_passed: boolean; flagged_suspicious: boolean; criteria: Criterion[]; score_0_100: number; level: Level; source: string }
      | undefined;
    if (!a) return null;
    const ok = a.liveness_passed && !a.flagged_suspicious && a.score_0_100 >= 45;
    const ring = ok ? "#214BD4" : "#C2410C";
    return (
      <div className={base} style={{ width: 320 }}>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#214BD4]">AI skill assessment</div>
          <span className="rounded bg-[#214BD4]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#214BD4]">{a.source === "gemini" ? "Gemini 2.5 Flash" : "Demo AI"}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E9E4D8" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={ring} strokeWidth="3.5" strokeDasharray={`${(a.score_0_100 / 100) * 97.4} 97.4`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">{a.score_0_100}</div>
          </div>
          <div className="text-[12px]">
            <div className={`font-semibold ${ok ? "text-[#214BD4]" : "text-[#C2410C]"}`}>{ok ? `✓ Verified · ${a.level}` : a.liveness_passed ? "Not certified — unsafe" : "Liveness failed"}</div>
            <div className="text-[#667781]">Liveness code {a.liveness_passed ? "✓ matched" : "✗ not detected"}</div>
            <div className="text-[#667781]">Deepfake / replay {a.flagged_suspicious ? "⚠ suspicious" : "✓ clear"}</div>
          </div>
        </div>
        <ul className="mt-2 space-y-1">
          {a.criteria.map((c, i) => (
            <li key={i} className="flex gap-1.5 text-[12px]">
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${c.passed ? "bg-[#214BD4]" : "bg-[#C2410C]"}`}>{c.passed ? "✓" : "✗"}</span>
              <span>
                <b className="font-semibold">{c.name}</b>
                <span className="block text-[11px] text-[#667781]">{c.observation}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 rounded bg-[#f0f2f5] px-2 py-1.5 text-[13px]">
          <Rich text={m.text} />
        </div>
        {meta}
      </div>
    );
  }

  if (m.kind === "card") {
    const id = String(m.meta?.workerId ?? "");
    const w = snap.workers.find((x) => x.id === id);
    return (
      <div className={base} style={{ width: 300 }}>
        <Rich text={m.text} />
        {w && (
          <a href={`/card/${w.id}`} target="_blank" rel="noreferrer" className="relative mt-2 block overflow-hidden rounded-xl bg-[#214BD4] p-3 text-white shadow-md transition hover:scale-[1.02]">
            <div className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(#D5DC5C_1px,transparent_1px),linear-gradient(90deg,#D5DC5C_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative flex items-center justify-between">
              <Logotype height={9} color="#D5DC5C" gap="#214BD4" />
              <span className="text-[9px] uppercase tracking-[0.18em] text-[#D5DC5C]/80">Skill Card</span>
            </div>
            <div className="relative mt-2.5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#D5DC5C] text-base font-semibold text-[#1B1D22]">
                {w.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <div className="font-semibold">{w.name}</div>
                <div className="text-[12px] text-white/75">
                  {TRADE_META[w.trade].emoji} {TRADE_META[w.trade].en} · {w.level}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-semibold leading-none">{w.trustScore}</div>
                <div className="text-[9px] uppercase text-white/60">Trust</div>
              </div>
            </div>
            <div className="relative mt-2 flex items-center justify-between text-[11px] text-[#D5DC5C]">
              <span>✓ Cryptographically signed</span>
              <span className="flex items-center gap-0.5">
                Open card <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </a>
        )}
        {translation}
        {meta}
      </div>
    );
  }

  if (m.kind === "job") {
    const jobId = String(m.meta?.jobId ?? "");
    const active = snap.demo.state === "JOB_OFFERED" && snap.demo.pendingJobId === jobId;
    const counter = Number(m.meta?.counter ?? 0);
    const below = m.meta?.fairStatus === "below";
    return (
      <div className={`${base} border-l-4 ${below ? "border-[#D9822B]" : "border-[#214BD4]"}`} style={{ width: 320 }}>
        <div className="whitespace-pre-wrap">
          <Rich text={m.text} />
        </div>
        {translation}
        {meta}
        <div className="-mx-2.5 mt-1 grid grid-cols-3 border-t border-black/10 text-[12.5px] font-semibold text-[#00a884]">
          {[
            ["1", "✅ Accept"],
            ["2", "❌ Skip"],
            ["3", `💬 ${inr(counter)}`],
          ].map(([v, l]) => (
            <button key={v} disabled={!active || busy} onClick={() => send({ text: v })} className="border-r border-black/10 py-2 last:border-r-0 hover:bg-black/5 disabled:cursor-not-allowed disabled:text-slate-400">
              {l}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="whitespace-pre-wrap">
        <Rich text={m.text} />
      </div>
      {translation}
      {meta}
    </div>
  );
}

// ============================================================
// Tab 1 — Map & Feed
// ============================================================
const FEED_STYLE: Record<string, string> = {
  onboard: "bg-panel text-ink",
  verify: "bg-cobalt/10 text-cobalt",
  fail: "bg-[#C2410C]/10 text-[#C2410C]",
  job: "bg-ink text-paper",
  match: "bg-cobalt/10 text-cobalt",
  accept: "bg-cobalt text-white",
  counter: "bg-[#D9822B]/12 text-[#9A5413]",
  complete: "bg-lime text-ink",
  vouch: "bg-[#2A9D8F]/12 text-[#1D6F65]",
  wage: "bg-[#D9822B]/12 text-[#9A5413]",
  system: "bg-panel text-muted",
};

function MapTab({ snap }: { snap: Snapshot }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid h-full grid-cols-[1fr_minmax(260px,330px)] gap-5">
      <div className={`${panel} relative min-h-0 overflow-hidden p-1.5`}>
        <LiveMap workers={snap.workers} jobs={snap.jobs} />
        <div className="pointer-events-none absolute right-4 top-4 z-[1000] rounded-xl border border-hair bg-paper/90 px-3 py-2 text-right backdrop-blur">
          <div className="crumb text-[9.5px] text-muted">Bengaluru · live</div>
          <div className="text-[13px] font-medium text-ink">
            {snap.workers.filter((w) => w.verified).length} verified workers · {snap.jobs.filter((j) => j.status !== "completed").length} live jobs
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex max-w-[calc(100%-2rem)] flex-wrap gap-x-3 gap-y-1 whitespace-nowrap rounded-xl border border-hair bg-paper/90 px-3 py-2 text-[11px] text-ink backdrop-blur">
          <Legend c="#214BD4" l="Expert" />
          <Legend c="#2A9D8F" l="Skilled" />
          <Legend c="#D9822B" l="Beginner" />
          <Legend c="#C2410C" l="On a job" ring />
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-[3px] border-2 border-ink bg-paper" /> Job
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-cobalt bg-lime" /> Live worker
          </span>
        </div>
      </div>

      <div className={`${panel} flex min-h-0 flex-col`}>
        <div className="flex items-center justify-between border-b border-hair px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cobalt opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cobalt" />
            </span>
            Live activity
          </div>
          <span className="crumb text-[10px] text-muted">{snap.events.length} events</span>
        </div>
        <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {snap.events.map((e) => (
            <li key={e.id} className="pop-in border-b border-hair px-4 py-3 last:border-b-0">
              <div className="mb-1 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${FEED_STYLE[e.type]}`}>{e.type}</span>
                <span className="text-[10.5px] text-muted">{ago(e.ts)}</span>
              </div>
              <p className="text-[13px] leading-snug text-ink/85">{e.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Legend({ c, l, ring }: { c: string; l: string; ring?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={ring ? { border: `2px solid ${c}` } : { background: c }} />
      {l}
    </span>
  );
}

// ============================================================
// Tab 2 — Employer job post
// ============================================================
function EmployerTab({ snap, apply, setToast }: { snap: Snapshot; apply: (s: Snapshot & { error?: string }) => void; setToast: (t: Toast) => void }) {
  const [form, setForm] = useState({ employer: "Sharma Constructions", trade: "electrician" as Trade, area: "Koramangala", duration_days: 3, daily_wage: 700, required_level: "Skilled" as Level });
  const [posting, setPosting] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const range = snap.fairWages[form.trade][form.required_level];
  const below = form.daily_wage > 0 && form.daily_wage < range[0];
  const suggested = Math.max(range[0], Math.round((range[0] + range[1]) / 2 / 50) * 50);
  const lastJob: Job | undefined = snap.jobs.find((j) => j.id === lastJobId);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - range[0] * 0.6) / (range[1] * 1.25 - range[0] * 0.6)) * 100));

  const post = async (extra: Record<string, unknown> = {}) => {
    setPosting(true);
    try {
      const r = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.keys(extra).length ? { employer: form.employer, ...extra } : form) });
      const data = await r.json();
      if (!r.ok || data.error) {
        setToast({ text: data.error || "Failed to post", tone: "err" });
        return;
      }
      apply(data);
      setLastJobId(data.job.id);
      setTranscript(data.transcript ?? null);
      if (data.transcript) {
        const j = data.job as Job;
        setForm((f) => ({ ...f, trade: j.trade, area: j.area, duration_days: j.duration_days, daily_wage: j.original_wage, required_level: j.required_level }));
      }
      const dw = snap.workers.find((w) => w.isDemo);
      const alerted = dw && (data.job as Job).assignedWorkerId === dw.id;
      setToast({ text: alerted ? `WhatsApp alert sent to ${dw!.name}` : `Job posted · ${(data.job as Job).matches.length} matches`, tone: "ok" });
    } finally {
      setPosting(false);
    }
  };

  const toggleVoice = async () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        await post({ audioBase64: await fileToBase64(blob), audioMime: (rec.mimeType || "audio/webm").split(";")[0] });
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setToast({ text: "Mic blocked — use the demo voice job", tone: "err" });
    }
  };

  const input = "mt-1 w-full rounded-xl border border-hair bg-white px-3 py-2.5 text-[14px] font-normal normal-case tracking-normal text-ink transition focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/15";
  const label = "crumb text-[10px] text-muted";

  return (
    <div className="grid h-full grid-cols-[minmax(330px,410px)_1fr] gap-5 overflow-hidden">
      <div className="scroll-thin space-y-4 overflow-y-auto pr-1">
        <div className={`${panel} p-5`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="crumb text-[10px] text-muted">Employer</div>
              <h3 className="mt-1 text-[22px] font-medium leading-tight text-ink">
                Post a <span className="serif-em text-cobalt">job</span>
              </h3>
            </div>
            <div className="flex gap-1.5">
              <button onClick={toggleVoice} disabled={posting} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${recording ? "border-rose-500 bg-rose-500 text-white" : "border-hair text-ink hover:border-ink/40"}`}>
                {recording ? <Square className="h-3 w-3 fill-white" /> : <Mic className="h-3.5 w-3.5" />} {recording ? "Stop" : "Voice"}
              </button>
              <button onClick={() => post({ demoMode: "employer_voice" })} disabled={posting} className="flex items-center gap-1.5 rounded-full bg-cobalt/10 px-3 py-1.5 text-[12px] font-medium text-cobalt hover:bg-cobalt/15">
                <Sparkles className="h-3.5 w-3.5" /> Demo
              </button>
            </div>
          </div>
          {transcript && <div className="serif-em mb-4 rounded-xl bg-panel px-3 py-2 text-[15px] leading-snug text-ink">“{transcript}”</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className={`col-span-2 ${label}`}>
              Employer
              <input className={input} value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
            </label>
            <label className={label}>
              Trade
              <select className={input} value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value as Trade })}>
                {(Object.keys(TRADE_META) as Trade[]).map((t) => (
                  <option key={t} value={t}>
                    {TRADE_META[t].emoji} {TRADE_META[t].en}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Level
              <select className={input} value={form.required_level} onChange={(e) => setForm({ ...form, required_level: e.target.value as Level })}>
                {(["Beginner", "Skilled", "Expert"] as Level[]).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Area
              <select className={input} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                {snap.areas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Days
              <input type="number" min={1} className={input} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
            </label>
            <label className={`col-span-2 ${label}`}>
              Daily wage (₹)
              <input type="number" min={100} step={50} className={`${input} ${below ? "border-[#D9822B]" : ""}`} value={form.daily_wage} onChange={(e) => setForm({ ...form, daily_wage: Number(e.target.value) })} />
            </label>
          </div>

          {/* Fair Wage Shield */}
          <div className={`mt-4 rounded-xl border p-3.5 ${below ? "flash-amber border-[#D9822B]/50 bg-[#D9822B]/[.07]" : "border-cobalt/25 bg-cobalt/[.05]"}`}>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              {below ? <ShieldAlert className="h-4 w-4 text-[#D9822B]" /> : <ShieldCheck className="h-4 w-4 text-cobalt" />}
              Fair Wage Shield
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${below ? "bg-[#D9822B] text-white" : "bg-cobalt text-white"}`}>{below ? "Below fair" : "Fair"}</span>
            </div>
            {/* range bar */}
            <div className="relative mt-3 h-2 rounded-full bg-panel">
              <span className="absolute inset-y-0 rounded-full bg-cobalt/25" style={{ left: `${pct(range[0])}%`, right: `${100 - pct(range[1])}%` }} />
              <span className={`absolute -top-1 h-4 w-1 rounded-full ${below ? "bg-[#D9822B]" : "bg-cobalt"}`} style={{ left: `${pct(form.daily_wage)}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted">
              <span>
                Your offer <b className="text-ink">{inr(form.daily_wage)}</b>
              </span>
              <span>
                Fair {inr(range[0])}–{inr(range[1])}
              </span>
            </div>
            {below && (
              <div className="mt-2.5 flex items-center justify-between gap-2 text-[12px] text-ink">
                <span>{Math.round(((range[0] - form.daily_wage) / range[0]) * 100)}% below the fair range.</span>
                <button onClick={() => setForm({ ...form, daily_wage: suggested })} className="rounded-full bg-ink px-3 py-1 text-[11.5px] font-medium text-paper hover:bg-cobalt">
                  Use {inr(suggested)}
                </button>
              </div>
            )}
            <div className="mt-2 text-[10px] text-muted">{snap.fairWageSource}</div>
          </div>

          <button onClick={() => post()} disabled={posting} className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-[14px] font-medium text-paper transition hover:bg-cobalt disabled:opacity-60">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post job & match workers
          </button>
        </div>
      </div>

      <div className={`${panel} scroll-thin min-h-0 overflow-y-auto p-5`}>
        <div className="flex items-end justify-between">
          <div>
            <div className="crumb text-[10px] text-muted">Matching</div>
            <h3 className="mt-1 text-[22px] font-medium leading-tight text-ink">
              Ranked <span className="serif-em text-cobalt">matches</span>
            </h3>
          </div>
          {lastJob && (
            <span className="text-[12px] text-muted">
              {lastJob.employer} · {lastJob.area}
            </span>
          )}
        </div>
        {!lastJob ? (
          <div className="mt-6 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-ink/15 text-center">
            <Globe size={44} fg={BRAND_BLUE} bg="#FBF9F4" />
            <p className="mt-3 max-w-xs text-[13.5px] text-muted">Post a job to see workers ranked by Haversine distance and Trust Score.</p>
          </div>
        ) : (
          <>
            {lastJob.fairWage.status === "below" && (
              <div className="mt-4 rounded-xl border border-[#D9822B]/40 bg-[#D9822B]/[.07] p-3 text-[12.5px] text-ink">
                🛡️ Posted at {inr(lastJob.original_wage)}/day — workers see a Fair Wage warning and a 1-tap counter-offer of <b>{inr(lastJob.fairWage.suggested)}</b>.
              </div>
            )}
            {lastJob.matches.length === 0 && <div className="mt-4 text-[13px] text-muted">No verified, available workers within 25 km for this trade and level.</div>}
            <ul className="mt-4 divide-y divide-hair">
              {lastJob.matches.map((m, i) => {
                const w = snap.workers.find((x) => x.id === m.workerId);
                const assigned = lastJob.assignedWorkerId === m.workerId;
                return (
                  <li key={m.workerId} className={`flex items-center gap-3 py-3 ${assigned ? "rounded-xl bg-cobalt/[.05] px-2" : ""}`}>
                    <div className="w-6 font-mono text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold text-ink" style={{ background: `hsl(${w?.avatarHue ?? 140} 45% 82%)` }}>
                      {m.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate whitespace-nowrap text-[14px] font-medium text-ink">
                        {m.name}
                        {w?.isDemo && <span className="rounded-full bg-lime px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-ink">Live</span>}
                        {assigned && <span className="rounded-full bg-cobalt px-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">{lastJob.status}</span>}
                      </div>
                      <div className="truncate whitespace-nowrap text-[12px] text-muted">
                        <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium ${LEVEL_STYLE[m.level]}`}>{m.level}</span>
                        {m.distanceKm} km · {w?.jobsCompleted ?? 0} jobs · {w?.vouches.length ?? 0} vouches
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[18px] font-semibold leading-none text-ink">{m.trustScore}</div>
                      <div className="crumb mt-1 text-[9px] text-muted">Trust</div>
                    </div>
                    <div className="w-12 text-right">
                      <div className="text-[15px] font-semibold leading-none text-cobalt">{m.matchScore}</div>
                      <div className="crumb mt-1 text-[9px] text-muted">Match</div>
                    </div>
                    <a href={`/card/${m.workerId}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full border border-hair text-ink transition hover:border-cobalt hover:bg-cobalt hover:text-white" aria-label="Open Skill Card">
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[11px] text-muted">Match score = 60% Trust Score + 40% proximity (Haversine, ≤25 km). Phone numbers are never shared.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Tab 3 — Control room
// ============================================================
function GodTab({
  snap,
  demoWorker,
  act,
  send,
  busy,
}: {
  snap: Snapshot;
  demoWorker: PublicWorker | null;
  act: (a: string) => Promise<void>;
  send: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<void>) => {
    setRunning(key);
    try {
      await fn();
    } finally {
      setRunning(null);
    }
  };
  const fastForward = async () => {
    if (snap.demo.state === "NEW" || snap.demo.state === "AWAITING_PROFILE") await send({ demoMode: "hindi_voice" });
    await send({ demoMode: "good_wiring" });
  };
  const b = demoWorker?.breakdown;
  const current = snap.demo.state;
  const curIdx = STATES.indexOf(current as (typeof STATES)[number]);

  const actions = [
    { key: "ff", n: "A", title: "Fast-forward onboarding", desc: "Hindi voice → good video → signed card", icon: <Sparkles className="h-4 w-4" />, fn: fastForward },
    { key: "vouch", n: "B", title: "Simulate employer vouch", desc: "+1 verified vouch · about +10 Trust", icon: <ThumbsUp className="h-4 w-4" />, fn: () => act("vouch") },
    { key: "rate", n: "C", title: "Complete job & rate 5★", desc: "Close the loop · live Trust Score jump", icon: <Star className="h-4 w-4" />, fn: () => act("complete_and_rate"), primary: true },
    { key: "reset", n: "D", title: "Reset demo", desc: "Re-seed 20 workers · clear chat", icon: <RotateCcw className="h-4 w-4" />, fn: () => act("reset") },
  ];

  return (
    <div className="scroll-thin h-full space-y-5 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.key}
            disabled={!!running || busy}
            onClick={() => run(a.key, a.fn)}
            className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-60 ${a.primary ? "border-cobalt bg-cobalt text-white shadow-[0_20px_40px_-24px_rgba(33,75,212,.9)]" : "border-hair bg-[#FBF9F4] text-ink hover:border-ink/30"}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${a.primary ? "bg-lime text-ink" : "bg-panel text-ink"}`}>
              {running === a.key ? <Loader2 className="h-4 w-4 animate-spin" /> : a.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                <span className={`font-mono text-[11px] ${a.primary ? "text-lime" : "text-cobalt"}`}>{a.n}</span>
                {a.title}
              </div>
              <div className={`mt-0.5 text-[12.5px] ${a.primary ? "text-white/75" : "text-muted"}`}>{a.desc}</div>
            </div>
            <ArrowUpRight className={`ml-auto h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${a.primary ? "text-lime" : "text-muted"}`} />
          </button>
        ))}
      </div>

      {/* State machine stepper */}
      <div className={`${panel} p-5`}>
        <div className="flex items-center justify-between">
          <div className="crumb text-[10px] text-muted">WhatsApp agent · state machine</div>
          <span className="font-mono text-[11px] text-cobalt">{current}</span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {STATES.map((s, i) => (
            <div key={s}>
              <div className={`h-1 rounded-full ${i < curIdx ? "bg-cobalt" : i === curIdx ? "bg-lime" : "bg-panel"}`} />
              <div className={`mt-2 flex items-center gap-1 text-[11.5px] ${i === curIdx ? "font-semibold text-ink" : i < curIdx ? "text-cobalt" : "text-muted"}`}>
                {i < curIdx && <Check className="h-3 w-3" />}
                {STATE_LABEL[s]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust breakdown */}
      <div className={`${panel} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="crumb text-[10px] text-muted">Live worker</div>
            <h3 className="mt-1 text-[22px] font-medium leading-tight text-ink">
              Trust Score <span className="serif-em text-cobalt">breakdown</span>
            </h3>
          </div>
          {demoWorker?.verified && (
            <a href={`/card/${demoWorker.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full border border-hair px-3 py-1.5 text-[12px] font-medium text-ink hover:border-cobalt hover:text-cobalt">
              Open Skill Card <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {!demoWorker || !b ? (
          <div className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-[13.5px] text-muted">No live worker yet — start onboarding in the WhatsApp panel.</div>
        ) : (
          <div className="flex items-center gap-7">
            <BigScore value={demoWorker.trustScore} />
            <div className="flex-1 space-y-4">
              <Bar label="AI skill assessment" w="40%" value={b.ai} max={40} color="bg-cobalt" detail={`${demoWorker.aiScore}/100`} />
              <Bar label="Verified vouches" w="30%" value={b.vouches} max={30} color="bg-[#2A9D8F]" detail={`${demoWorker.vouches.length} vouches`} />
              <Bar
                label="Jobs & ratings"
                w="30%"
                value={b.jobs}
                max={30}
                color="bg-[#D9822B]"
                detail={`${demoWorker.jobsCompleted} jobs · ${demoWorker.ratings.length ? (demoWorker.ratings.reduce((a, c) => a + c, 0) / demoWorker.ratings.length).toFixed(1) : "–"}★`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-ink p-5 text-paper">
        <div className="crumb text-[10px] text-lime">3-minute demo script</div>
        <ol className="mt-3 grid gap-x-6 gap-y-2 text-[13px] leading-snug text-paper/85 md:grid-cols-2">
          <li><span className="font-mono text-lime">01</span> Tap <b>Hindi voice note</b> → profile extracted, reply spoken in Hindi.</li>
          <li><span className="font-mono text-lime">02</span> Tap <b>Unsafe video</b> → rejected with a safety tip.</li>
          <li><span className="font-mono text-lime">03</span> Tap <b>Good wiring video</b> → rubric, score, signed Skill Card.</li>
          <li><span className="font-mono text-lime">04</span> <b>Post a job</b>: Electrician · Koramangala · ₹700 → Fair Wage Shield.</li>
          <li><span className="font-mono text-lime">05</span> In WhatsApp tap <b>💬 ₹1,000</b> → counter-offer accepted.</li>
          <li><span className="font-mono text-lime">06</span> <b>Complete job & rate 5★</b> → Trust jumps; open the card + QR.</li>
        </ol>
      </div>
    </div>
  );
}

function BigScore({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E9E4D8" strokeWidth="2.6" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#214BD4" strokeWidth="2.6" strokeDasharray={`${(v / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight text-ink">{v}</div>
        <div className="crumb text-[9px] text-muted">Trust</div>
      </div>
    </div>
  );
}

function Bar({ label, w, value, max, color, detail }: { label: string; w: string; value: number; max: number; color: string; detail: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12.5px]">
        <span className="text-ink">
          {label} <span className="text-muted">· {w}</span>
        </span>
        <span className="text-muted">
          {detail} · <b className="text-ink">{value.toFixed(1)}</b>/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
