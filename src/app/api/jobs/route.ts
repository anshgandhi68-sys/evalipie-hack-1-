import { NextResponse } from "next/server";
import { LEVELS, TRADES, resetStore, snapshot, logEvent, type Level, type Trade } from "@/lib/store";
import { aiMode, extractJobFromVoice } from "@/lib/gemini";
import { completeAndRate, createJob, vouchDemo } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(snapshot(aiMode()));
}

interface PostBody {
  employer?: string;
  trade?: string;
  area?: string;
  duration_days?: number;
  daily_wage?: number;
  required_level?: string;
  // voice
  audioBase64?: string;
  audioMime?: string;
  voiceText?: string;
  demoMode?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as PostBody;
  let transcript: string | undefined;
  let source: string | undefined;

  let trade = body.trade as Trade;
  let area = body.area || "Koramangala";
  let duration = Number(body.duration_days) || 1;
  let wage = Number(body.daily_wage) || 0;
  let level = (body.required_level as Level) || "Skilled";

  if (body.audioBase64 || body.voiceText || body.demoMode) {
    const ex = await extractJobFromVoice({
      audioBase64: body.audioBase64,
      audioMime: body.audioMime,
      text: body.voiceText,
      demoMode: body.demoMode,
    });
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

  const job = createJob({
    employer: body.employer,
    trade,
    area,
    duration_days: Math.max(1, Math.round(duration)),
    daily_wage: Math.round(wage),
    required_level: level,
  });

  return NextResponse.json({ job, transcript, source, ...snapshot(aiMode()) });
}

export async function PATCH(req: Request) {
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
