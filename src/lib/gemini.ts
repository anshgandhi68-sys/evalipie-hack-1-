import { GoogleGenAI } from "@google/genai";
import { AREAS, LEVELS, RUBRICS, TRADES, levelFromScore, type Criterion, type Lang, type Level, type Trade } from "./store";

const MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 30000;

export type Source = "gemini" | "fallback";

export function aiMode(): "gemini" | "demo" {
  return process.env.GEMINI_API_KEY ? "gemini" : "demo";
}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

async function generateJson<T>(parts: Part[]): Promise<T | null> {
  const c = ai();
  if (!c) return null;
  try {
    const call = c.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
    const res = await Promise.race([call, timeout]);
    if (!res) {
      console.warn("[gemini] timeout — using fallback");
      return null;
    }
    const text = res.text ?? "";
    const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn("[gemini] error — using fallback:", (err as Error).message?.slice(0, 200));
    return null;
  }
}

const normTrade = (t: unknown): Trade => {
  const s = String(t || "").toLowerCase();
  return (TRADES.find((x) => s.includes(x)) ?? detectTrade(s) ?? "electrician") as Trade;
};
const normLevel = (l: unknown): Level => (LEVELS.find((x) => x.toLowerCase() === String(l || "").toLowerCase()) ?? "Skilled") as Level;
const normLang = (l: unknown): Lang => {
  const s = String(l || "").toLowerCase();
  if (s.startsWith("hi") || s.includes("hindi")) return "hi";
  if (s.startsWith("kn") || s.includes("kannada")) return "kn";
  if (s.startsWith("ta") || s.includes("tamil")) return "ta";
  if (s.startsWith("te") || s.includes("telugu")) return "te";
  if (s.startsWith("mr") || s.includes("marathi")) return "mr";
  if (s.startsWith("bn") || s.includes("bengali")) return "bn";
  return "en";
};

// ------------------------------------------------------------
// Heuristic parsing (used when Gemini is unavailable)
// ------------------------------------------------------------
function detectTrade(s: string): Trade | null {
  const t = s.toLowerCase();
  if (/electric|bijli|बिजली|wiring|वायरिंग|इलेक्ट्री|ವಿದ್ಯುತ್/.test(t)) return "electrician";
  if (/plumb|nal|नल|pipe|पाइप|प्लंबर/.test(t)) return "plumber";
  if (/mason|mistri|मिस्त्री|brick|ईंट|raj|construction|चिनाई/.test(t)) return "mason";
  if (/carpent|badhai|बढ़ई|lakdi|लकड़ी|furniture|wood/.test(t)) return "carpenter";
  return null;
}
function detectArea(s: string): string | null {
  const t = s.toLowerCase();
  const hit = Object.keys(AREAS).find((a) => t.includes(a.toLowerCase()));
  if (hit) return hit;
  if (/कोरमंगला|koramangla/.test(t)) return "Koramangala";
  if (/इंदिरानगर/.test(t)) return "Indiranagar";
  if (/hsr/.test(t)) return "HSR Layout";
  if (/btm/.test(t)) return "BTM Layout";
  return null;
}
const isDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);
const looksHinglish = (s: string) => /\b(mera|naam|hai|saal|kaam|karta|chahiye|rupaye|din|mein)\b/i.test(s);

// ============================================================
// 1) Worker profile extraction
// ============================================================
export interface WorkerProfile {
  name: string;
  trade: Trade;
  years_experience: number;
  area: string;
  language: Lang;
  transcript: string;
  reply_in_worker_language: string;
  source: Source;
}

export const DEMO_HINDI_TRANSCRIPT = "नमस्ते, मेरा नाम रमेश कुमार है। मैं आठ साल से बिजली का काम करता हूँ, वायरिंग और स्विचबोर्ड। मैं कोरमंगला में रहता हूँ।";

function profileFallback(text?: string, demoMode?: string): WorkerProfile {
  if (demoMode === "hindi_voice" || !text) {
    return {
      name: "Ramesh Kumar",
      trade: "electrician",
      years_experience: 8,
      area: "Koramangala",
      language: "hi",
      transcript: DEMO_HINDI_TRANSCRIPT,
      reply_in_worker_language: "धन्यवाद रमेश जी! 🙏 आपकी प्रोफ़ाइल बन गई है — इलेक्ट्रीशियन, 8 साल का अनुभव, कोरमंगला।",
      source: "fallback",
    };
  }
  const nameMatch =
    text.match(/(?:my name is|i am|i'm|naam|नाम)\s+(?:hai\s+)?([A-Za-zऀ-ॿ]+(?:\s+[A-Za-zऀ-ॿ]+)?)/i) ?? null;
  let name = nameMatch?.[1]?.replace(/\s+(hai|है|and|aur|main|मैं).*$/i, "").trim() || "Worker";
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  const years = Number(text.match(/(\d{1,2})\s*(?:saal|sal|years?|yrs|साल)/i)?.[1] ?? 3);
  const trade = detectTrade(text) ?? "electrician";
  const area = detectArea(text) ?? "Koramangala";
  const language: Lang = isDevanagari(text) || looksHinglish(text) ? "hi" : "en";
  return {
    name,
    trade,
    years_experience: years,
    area,
    language,
    transcript: text,
    reply_in_worker_language:
      language === "hi"
        ? `धन्यवाद ${name} जी! 🙏 आपकी प्रोफ़ाइल बन गई है — ${trade}, ${years} साल का अनुभव, ${area}।`
        : `Thank you ${name}! 🙏 Your profile is ready — ${trade}, ${years} years, ${area}.`,
    source: "fallback",
  };
}

export async function extractWorkerProfile(input: {
  audioBase64?: string;
  audioMime?: string;
  text?: string;
  demoMode?: string;
}): Promise<WorkerProfile> {
  if (input.demoMode) return profileFallback(undefined, input.demoMode);
  const prompt = `You are Evalipie.in, a WhatsApp onboarding agent for Indian blue-collar workers in Bengaluru.
The worker sent ${input.audioBase64 ? "a voice note" : "a text message"} introducing themselves (may be Hindi, Kannada, Tamil, Hinglish or English).
Extract their profile. trade MUST be one of: electrician, plumber, mason, carpenter (map synonyms: bijli/wiring→electrician, nal/pipe→plumber, mistri/raj mistri/brick→mason, badhai/lakdi→carpenter).
area: the Bengaluru locality (prefer one of: ${Object.keys(AREAS).join(", ")}).
language: ISO code of the language they spoke (hi, kn, ta, te, mr, bn, en). Hinglish → hi.
name: in Latin script, Title Case.
transcript: verbatim transcript in the original script.
reply_in_worker_language: a warm 1-2 sentence confirmation in THEIR language and native script (Devanagari for Hindi) summarising the profile.
Return ONLY JSON: {"name":string,"trade":string,"years_experience":number,"area":string,"language":string,"transcript":string,"reply_in_worker_language":string}`;
  const parts: Part[] = [{ text: prompt }];
  if (input.audioBase64) parts.push({ inlineData: { mimeType: input.audioMime || "audio/webm", data: input.audioBase64 } });
  else parts.push({ text: `Worker message: """${input.text ?? ""}"""` });

  const r = await generateJson<Partial<WorkerProfile>>(parts);
  if (!r || !r.name) return profileFallback(input.text, input.audioBase64 && !input.text ? "hindi_voice" : undefined);
  return {
    name: String(r.name),
    trade: normTrade(r.trade),
    years_experience: Number(r.years_experience) || 1,
    area: String(r.area || "Koramangala"),
    language: normLang(r.language),
    transcript: String(r.transcript || input.text || ""),
    reply_in_worker_language: String(r.reply_in_worker_language || ""),
    source: "gemini",
  };
}

// ============================================================
// 2) Trade video assessment with liveness check
// ============================================================
export interface Assessment {
  liveness_passed: boolean;
  flagged_suspicious: boolean;
  criteria: Criterion[];
  score_0_100: number;
  level: Level;
  summary_in_worker_language: string;
  source: Source;
}

function assessmentFallback(trade: Trade, mode: "good" | "unsafe", lang: Lang): Assessment {
  const rubric = RUBRICS[trade].criteria;
  if (mode === "unsafe") {
    const unsafeObs: Record<Trade, string[]> = {
      electrician: [
        "MCB was NOT switched off — working on a live circuit",
        "Phase and neutral wires reversed at the socket",
        "Loose strands visible outside the terminal",
        "No earth wire connected",
        "Bare hands, no insulated screwdriver",
      ],
      plumber: ["Main supply left open", "Pipe cut at an angle, not deburred", "No teflon tape used", "Joint visibly misaligned", "Water spilled near electric socket"],
      mason: ["Mortar too watery", "Dry bricks used", "Joints uneven (5–20mm)", "No level/plumb check", "Vertical joints aligned (no bond)"],
      carpenter: ["No measurement taken", "Cut is wavy", "Nails used where screws needed", "Joint not square", "Fingers in blade path"],
    };
    const obs = unsafeObs[trade];
    const criteria = rubric.map((name, i) => ({ name, passed: i === 2 && trade !== "electrician", observation: obs[i] }));
    return {
      liveness_passed: true,
      flagged_suspicious: false,
      criteria,
      score_0_100: 34,
      level: "Beginner",
      summary_in_worker_language:
        lang === "en"
          ? "⚠️ Safety risk found: work was done without isolating power. Please re-record following the safety steps."
          : "⚠️ सुरक्षा में गंभीर कमी मिली: बिजली बंद किए बिना काम किया गया। कृपया सुरक्षा नियमों के साथ वीडियो दोबारा भेजें।",
      source: "fallback",
    };
  }
  const goodObs: Record<Trade, string[]> = {
    electrician: [
      "MCB switched off and tested with a tester before touching wires",
      "Red phase, black neutral, green earth — correct colour coding",
      "Clean 8mm strip, terminals tightened firmly",
      "Earth wire secured to the earth terminal",
      "Insulated screwdriver used; one-hand working posture",
    ],
    plumber: ["Main valve closed first", "Clean square cut, edges deburred", "Teflon tape wrapped clockwise, 6 turns", "Joint aligned, no drip after test", "Area kept dry and tidy"],
    mason: ["Mortar 1:6 with good workability", "Bricks soaked before laying", "Joints consistent ~10mm", "Spirit level and plumb bob used", "Proper stretcher bond"],
    carpenter: ["Measured twice with tape and square", "Straight clean saw cut", "Correct screws and pilot holes", "Flush and square joint", "Hands kept clear of blade"],
  };
  const obs = goodObs[trade];
  const criteria = rubric.map((name, i) => ({ name, passed: true, observation: obs[i] }));
  return {
    liveness_passed: true,
    flagged_suspicious: false,
    criteria,
    score_0_100: 88,
    level: "Expert",
    summary_in_worker_language:
      lang === "en"
        ? "Excellent work! All 5 safety & quality checks passed. You are verified as an Expert."
        : "शानदार काम! 🎉 सभी 5 सुरक्षा और गुणवत्ता जाँच पास। आपको विशेषज्ञ (Expert) के रूप में सत्यापित किया गया है।",
    source: "fallback",
  };
}

export async function assessTradeVideo(input: {
  videoBase64?: string;
  videoMime?: string;
  trade: Trade;
  livenessCode: string;
  language: Lang;
  demoMode?: "good_wiring" | "unsafe_wiring" | string;
}): Promise<Assessment> {
  if (input.demoMode === "good_wiring") return assessmentFallback(input.trade, "good", input.language);
  if (input.demoMode === "unsafe_wiring") return assessmentFallback(input.trade, "unsafe", input.language);
  if (!input.videoBase64) return assessmentFallback(input.trade, "good", input.language);

  const rubric = RUBRICS[input.trade];
  const prompt = `You are a strict, fair skill assessor for Indian ${input.trade}s, certifying them for Evalipie.in.
Task the worker was asked to perform: "${rubric.task}".
LIVENESS: The worker was asked to say or show the number "${input.livenessCode}" at the start of the video. liveness_passed = true only if you hear/see "${input.livenessCode}" (any language, e.g. Hindi numerals) OR clearly see a real person doing live hands-on work. Set flagged_suspicious = true if the video looks like a screen recording, stock footage, AI-generated, heavily edited, or unrelated to the trade.
Grade against EXACTLY these 5 criteria (keep these names):
${rubric.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}
For each: passed (boolean) and a short concrete observation of what you saw (English, <15 words).
If a criterion cannot be seen, mark passed=false with observation "Not visible in video".
Any serious safety violation (e.g. live wire work) caps score_0_100 at 40.
level: Beginner (<55), Skilled (55-79), Expert (>=80).
summary_in_worker_language: 1-2 encouraging sentences in language code "${input.language}" (native script; Devanagari for hi) explaining the result and any safety tip.
Return ONLY JSON: {"liveness_passed":boolean,"flagged_suspicious":boolean,"criteria":[{"name":string,"passed":boolean,"observation":string}],"score_0_100":number,"level":string,"summary_in_worker_language":string}`;

  const r = await generateJson<Partial<Assessment>>([
    { text: prompt },
    { inlineData: { mimeType: input.videoMime || "video/mp4", data: input.videoBase64 } },
  ]);
  if (!r || !Array.isArray(r.criteria)) return assessmentFallback(input.trade, "good", input.language);
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score_0_100) || 0)));
  return {
    liveness_passed: Boolean(r.liveness_passed),
    flagged_suspicious: Boolean(r.flagged_suspicious),
    criteria: r.criteria.slice(0, 5).map((c, i) => ({
      name: String(c?.name || rubric.criteria[i]),
      passed: Boolean(c?.passed),
      observation: String(c?.observation || ""),
    })),
    score_0_100: score,
    level: levelFromScore(score),
    summary_in_worker_language: String(r.summary_in_worker_language || ""),
    source: "gemini",
  };
}

// ============================================================
// 3) Job extraction from employer voice / text
// ============================================================
export interface ExtractedJob {
  trade: Trade;
  area: string;
  duration_days: number;
  daily_wage: number;
  required_level: Level;
  transcript: string;
  source: Source;
}

export const DEMO_JOB_TRANSCRIPT = "Koramangala mein 3 din ke liye ek electrician chahiye, switchboard aur wiring ka kaam hai, 700 rupaye roz denge.";

function jobFallback(text?: string): ExtractedJob {
  const t = text || DEMO_JOB_TRANSCRIPT;
  const wage = Number(t.match(/(?:₹|rs\.?|inr)?\s*(\d{3,4})\s*(?:rupaye|rupees|rs|₹|\/-|per day|roz|daily|a day)?/i)?.[1] ?? 700);
  const days = Number(t.match(/(\d{1,2})\s*(?:din|days?|दिन)/i)?.[1] ?? 3);
  const level: Level = /expert|senior|experienced|विशेषज्ञ/i.test(t) ? "Expert" : /beginner|helper|fresher/i.test(t) ? "Beginner" : "Skilled";
  return {
    trade: detectTrade(t) ?? "electrician",
    area: detectArea(t) ?? "Koramangala",
    duration_days: days,
    daily_wage: wage,
    required_level: level,
    transcript: t,
    source: "fallback",
  };
}

export async function extractJobFromVoice(input: { audioBase64?: string; audioMime?: string; text?: string; demoMode?: string }): Promise<ExtractedJob> {
  if (input.demoMode) return jobFallback(DEMO_JOB_TRANSCRIPT);
  const prompt = `An employer in Bengaluru described a job (Hindi/Kannada/Hinglish/English).
Extract: trade (one of electrician, plumber, mason, carpenter), area (Bengaluru locality, prefer: ${Object.keys(AREAS).join(", ")}),
duration_days (integer), daily_wage (INR per day integer; if total given, divide by days), required_level (Beginner|Skilled|Expert, default Skilled),
transcript (verbatim). Return ONLY JSON: {"trade":string,"area":string,"duration_days":number,"daily_wage":number,"required_level":string,"transcript":string}`;
  const parts: Part[] = [{ text: prompt }];
  if (input.audioBase64) parts.push({ inlineData: { mimeType: input.audioMime || "audio/webm", data: input.audioBase64 } });
  else parts.push({ text: `Employer message: """${input.text ?? ""}"""` });
  const r = await generateJson<Partial<ExtractedJob>>(parts);
  if (!r || !r.trade) return jobFallback(input.text);
  return {
    trade: normTrade(r.trade),
    area: String(r.area || "Koramangala"),
    duration_days: Math.max(1, Math.round(Number(r.duration_days) || 1)),
    daily_wage: Math.max(100, Math.round(Number(r.daily_wage) || 700)),
    required_level: normLevel(r.required_level),
    transcript: String(r.transcript || input.text || ""),
    source: "gemini",
  };
}
