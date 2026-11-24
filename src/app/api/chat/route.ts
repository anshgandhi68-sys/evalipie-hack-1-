import { NextResponse } from "next/server";
import { pushUser, snapshot, getStore } from "@/lib/store";
import { aiMode } from "@/lib/gemini";
import { handleChat, type ChatInput } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body extends ChatInput {
  videoName?: string;
  audioSeconds?: number;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  getStore();
  // Record the worker's message in the chat log
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
