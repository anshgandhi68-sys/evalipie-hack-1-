import crypto from "crypto";

// ============================================================
// Types
// ============================================================
export type Trade = "electrician" | "plumber" | "mason" | "carpenter";
export type Level = "Beginner" | "Skilled" | "Expert";
export type Lang = "hi" | "en" | "kn" | "ta" | "te" | "mr" | "bn";

export type ChatState =
  | "NEW"
  | "AWAITING_PROFILE"
  | "AWAITING_VIDEO"
  | "VERIFIED_IDLE"
  | "JOB_OFFERED"
  | "ACTIVE_JOB"
  | "AWAITING_RATING";

export interface Criterion {
  name: string;
  passed: boolean;
  observation: string;
}

export interface Vouch {
  by: string;
  note: string;
  verified: boolean;
  at: number;
}

export interface Worker {
  id: string;
  name: string;
  phone: string; // never exposed publicly
  trade: Trade;
  level: Level;
  years: number;
  area: string;
  lat: number;
  lng: number;
  language: Lang;
  aiScore: number;
  rubric: Criterion[];
  vouches: Vouch[];
  ratings: number[];
  jobsCompleted: number;
  trustScore: number;
  trustHistory: number[];
  verified: boolean;
  verifiedAt: number;
  signature: string;
  status: "available" | "on_job" | "onboarding";
  isDemo?: boolean;
  avatarHue: number;
}

export interface FairWageResult {
  min: number;
  max: number;
  status: "below" | "fair" | "above";
  suggested: number;
  gapPct: number;
}

export interface Match {
  workerId: string;
  name: string;
  level: Level;
  trustScore: number;
  distanceKm: number;
  matchScore: number;
}

export interface Job {
  id: string;
  employer: string;
  trade: Trade;
  area: string;
  lat: number;
  lng: number;
  duration_days: number;
  daily_wage: number;
  original_wage: number;
  required_level: Level;
  status: "open" | "offered" | "active" | "completed";
  assignedWorkerId?: string;
  fairWage: FairWageResult;
  matches: Match[];
  counterOffer?: number;
  rating?: number;
  createdAt: number;
}

export interface FeedEvent {
  id: string;
  ts: number;
  type:
    | "onboard"
    | "verify"
    | "fail"
    | "job"
    | "match"
    | "accept"
    | "counter"
    | "complete"
    | "vouch"
    | "wage"
    | "system";
  text: string;
}

export interface ChatMessage {
  id: string;
  from: "bot" | "user";
  kind: "text" | "voice" | "video" | "card" | "job" | "liveness" | "assessment";
  text: string;
  translation?: string;
  lang?: Lang;
  ts: number;
  meta?: Record<string, unknown>;
}

export interface DemoSession {
  state: ChatState;
  workerId: string | null;
  livenessCode: string | null;
  pendingJobId: string | null;
  activeJobId: string | null;
  attempts: number;
}

export interface Store {
  workers: Worker[];
  jobs: Job[];
  events: FeedEvent[];
  chat: ChatMessage[];
  demo: DemoSession;
  wageProtectedInr: number;
}

// ============================================================
// Reference data
// ============================================================
export const TRADES: Trade[] = ["electrician", "plumber", "mason", "carpenter"];
export const LEVELS: Level[] = ["Beginner", "Skilled", "Expert"];

export const TRADE_LABEL: Record<Trade, { en: string; hi: string; emoji: string }> = {
  electrician: { en: "Electrician", hi: "इलेक्ट्रीशियन", emoji: "⚡" },
  plumber: { en: "Plumber", hi: "प्लंबर", emoji: "🔧" },
  mason: { en: "Mason", hi: "राजमिस्त्री", emoji: "🧱" },
  carpenter: { en: "Carpenter", hi: "बढ़ई", emoji: "🪚" },
};

export const LEVEL_HI: Record<Level, string> = {
  Beginner: "शुरुआती",
  Skilled: "कुशल",
  Expert: "विशेषज्ञ",
};

/** SAMPLE DATA — indicative Bengaluru daily wage ranges (INR/day). Not official figures. */
export const FAIR_WAGES: Record<Trade, Record<Level, [number, number]>> = {
  electrician: { Beginner: [600, 800], Skilled: [850, 1100], Expert: [1200, 1600] },
  plumber: { Beginner: [550, 750], Skilled: [800, 1050], Expert: [1100, 1500] },
  mason: { Beginner: [650, 850], Skilled: [900, 1150], Expert: [1200, 1500] },
  carpenter: { Beginner: [600, 800], Skilled: [850, 1150], Expert: [1200, 1600] },
};
export const FAIR_WAGE_SOURCE = "Sample data (illustrative Bengaluru market ranges, 2026) — not official minimum wages";

export const RUBRICS: Record<Trade, { task: string; taskHi: string; criteria: string[] }> = {
  electrician: {
    task: "Wire a switchboard / socket point",
    taskHi: "एक स्विचबोर्ड या सॉकेट की वायरिंग करें",
    criteria: [
      "Power isolated at MCB before work",
      "Correct wire colour coding (Phase-Red/Brown, Neutral-Black/Blue, Earth-Green)",
      "Proper stripping & tight terminal connections",
      "Earthing connected",
      "Uses insulated tools & safe posture",
    ],
  },
  plumber: {
    task: "Fit a tap / join a CPVC pipe",
    taskHi: "एक नल लगाएं या CPVC पाइप जोड़ें",
    criteria: [
      "Main water supply shut off",
      "Pipe cut square & deburred",
      "Correct solvent/teflon tape application",
      "Joint aligned and leak-tested",
      "Clean, safe work area",
    ],
  },
  mason: {
    task: "Lay a course of bricks with mortar",
    taskHi: "मसाले के साथ ईंटों की एक लाइन बिछाएं",
    criteria: [
      "Correct mortar mix consistency",
      "Bricks wetted before laying",
      "Uniform joint thickness (~10mm)",
      "Level & plumb checked with tools",
      "Staggered (bonded) joints",
    ],
  },
  carpenter: {
    task: "Make a joint / fix a hinge",
    taskHi: "एक जोड़ बनाएं या कब्ज़ा लगाएं",
    criteria: [
      "Accurate measurement & marking",
      "Clean, straight cut",
      "Correct joint / fastener choice",
      "Square & flush finish",
      "Safe tool handling (hands clear of blade)",
    ],
  },
};

export const AREAS: Record<string, [number, number]> = {
  Koramangala: [12.9352, 77.6245],
  Indiranagar: [12.9784, 77.6408],
  "HSR Layout": [12.9116, 77.6474],
  Whitefield: [12.9698, 77.75],
  Jayanagar: [12.925, 77.5938],
  Malleshwaram: [13.0035, 77.571],
  "BTM Layout": [12.9166, 77.6101],
  "Electronic City": [12.8452, 77.6602],
  Marathahalli: [12.9591, 77.6974],
  Yelahanka: [13.1007, 77.5963],
  Rajajinagar: [12.991, 77.552],
  Banashankari: [12.9255, 77.5468],
  Hebbal: [13.0358, 77.597],
  "JP Nagar": [12.9063, 77.5857],
  Bellandur: [12.926, 77.6762],
  "KR Puram": [13.0076, 77.695],
};

const AREA_ALIASES: Record<string, string> = {
  कोरमंगला: "Koramangala",
  koramangla: "Koramangala",
  इंदिरानगर: "Indiranagar",
  hsr: "HSR Layout",
  व्हाइटफील्ड: "Whitefield",
  जयनगर: "Jayanagar",
  btm: "BTM Layout",
  "e city": "Electronic City",
  ecity: "Electronic City",
  मराठहल्ली: "Marathahalli",
  jp: "JP Nagar",
  "kr puram": "KR Puram",
};

export function resolveArea(input: string | undefined | null): { area: string; lat: number; lng: number } {
  const raw = (input || "").trim();
  const low = raw.toLowerCase();
  for (const name of Object.keys(AREAS)) {
    if (low.includes(name.toLowerCase())) {
      const [lat, lng] = AREAS[name];
      return { area: name, lat, lng };
    }
  }
  for (const [alias, name] of Object.entries(AREA_ALIASES)) {
    if (low.includes(alias.toLowerCase())) {
      const [lat, lng] = AREAS[name];
      return { area: name, lat, lng };
    }
  }
  // Unknown area: place near Bengaluru centre with a small deterministic offset
  const h = [...raw].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    area: raw || "Bengaluru",
    lat: 12.9716 + ((h % 40) - 20) / 1000,
    lng: 77.5946 + ((h % 30) - 15) / 1000,
  };
}

// ============================================================
// Helpers
// ============================================================
export const uid = (p: string) => `${p}-${crypto.randomBytes(4).toString("hex")}`;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function levelFromScore(score: number): Level {
  if (score >= 80) return "Expert";
  if (score >= 55) return "Skilled";
  return "Beginner";
}

export interface TrustBreakdown {
  ai: number; // weighted contribution (0-40)
  vouches: number; // (0-30)
  jobs: number; // (0-30)
  total: number; // 0-100
}

/** Trust Score = 40% AI assessment + 30% verified vouches + 30% jobs & ratings */
export function calculateTrustScore(w: Pick<Worker, "aiScore" | "vouches" | "ratings" | "jobsCompleted">): TrustBreakdown {
  const aiComp = Math.max(0, Math.min(100, w.aiScore));
  const verifiedVouches = w.vouches.filter((v) => v.verified).length;
  const vouchComp = Math.min(100, verifiedVouches * (100 / 3)); // 3 verified vouches = full marks
  const avgRating = w.ratings.length ? w.ratings.reduce((a, b) => a + b, 0) / w.ratings.length : 0;
  const jobsComp = w.jobsCompleted > 0 ? Math.min(1, w.jobsCompleted / 10) * 50 + (avgRating / 5) * 50 : 0;
  const ai = aiComp * 0.4;
  const vouches = vouchComp * 0.3;
  const jobs = jobsComp * 0.3;
  return {
    ai: Math.round(ai * 10) / 10,
    vouches: Math.round(vouches * 10) / 10,
    jobs: Math.round(jobs * 10) / 10,
    total: Math.round(ai + vouches + jobs),
  };
}

export function recalcTrust(w: Worker): number {
  const t = calculateTrustScore(w).total;
  if (w.trustScore !== t || w.trustHistory.length === 0) {
    w.trustScore = t;
    w.trustHistory = [...w.trustHistory, t].slice(-12);
  }
  return t;
}

const round50 = (n: number) => Math.round(n / 50) * 50;

export function evaluateFairWage(trade: Trade, level: Level, dailyWage: number): FairWageResult {
  const [min, max] = FAIR_WAGES[trade]?.[level] ?? [600, 900];
  let status: FairWageResult["status"] = "fair";
  if (dailyWage < min) status = "below";
  else if (dailyWage > max) status = "above";
  const suggested = status === "below" ? Math.max(min, round50((min + max) / 2)) : round50(Math.max(dailyWage * 1.1, min));
  const gapPct = status === "below" ? Math.round(((min - dailyWage) / min) * 100) : 0;
  return { min, max, status, suggested, gapPct };
}

const LEVEL_RANK: Record<Level, number> = { Beginner: 0, Skilled: 1, Expert: 2 };

export function matchWorkers(
  job: Pick<Job, "trade" | "lat" | "lng" | "required_level">,
  workers: Worker[],
  limit = 5
): Match[] {
  const eligible = workers
    .filter((w) => w.verified && w.trade === job.trade && w.status === "available")
    .filter((w) => LEVEL_RANK[w.level] >= LEVEL_RANK[job.required_level])
    .map((w) => {
      const distanceKm = haversineKm(job.lat, job.lng, w.lat, w.lng);
      const proximity = Math.max(0, 1 - distanceKm / 15) * 100;
      const matchScore = Math.round(w.trustScore * 0.6 + proximity * 0.4);
      return {
        workerId: w.id,
        name: w.name,
        level: w.level,
        trustScore: w.trustScore,
        distanceKm: Math.round(distanceKm * 10) / 10,
        matchScore,
      };
    })
    .filter((m) => m.distanceKm <= 25)
    .sort((a, b) => b.matchScore - a.matchScore);
  return eligible.slice(0, limit);
}

// ============================================================
// Cryptographic credential (HMAC-SHA256)
// ============================================================
const SECRET = process.env.HUNAR_SIGNING_SECRET || "hunarid-demo-signing-secret-v1";

export function credentialPayload(w: Worker): string {
  return JSON.stringify({
    iss: "HunarID",
    sub: w.id,
    name: w.name,
    trade: w.trade,
    level: w.level,
    aiScore: w.aiScore,
    rubric: w.rubric.map((c) => `${c.passed ? 1 : 0}:${c.name}`),
    verifiedAt: w.verifiedAt,
  });
}

export function signCredential(w: Worker): string {
  return crypto.createHmac("sha256", SECRET).update(credentialPayload(w)).digest("hex");
}

export function verifyCredential(w: Worker, signature = w.signature): boolean {
  if (!signature || !w.verified) return false;
  const expected = Buffer.from(signCredential(w), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// ============================================================
// Seed data
// ============================================================
type SeedRow = [string, Trade, Level, number, string, Lang, number, number, number, number]; // name, trade, level, years, area, lang, aiScore, vouches, jobs, avgRating*10

const SEED: SeedRow[] = [
  ["Suresh Gowda", "electrician", "Expert", 14, "Indiranagar", "kn", 91, 3, 42, 48],
  ["Mohammed Irfan", "electrician", "Skilled", 7, "BTM Layout", "hi", 74, 2, 18, 45],
  ["Lakshmi Devi", "electrician", "Skilled", 5, "HSR Layout", "kn", 69, 1, 9, 47],
  ["Raju Yadav", "electrician", "Beginner", 2, "Electronic City", "hi", 52, 0, 3, 41],
  ["Anil Kumar", "electrician", "Expert", 11, "Jayanagar", "kn", 86, 3, 35, 46],
  ["Prakash Naik", "plumber", "Expert", 16, "Malleshwaram", "kn", 88, 3, 51, 49],
  ["Sanjay Paswan", "plumber", "Skilled", 6, "Marathahalli", "hi", 71, 2, 14, 44],
  ["Venkatesh R", "plumber", "Skilled", 8, "Koramangala", "ta", 77, 1, 22, 43],
  ["Bablu Sheikh", "plumber", "Beginner", 1, "Whitefield", "bn", 48, 0, 2, 40],
  ["Manjunath S", "plumber", "Skilled", 9, "Rajajinagar", "kn", 73, 2, 27, 46],
  ["Ramesh Bhovi", "mason", "Expert", 20, "Yelahanka", "kn", 90, 3, 64, 48],
  ["Dinesh Mahto", "mason", "Skilled", 7, "KR Puram", "hi", 70, 1, 19, 42],
  ["Shivappa H", "mason", "Skilled", 10, "Banashankari", "kn", 76, 2, 31, 45],
  ["Arjun Majhi", "mason", "Beginner", 2, "Bellandur", "hi", 50, 0, 4, 39],
  ["Kavitha N", "mason", "Skilled", 6, "Hebbal", "kn", 68, 1, 11, 47],
  ["Joseph D'Souza", "carpenter", "Expert", 18, "Indiranagar", "en", 92, 3, 58, 49],
  ["Imran Ansari", "carpenter", "Skilled", 8, "JP Nagar", "hi", 75, 2, 24, 45],
  ["Gopal Vishwakarma", "carpenter", "Skilled", 9, "Koramangala", "hi", 78, 2, 29, 46],
  ["Selvam K", "carpenter", "Beginner", 3, "Electronic City", "ta", 54, 0, 5, 42],
  ["Harish Achar", "carpenter", "Expert", 13, "Whitefield", "kn", 84, 2, 37, 47],
];

const VOUCHERS = [
  "Prestige Constructions (site supervisor)",
  "Mrs. Rao, Jayanagar homeowner",
  "Sobha Interiors contractor",
  "Brigade Facility Mgmt",
  "Urban Fixit Services",
  "Mr. Iyer, HSR Layout RWA",
];

function seedWorker(row: SeedRow, i: number): Worker {
  const [name, trade, level, years, areaName, language, aiScore, vouchCount, jobs, rating10] = row;
  const { area, lat, lng } = resolveArea(areaName);
  const jitter = (n: number) => ((((i * 9301 + n * 49297) % 233280) / 233280) - 0.5) * 0.02;
  const passCount = aiScore >= 85 ? 5 : aiScore >= 65 ? 4 : 3;
  const rubric: Criterion[] = RUBRICS[trade].criteria.map((c, idx) => ({
    name: c,
    passed: idx < passCount,
    observation: idx < passCount ? "Observed correctly in assessment video" : "Needs improvement",
  }));
  const ratings = Array.from({ length: Math.min(jobs, 8) }, (_, k) => (k % 3 === 0 ? Math.round(rating10 / 10) : rating10 / 10 >= 4.5 ? 5 : 4));
  const w: Worker = {
    id: `w${String(i + 1).padStart(2, "0")}`,
    name,
    phone: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
    trade,
    level,
    years,
    area,
    lat: lat + jitter(1),
    lng: lng + jitter(2),
    language,
    aiScore,
    rubric,
    vouches: Array.from({ length: vouchCount }, (_, k) => ({
      by: VOUCHERS[(i + k) % VOUCHERS.length],
      note: "Worked with them on multiple sites. Reliable and skilled.",
      verified: true,
      at: Date.now() - (k + 1) * 86400000 * 30,
    })),
    ratings,
    jobsCompleted: jobs,
    trustScore: 0,
    trustHistory: [],
    verified: true,
    verifiedAt: Date.now() - (i + 3) * 86400000 * 7,
    signature: "",
    status: i % 7 === 3 ? "on_job" : "available",
    avatarHue: (i * 47) % 360,
  };
  // compute jobs component from avg rating
  w.ratings = w.ratings.length ? w.ratings : [rating10 / 10];
  recalcTrust(w);
  w.signature = signCredential(w);
  return w;
}

function seedEvents(): FeedEvent[] {
  const now = Date.now();
  const rows: [FeedEvent["type"], string, number][] = [
    ["system", "HunarID agent online · WhatsApp channel connected", 0],
    ["verify", "Kavitha N (Mason) verified via video assessment — Skilled", 9],
    ["job", "Brigade Facility Mgmt posted Plumber job in Malleshwaram · ₹950/day", 22],
    ["match", "Prakash Naik matched (1.2 km · Trust 87)", 23],
    ["wage", "Fair Wage Shield: Carpenter job raised ₹600 → ₹950/day", 41],
    ["complete", "Joseph D'Souza completed job · ⭐ 5.0 · Trust ↑", 63],
  ];
  return rows.map(([type, text, minsAgo]) => ({ id: uid("e"), ts: now - minsAgo * 60000, type, text }));
}

export function createSeed(): Store {
  return {
    workers: SEED.map(seedWorker),
    jobs: [],
    events: seedEvents(),
    chat: [],
    demo: { state: "NEW", workerId: null, livenessCode: null, pendingJobId: null, activeJobId: null, attempts: 0 },
    wageProtectedInr: 18400,
  };
}

// ============================================================
// Singleton
// ============================================================
const g = globalThis as unknown as { __hunarStore?: Store };

export function getStore(): Store {
  if (!g.__hunarStore) g.__hunarStore = createSeed();
  return g.__hunarStore;
}

export function resetStore(): Store {
  g.__hunarStore = createSeed();
  return g.__hunarStore;
}

export function logEvent(type: FeedEvent["type"], text: string) {
  const s = getStore();
  s.events.unshift({ id: uid("e"), ts: Date.now(), type, text });
  s.events = s.events.slice(0, 80);
}

export function pushBot(text: string, opts: Partial<Omit<ChatMessage, "id" | "from" | "text" | "ts">> = {}) {
  const s = getStore();
  const msg: ChatMessage = { id: uid("m"), from: "bot", kind: "text", text, ts: Date.now(), ...opts };
  s.chat.push(msg);
  return msg;
}

export function pushUser(text: string, opts: Partial<Omit<ChatMessage, "id" | "from" | "text" | "ts">> = {}) {
  const s = getStore();
  const msg: ChatMessage = { id: uid("m"), from: "user", kind: "text", text, ts: Date.now(), ...opts };
  s.chat.push(msg);
  return msg;
}

export function publicWorker(w: Worker) {
  // strip phone number — privacy by design
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phone, ...rest } = w;
  return { ...rest, breakdown: calculateTrustScore(w), signatureValid: verifyCredential(w) };
}
export type PublicWorker = ReturnType<typeof publicWorker>;

export function snapshot(aiMode: "gemini" | "demo") {
  const s = getStore();
  return {
    workers: s.workers.map(publicWorker),
    jobs: s.jobs,
    events: s.events,
    chat: s.chat,
    demo: s.demo,
    wageProtectedInr: s.wageProtectedInr,
    fairWages: FAIR_WAGES,
    fairWageSource: FAIR_WAGE_SOURCE,
    areas: Object.keys(AREAS),
    aiMode,
  };
}
export type Snapshot = ReturnType<typeof snapshot>;
