/**
 * Single API entry point.
 *
 * Every endpoint lives in this one route file on purpose: on serverless hosts
 * (Vercel) each route file becomes its own function with its own memory, so the
 * in-memory demo store would be split across functions. Keeping chat, jobs,
 * god-mode and Skill Card reads in one function means they all share one store.
 *
 *   GET    /api/jobs          → full snapshot (workers, jobs, feed, chat)
 *   POST   /api/jobs          → create a job (form or voice) + match + WhatsApp alert
 *   PATCH  /api/jobs          → god-mode: vouch | complete_and_rate | reset
 *   POST   /api/chat          → worker WhatsApp message (text / voice / video / demo)
 *   GET    /api/card/:id      → public Skill Card + live signature verification
 */
import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  LEVELS,
  LEVEL_HI,
  RUBRICS,
  TRADES,
  TRADE_LABEL,
  calculateTrustScore,
  credentialPayload,
  getStore,
  logEvent,
  pushUser,
  resetStore,
  snapshot,
  verifyCredential,
  type Level,
  type Trade,
} from "@/lib/store";
import { aiMode, extractJobFromVoice } from "@/lib/gemini";
import { completeAndRate, createJob, handleChat, vouchDemo, type ChatInput } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ slug: string[] }> };
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// ------------------------------------------------------------
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  if (slug[0] === "jobs" && slug.length === 1) return NextResponse.json(snapshot(aiMode()));
  if (slug[0] === "card" && slug[1]) return getCard(slug[1], new URL(req.url).searchParams.get("tamper") === "1");
  if (slug[0] === "health") return NextResponse.json({ ok: true, workers: getStore().workers.length, aiMode: aiMode() });
  return notFound();
}

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  if (slug[0] === "chat") return postChat(req);
  if (slug[0] === "jobs") return postJob(req);
  return notFound();
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { slug } = await params;
  if (slug[0] === "jobs") return patchJobs(req);
  return notFound();
}

// ------------------------------------------------------------
// Chat
// ------------------------------------------------------------
interface ChatBody extends ChatInput {
  videoName?: string;
  audioSeconds?: number;
}

async function postChat(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  getStore();
  if (body.demoMode === "hindi_voice") {
    pushUser("🎙️ Voice note", { kind: "voice", meta: { seconds: 9, demo: true } });
  } else if (body.audioBase64) {
    pushUser("🎙️ Voice note", { kind: "voice", meta: { seconds: body.audioSeconds ?? 5 } });
  } else if (body.demoMode === "good_wiring" || body.demoMode === "unsafe_wiring") {
    pushUser(body.demoMode === "good_wiring" ? "📹 switchboard_wiring.mp4" : "📹 quick_fix.mp4", {
      kind: "video",
      meta: { demo: body.demoMode, seconds: 30 },
    });
  } else if (body.videoBase64) {
    pushUser(`📹 ${body.videoName || "skill_video.mp4"}`, { kind: "video", meta: { seconds: 30 } });
  } else if (body.text) {
    pushUser(body.text);
  }

  const result = await handleChat(body);
  return NextResponse.json({ ...snapshot(aiMode()), error: result.error });
}

// ------------------------------------------------------------
// Jobs
// ------------------------------------------------------------
interface JobBody {
  employer?: string;
  trade?: string;
  area?: string;
  duration_days?: number;
  daily_wage?: number;
  required_level?: string;
  audioBase64?: string;
  audioMime?: string;
  voiceText?: string;
  demoMode?: string;
}

async function postJob(req: Request) {
  const body = (await req.json().catch(() => ({}))) as JobBody;
  let transcript: string | undefined;
  let source: string | undefined;

  let trade = body.trade as Trade;
  let area = body.area || "Koramangala";
  let duration = Number(body.duration_days) || 1;
  let wage = Number(body.daily_wage) || 0;
  let level = (body.required_level as Level) || "Skilled";

  if (body.audioBase64 || body.voiceText || body.demoMode) {
    const ex = await extractJobFromVoice({ audioBase64: body.audioBase64, audioMime: body.audioMime, text: body.voiceText, demoMode: body.demoMode });
    trade = ex.trade;
    area = ex.area;
    duration = ex.duration_days;
    wage = ex.daily_wage;
    level = ex.required_level;
    transcript = ex.transcript;
    source = ex.source;
  }

  if (!TRADES.includes(trade)) return NextResponse.json({ error: "Invalid trade" }, { status: 400 });
  if (!LEVELS.includes(level)) level = "Skilled";
  if (!wage || wage < 100) return NextResponse.json({ error: "Enter a daily wage" }, { status: 400 });

  const job = createJob({ employer: body.employer, trade, area, duration_days: Math.max(1, Math.round(duration)), daily_wage: Math.round(wage), required_level: level });
  return NextResponse.json({ job, transcript, source, ...snapshot(aiMode()) });
}

async function patchJobs(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; rating?: number };
  let result: { error?: string; before?: number; after?: number } = {};
  switch (body.action) {
    case "vouch":
      result = vouchDemo();
      break;
    case "complete_and_rate":
      result = completeAndRate(Math.min(5, Math.max(1, Number(body.rating) || 5)));
      break;
    case "reset":
      resetStore();
      logEvent("system", "Demo reset · store re-seeded with 20 workers");
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ...snapshot(aiMode()), ...result });
}

// ------------------------------------------------------------
// Public Skill Card (phone number never included)
// ------------------------------------------------------------
function getCard(id: string, tamper: boolean) {
  const w = getStore().workers.find((x) => x.id === id);
  if (!w || !w.verified) return NextResponse.json({ found: false }, { status: 404 });

  // Live HMAC verification; ?tamper=1 simulates a forged level upgrade
  const candidate = tamper ? { ...w, level: "Expert" as const, aiScore: 99 } : w;
  const valid = verifyCredential(candidate, w.signature);
  const avgRating = w.ratings.length ? w.ratings.reduce((a, c) => a + c, 0) / w.ratings.length : 0;

  return NextResponse.json({
    found: true,
    valid,
    tampered: tamper,
    worker: {
      id: w.id,
      name: w.name,
      trade: w.trade,
      tradeEn: TRADE_LABEL[w.trade].en,
      tradeHi: TRADE_LABEL[w.trade].hi,
      emoji: TRADE_LABEL[w.trade].emoji,
      level: w.level,
      levelHi: LEVEL_HI[w.level],
      area: w.area,
      years: w.years,
      aiScore: w.aiScore,
      trustScore: w.trustScore,
      jobsCompleted: w.jobsCompleted,
      avgRating,
      rubric: w.rubric,
      task: RUBRICS[w.trade].task,
      vouches: w.vouches.map((v) => ({ by: v.by, note: v.note })),
      breakdown: calculateTrustScore(w),
      verifiedAt: w.verifiedAt,
      signature: w.signature,
      payloadHash: crypto.createHash("sha256").update(credentialPayload(w)).digest("hex"),
    },
  });
}
