"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  BadgeCheck,
  Briefcase,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  MapPin,
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
  Users,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import type { ChatMessage, Criterion, Job, Level, PublicWorker, Snapshot, Trade } from "@/lib/store";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-xl bg-slate-900 animate-pulse" />,
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
  Beginner: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  Skilled: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  Expert: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
};
const STATES = ["NEW", "AWAITING_PROFILE", "AWAITING_VIDEO", "VERIFIED_IDLE", "JOB_OFFERED", "ACTIVE_JOB", "AWAITING_RATING"] as const;
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

// ============================================================
// Page
// ============================================================
export default function DemoStudio() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<"map" | "employer" | "god">("map");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [tts, setTts] = useState(true);
  const spoken = useRef<Set<string>>(new Set());
  const ttsReady = useRef(false);

  const apply = useCallback((s: Snapshot & { error?: string }) => {
    setSnap(s);
    if (s.error) setToast({ text: s.error, tone: "err" });
  }, []);

  const refresh = useCallback(async () => {
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

  // ---- Voice-out (Web Speech API) for new bot replies
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
    fresh.forEach((m) => {
      if (m.kind === "assessment" || m.kind === "card") {
        if (!m.text) return;
      }
      const clean = m.text
        .replace(/[*_]/g, "")
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace(/₹/g, m.lang === "en" ? "rupees " : "रुपये ")
        .split("\n\n")[0]
        .slice(0, 260);
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = SPEECH_LANG[m.lang || "hi"] || "hi-IN";
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang === u.lang);
      if (voice) u.voice = voice;
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    });
  }, [snap, tts]);

  const sendChat = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        apply(await r.json());
      } catch (e) {
        setToast({ text: `Network error: ${(e as Error).message}`, tone: "err" });
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const godAction = useCallback(
    async (action: string) => {
      const r = await fetch("/api/jobs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await r.json();
      apply(data);
      if (!data.error) {
        if (action === "reset") {
          spoken.current = new Set();
          ttsReady.current = false;
          window.speechSynthesis?.cancel();
          setToast({ text: "Demo reset ✓", tone: "ok" });
        } else if (data.before !== undefined) setToast({ text: `Trust Score ${data.before} → ${data.after}`, tone: "ok" });
      }
    },
    [apply]
  );

  const demoWorker = snap?.workers.find((w) => w.isDemo) ?? null;

  if (!snap) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Booting HunarID…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-200">
      {/* LEFT: WhatsApp */}
      <section className="flex h-full w-[40%] min-w-[380px] flex-col border-r border-slate-800 bg-slate-900 p-4">
        <WhatsAppChat snap={snap} busy={busy} tts={tts} setTts={setTts} send={sendChat} setToast={setToast} />
      </section>

      {/* RIGHT: Dashboard */}
      <section className="flex h-full w-[60%] flex-col">
        <Header snap={snap} demoWorker={demoWorker} />
        <nav className="flex gap-1 border-b border-slate-800 px-5">
          {(
            [
              ["map", "Live Map & Feed", MapPin],
              ["employer", "Employer Job Post", Briefcase],
              ["god", "Demo God-Mode", Zap],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === k ? "border-emerald-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <div className={tab === "map" ? "h-full" : "hidden"}>
            <MapTab snap={snap} />
          </div>
          {tab === "employer" && <EmployerTab snap={snap} apply={apply} setToast={setToast} />}
          {tab === "god" && <GodTab snap={snap} demoWorker={demoWorker} act={godAction} send={sendChat} busy={busy} />}
        </div>
      </section>

      {toast && (
        <div
          className={`pop-in fixed bottom-6 left-1/2 z-[2000] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-2xl ${
            toast.tone === "ok" ? "bg-emerald-500 text-emerald-950" : "bg-rose-500 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Header with KPIs + live trust widget
// ============================================================
function Header({ snap, demoWorker }: { snap: Snapshot; demoWorker: PublicWorker | null }) {
  const verified = snap.workers.filter((w) => w.verified).length;
  const openJobs = snap.jobs.filter((j) => j.status !== "completed").length;
  const avgTrust = Math.round(snap.workers.filter((w) => w.verified).reduce((a, w) => a + w.trustScore, 0) / Math.max(1, verified));
  return (
    <header className="flex items-center gap-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-lg font-black text-slate-950 shadow-lg shadow-emerald-500/20">
          H
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">HunarID</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                snap.aiMode === "gemini" ? "bg-violet-500/15 text-violet-300 ring-violet-500/30" : "bg-slate-700/50 text-slate-300 ring-slate-600"
              }`}
              title={snap.aiMode === "gemini" ? "Live Gemini 2.5 Flash" : "No GEMINI_API_KEY — deterministic demo fallback"}
            >
              {snap.aiMode === "gemini" ? "● Gemini 2.5 Flash live" : "● Demo AI mode"}
            </span>
          </div>
          <p className="text-xs text-slate-400">Your skill is your ID · आपका हुनर, आपकी पहचान</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="Verified" value={String(verified)} />
        <Kpi icon={<Briefcase className="h-3.5 w-3.5" />} label="Live jobs" value={String(openJobs)} />
        <Kpi icon={<Activity className="h-3.5 w-3.5" />} label="Avg trust" value={String(avgTrust)} />
        <Kpi icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Wages protected" value={inr(snap.wageProtectedInr)} accent />
        <TrustWidget w={demoWorker} />
      </div>
    </header>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-bold ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
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
      <div className="rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-xs text-slate-500">
        Live worker
        <br />
        <span className="text-slate-400">awaiting onboarding…</span>
      </div>
    );
  }
  const hist = w.trustHistory.length > 1 ? w.trustHistory : [0, w.trustScore];
  const max = 100;
  const pts = hist.map((v, i) => `${(i / Math.max(1, hist.length - 1)) * 60},${22 - (v / max) * 20}`).join(" ");
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-emerald-400/80">{w.name.split(" ")[0]}&apos;s Trust</div>
        <div key={bumpKey} className="bump text-xl font-black leading-none text-white">
          {score}
        </div>
      </div>
      <svg width="60" height="24" className="overflow-visible">
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ============================================================
// WhatsApp chat
// ============================================================
function WhatsAppChat({
  snap,
  busy,
  tts,
  setTts,
  send,
  setToast,
}: {
  snap: Snapshot;
  busy: boolean;
  tts: boolean;
  setTts: (v: boolean) => void;
  send: (p: Record<string, unknown>) => Promise<void>;
  setToast: (t: { text: string; tone: "ok" | "err" } | null) => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const state = snap.demo.state;
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
        const secs = recSecsRef.current;
        await send({ audioBase64: b64, audioMime: (rec.mimeType || "audio/webm").split(";")[0], audioSeconds: secs });
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
      setToast({ text: "Microphone permission denied — use 🎙️ Demo Hindi Voice instead", tone: "err" });
    }
  };
  const recSecsRef = useRef(0);
  const stopRec = () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    recRef.current?.stop();
  };

  const onVideo = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 19 * 1024 * 1024) {
      setToast({ text: "Video too large (max ~19MB). Trim to 30s or use the demo video button.", tone: "err" });
      return;
    }
    const b64 = await fileToBase64(f);
    await send({ videoBase64: b64, videoMime: f.type || "video/mp4", videoName: f.name });
    if (fileRef.current) fileRef.current.value = "";
  };

  const demoName = snap.workers.find((w) => w.isDemo)?.name;

  return (
    <div className="mx-auto flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] border-[6px] border-slate-800 bg-black shadow-2xl shadow-black/50">
      {/* WA header */}
      <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base font-black text-[#008069]">H</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] font-semibold leading-tight">
            HunarID <BadgeCheck className="h-4 w-4 fill-[#25D366] text-[#008069]" />
          </div>
          <div className="truncate text-[11px] text-white/80">{busy ? "typing…" : `Business account · ${demoName ? `chatting with ${demoName}` : "online"}`}</div>
        </div>
        <button onClick={() => setTts(!tts)} title="Voice replies" className="rounded-full p-1.5 hover:bg-white/10">
          {tts ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-70" />}
        </button>
        <Video className="h-5 w-5 opacity-90" />
        <Phone className="h-5 w-5 opacity-90" />
        <MoreVertical className="h-5 w-5 opacity-90" />
      </div>

      {/* Messages */}
      <div ref={scroller} className="wa-wall scroll-thin flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        <div className="mx-auto mb-2 w-fit rounded-md bg-[#ffeecd] px-3 py-1 text-center text-[11px] text-[#54656f] shadow-sm">
          🔒 Messages are end-to-end encrypted. Your phone number is never shown to employers.
        </div>
        {snap.chat.length === 0 && (
          <div className="mx-auto mt-10 max-w-[80%] rounded-lg bg-white/90 p-4 text-center text-sm text-[#54656f] shadow">
            👋 Say <b>&quot;hi&quot;</b>, record a voice note, or tap <b>🎙️ Demo Hindi Voice</b> below to start onboarding.
          </div>
        )}
        {snap.chat.map((m) => (
          <Bubble key={m.id} m={m} snap={snap} send={send} busy={busy} />
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

      {/* Quick test buttons */}
      <div className="flex gap-1.5 overflow-x-auto bg-[#f0f2f5] px-2 pt-2 scroll-thin">
        <QuickBtn disabled={busy} onClick={() => send({ demoMode: "hindi_voice" })} highlight={state === "NEW" || state === "AWAITING_PROFILE"}>
          🎙️ Demo Hindi Voice
        </QuickBtn>
        <QuickBtn disabled={busy} onClick={() => send({ demoMode: "good_wiring" })} highlight={state === "AWAITING_VIDEO"}>
          📹 Demo Good Wiring Video
        </QuickBtn>
        <QuickBtn disabled={busy} onClick={() => send({ demoMode: "unsafe_wiring" })} warn>
          ⚠️ Demo Unsafe Video
        </QuickBtn>
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0])} />
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
          <button onClick={() => fileRef.current?.click()} disabled={busy} title="Upload skill video" className="text-[#54656f] hover:text-[#008069] disabled:opacity-40">
            <Paperclip className="h-5 w-5" />
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
              className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          )}
        </div>
        {text.trim() && !recording ? (
          <button onClick={submitText} disabled={busy} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white shadow disabled:opacity-50">
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
  );
}

function QuickBtn({ children, onClick, disabled, highlight, warn }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; highlight?: boolean; warn?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-40 ${
        warn
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : highlight
            ? "border-[#00a884] bg-[#d9fdd3] text-[#005c4b] ring-2 ring-[#00a884]/30"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Bubble({ m, snap, send, busy }: { m: ChatMessage; snap: Snapshot; send: (p: Record<string, unknown>) => Promise<void>; busy: boolean }) {
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
  const translation = m.translation ? (
    <div className="mt-1 border-t border-black/5 pt-1 text-[11.5px] italic text-[#667781]">🌐 {m.translation}</div>
  ) : null;

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
    return (
      <div className={base} style={{ width: 240 }}>
        <div
          className={`relative flex h-36 items-center justify-center overflow-hidden rounded-md ${
            demo === "unsafe_wiring" ? "bg-gradient-to-br from-rose-900 to-slate-900" : "bg-gradient-to-br from-slate-700 to-slate-900"
          }`}
        >
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
        <div className="my-2 flex items-center justify-center gap-3">
          {code.split("").map((d, i) => (
            <span key={i} className="flex h-14 w-12 items-center justify-center rounded-lg bg-[#008069] text-3xl font-black text-white shadow-inner">
              {d}
            </span>
          ))}
        </div>
        <div className="text-center text-[11px] text-[#667781]">Anti-fraud: proves it&apos;s really you, live 🔐</div>
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
    const ring = a.score_0_100 >= 80 ? "#10b981" : a.score_0_100 >= 45 ? "#0ea5e9" : "#ef4444";
    return (
      <div className={base} style={{ width: 320 }}>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-[#008069]">🤖 AI Skill Assessment</div>
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{a.source === "gemini" ? "Gemini 2.5 Flash" : "Demo AI"}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={ring} strokeWidth="3.5" strokeDasharray={`${(a.score_0_100 / 100) * 97.4} 97.4`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-black">{a.score_0_100}</div>
          </div>
          <div className="text-[12px]">
            <div className={`font-bold ${ok ? "text-emerald-700" : "text-rose-600"}`}>{ok ? `✅ Verified · ${a.level}` : a.liveness_passed ? "🛑 Not certified — unsafe" : "🚫 Liveness failed"}</div>
            <div className="text-[#667781]">Liveness code {a.liveness_passed ? "✓ matched" : "✗ not detected"}</div>
            <div className="text-[#667781]">Deepfake / replay {a.flagged_suspicious ? "⚠️ suspicious" : "✓ clear"}</div>
          </div>
        </div>
        <ul className="mt-2 space-y-1">
          {a.criteria.map((c, i) => (
            <li key={i} className="flex gap-1.5 text-[12px]">
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${c.passed ? "bg-emerald-500" : "bg-rose-500"}`}>
                {c.passed ? "✓" : "✗"}
              </span>
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
          <a href={`/card/${w.id}`} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#0f172a] p-3 text-white shadow-md transition hover:scale-[1.02]">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-emerald-200/80">
              <span>HunarID · Skill Card</span>
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-lg font-black text-emerald-950">{w.name[0]}</div>
              <div>
                <div className="font-bold">{w.name}</div>
                <div className="text-[12px] text-emerald-100/80">
                  {TRADE_META[w.trade].emoji} {TRADE_META[w.trade].en} · {w.level}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-black leading-none">{w.trustScore}</div>
                <div className="text-[9px] uppercase text-emerald-200/70">Trust</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200">
              <span>✓ Cryptographically signed</span>
              <span className="flex items-center gap-1">
                Open card <ExternalLink className="h-3 w-3" />
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
      <div className={`${base} ${below ? "border-l-4 border-amber-400" : "border-l-4 border-emerald-400"}`} style={{ width: 320 }}>
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
  onboard: "bg-sky-500/15 text-sky-300",
  verify: "bg-emerald-500/15 text-emerald-300",
  fail: "bg-rose-500/15 text-rose-300",
  job: "bg-indigo-500/15 text-indigo-300",
  match: "bg-violet-500/15 text-violet-300",
  accept: "bg-emerald-500/15 text-emerald-300",
  counter: "bg-amber-500/15 text-amber-300",
  complete: "bg-yellow-500/15 text-yellow-300",
  vouch: "bg-teal-500/15 text-teal-300",
  wage: "bg-orange-500/15 text-orange-300",
  system: "bg-slate-500/15 text-slate-300",
};

function MapTab({ snap }: { snap: Snapshot }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid h-full grid-cols-[1fr_320px] gap-4">
      <div className="relative min-h-0 rounded-xl border border-slate-800 bg-slate-900">
        <LiveMap workers={snap.workers} jobs={snap.jobs} />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex gap-3 rounded-lg bg-slate-950/85 px-3 py-2 text-[11px] text-slate-300 backdrop-blur">
          <Legend c="#34d399" l="Expert" />
          <Legend c="#38bdf8" l="Skilled" />
          <Legend c="#f59e0b" l="Beginner" />
          <Legend c="#f97316" l="On job" ring />
          <span>💼 Job</span>
          <span className="text-emerald-300">● Live worker</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live Activity
          </div>
          <span className="text-[11px] text-slate-500">{snap.events.length} events</span>
        </div>
        <ul className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {snap.events.map((e) => (
            <li key={e.id} className="pop-in rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FEED_STYLE[e.type]}`}>{e.type}</span>
                <span className="text-[10px] text-slate-500">{ago(e.ts)}</span>
              </div>
              <p className="text-[12.5px] leading-snug text-slate-300">{e.text}</p>
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
function EmployerTab({
  snap,
  apply,
  setToast,
}: {
  snap: Snapshot;
  apply: (s: Snapshot & { error?: string }) => void;
  setToast: (t: { text: string; tone: "ok" | "err" } | null) => void;
}) {
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
      setToast({ text: alerted ? `📲 WhatsApp alert sent to ${dw!.name}` : `Job posted · ${(data.job as Job).matches.length} matches`, tone: "ok" });
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
      setToast({ text: "Mic blocked — use the demo voice button", tone: "err" });
    }
  };

  const input = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none";

  return (
    <div className="grid h-full grid-cols-[minmax(320px,400px)_1fr] gap-5 overflow-hidden">
      <div className="scroll-thin space-y-4 overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">Post a job</h3>
            <div className="flex gap-2">
              <button onClick={toggleVoice} disabled={posting} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${recording ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
                {recording ? <Square className="h-3 w-3 fill-white" /> : <Mic className="h-3.5 w-3.5" />} {recording ? "Stop" : "Voice"}
              </button>
              <button onClick={() => post({ demoMode: "employer_voice" })} disabled={posting} className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/30">
                <Sparkles className="h-3.5 w-3.5" /> Demo voice job
              </button>
            </div>
          </div>
          {transcript && <div className="mb-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-xs text-violet-200">🎙️ “{transcript}”</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs text-slate-400">
              Employer
              <input className={input} value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} />
            </label>
            <label className="text-xs text-slate-400">
              Trade
              <select className={input} value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value as Trade })}>
                {(Object.keys(TRADE_META) as Trade[]).map((t) => (
                  <option key={t} value={t}>
                    {TRADE_META[t].emoji} {TRADE_META[t].en}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Required level
              <select className={input} value={form.required_level} onChange={(e) => setForm({ ...form, required_level: e.target.value as Level })}>
                {(["Beginner", "Skilled", "Expert"] as Level[]).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Area
              <select className={input} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                {snap.areas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Duration (days)
              <input type="number" min={1} className={input} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
            </label>
            <label className="col-span-2 text-xs text-slate-400">
              Daily wage (₹)
              <input type="number" min={100} step={50} className={`${input} ${below ? "border-amber-500" : ""}`} value={form.daily_wage} onChange={(e) => setForm({ ...form, daily_wage: Number(e.target.value) })} />
            </label>
          </div>

          {/* Fair Wage Shield */}
          <div className={`mt-4 rounded-lg border p-3 text-sm ${below ? "flash-amber border-amber-500/60 bg-amber-500/10 text-amber-100" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {below ? <ShieldAlert className="h-4 w-4 text-amber-400" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
              Fair Wage Shield
            </div>
            {below ? (
              <div className="mt-1 text-xs">
                {inr(form.daily_wage)}/day is <b>{Math.round(((range[0] - form.daily_wage) / range[0]) * 100)}% below</b> the fair range for a {form.required_level} {TRADE_META[form.trade].en} ({inr(range[0])}–{inr(range[1])}).
                <button onClick={() => setForm({ ...form, daily_wage: suggested })} className="ml-2 rounded bg-amber-400 px-2 py-0.5 font-bold text-amber-950 hover:bg-amber-300">
                  Use {inr(suggested)}
                </button>
              </div>
            ) : (
              <div className="mt-1 text-xs">
                ✓ Fair: within {inr(range[0])}–{inr(range[1])}/day for {form.required_level} {TRADE_META[form.trade].en}.
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-slate-400">{snap.fairWageSource}</div>
          </div>

          <button onClick={() => post()} disabled={posting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post job & match workers
          </button>
        </div>
      </div>

      <div className="scroll-thin min-h-0 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 font-semibold text-white">Ranked matches {lastJob && <span className="text-sm font-normal text-slate-400">· {lastJob.employer} · {lastJob.area}</span>}</h3>
        {!lastJob ? (
          <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-slate-500">
            <Briefcase className="mb-2 h-8 w-8" />
            Post a job to see Haversine-distance + Trust-Score ranked matches.
          </div>
        ) : (
          <>
            {lastJob.fairWage.status === "below" && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                🛡️ Posted at {inr(lastJob.original_wage)}/day — workers will see a Fair Wage warning and a 1-tap counter-offer of {inr(lastJob.fairWage.suggested)}.
              </div>
            )}
            {lastJob.matches.length === 0 && <div className="text-sm text-slate-400">No verified, available workers within 25 km for this trade/level.</div>}
            <ul className="space-y-2">
              {lastJob.matches.map((m, i) => {
                const w = snap.workers.find((x) => x.id === m.workerId);
                const assigned = lastJob.assignedWorkerId === m.workerId;
                return (
                  <li key={m.workerId} className={`flex items-center gap-3 rounded-lg border p-3 ${assigned ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800 bg-slate-950/50"}`}>
                    <div className="w-6 text-center text-sm font-bold text-slate-500">#{i + 1}</div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-slate-950" style={{ background: `hsl(${w?.avatarHue ?? 140} 70% 60%)` }}>
                      {m.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate whitespace-nowrap font-medium text-white">
                        {m.name}
                        {w?.isDemo && <span className="rounded bg-emerald-500/20 px-1.5 text-[10px] font-semibold text-emerald-300">LIVE DEMO</span>}
                        {assigned && <span className="rounded bg-sky-500/20 px-1.5 text-[10px] font-semibold text-sky-300">{lastJob.status.toUpperCase()}</span>}
                      </div>
                      <div className="truncate whitespace-nowrap text-xs text-slate-400">
                        <span className={`mr-2 rounded px-1.5 py-0.5 ring-1 ${LEVEL_STYLE[m.level]}`}>{m.level}</span>
                        {m.distanceKm} km · {w?.jobsCompleted ?? 0} jobs · {w?.vouches.length ?? 0} vouches
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-white">{m.trustScore}</div>
                      <div className="text-[10px] uppercase text-slate-500">Trust</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-300">{m.matchScore}</div>
                      <div className="text-[10px] uppercase text-slate-500">Match</div>
                    </div>
                    <a href={`/card/${m.workerId}`} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
                      Skill Card
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">Match score = 60% Trust Score + 40% proximity (Haversine, ≤25 km). Phone numbers are never shared.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Tab 3 — God mode
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

  const actions = useMemo(
    () => [
      { key: "ff", title: "Fast-forward onboarding", desc: "Hindi voice → good video → verified card", icon: <Sparkles className="h-5 w-5" />, cls: "from-violet-500/20 to-violet-500/5 border-violet-500/40", fn: fastForward },
      { key: "vouch", title: "Simulate Past Employer Vouch", desc: "+1 verified vouch (≈ +10 Trust)", icon: <ThumbsUp className="h-5 w-5" />, cls: "from-teal-500/20 to-teal-500/5 border-teal-500/40", fn: () => act("vouch") },
      { key: "rate", title: "Complete Job & Rate 5★", desc: "Close the loop · live Trust Score jump", icon: <Star className="h-5 w-5" />, cls: "from-amber-500/20 to-amber-500/5 border-amber-500/40", fn: () => act("complete_and_rate") },
      { key: "reset", title: "Reset Demo", desc: "Re-seed 20 workers · clear chat", icon: <RotateCcw className="h-5 w-5" />, cls: "from-rose-500/20 to-rose-500/5 border-rose-500/40", fn: () => act("reset") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, snap.demo.state]
  );

  return (
    <div className="scroll-thin h-full space-y-5 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.key}
            disabled={!!running || busy}
            onClick={() => run(a.key, a.fn)}
            className={`group flex items-center gap-4 rounded-xl border bg-gradient-to-br p-4 text-left transition hover:scale-[1.01] disabled:opacity-60 ${a.cls}`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950/60 text-white">{running === a.key ? <Loader2 className="h-5 w-5 animate-spin" /> : a.icon}</div>
            <div>
              <div className="font-semibold text-white">{a.title}</div>
              <div className="text-xs text-slate-400">{a.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* State machine */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-semibold text-white">WhatsApp agent state machine</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATES.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-1 font-mono text-[11px] ${
                  s === current ? "bg-emerald-500 font-bold text-emerald-950 ring-4 ring-emerald-500/20" : i < curIdx ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
                }`}
              >
                {i < curIdx && <Check className="mr-0.5 inline h-3 w-3" />}
                {s}
              </span>
              {i < STATES.length - 1 && <span className="text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Live worker trust breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Live worker · Trust Score breakdown</div>
          {demoWorker?.verified && (
            <a href={`/card/${demoWorker.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-emerald-300 hover:underline">
              Open Skill Card <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {!demoWorker || !b ? (
          <div className="text-sm text-slate-500">No live worker yet — start onboarding in the WhatsApp pane.</div>
        ) : (
          <div className="flex items-center gap-6">
            <BigScore value={demoWorker.trustScore} />
            <div className="flex-1 space-y-3">
              <Bar label="AI skill assessment (40%)" value={b.ai} max={40} color="bg-violet-400" detail={`${demoWorker.aiScore}/100`} />
              <Bar label="Verified vouches (30%)" value={b.vouches} max={30} color="bg-teal-400" detail={`${demoWorker.vouches.length} vouches`} />
              <Bar label="Jobs & ratings (30%)" value={b.jobs} max={30} color="bg-amber-400" detail={`${demoWorker.jobsCompleted} jobs · ${demoWorker.ratings.length ? (demoWorker.ratings.reduce((a, c) => a + c, 0) / demoWorker.ratings.length).toFixed(1) : "–"}★`} />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-400">
        <div className="mb-1 font-semibold text-slate-200">🎬 3-minute demo script</div>
        1) Tap <b>🎙️ Demo Hindi Voice</b> (or record your own) → profile extracted. 2) Note the liveness code → tap <b>⚠️ Unsafe Video</b> (rejected, safety tip) → tap <b>📹 Good Wiring Video</b> → Skill Card. 3) Employer tab →
        post Electrician · Koramangala · ₹700 → Fair Wage Shield flashes. 4) In WhatsApp tap <b>💬 Counter-offer</b>. 5) Here: <b>Complete Job & Rate 5★</b> → Trust jumps live. 6) Open the Skill Card → verified signature + QR.
      </div>
    </div>
  );
}

function BigScore({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#g)" strokeWidth="3" strokeDasharray={`${(v / 100) * 97.4} 97.4`} strokeLinecap="round" />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-black text-white">{v}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">Trust</div>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color, detail }: { label: string; value: number; max: number; color: string; detail: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {detail} · <b className="text-white">{value.toFixed(1)}</b>/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

