import {
  LEVEL_HI,
  RUBRICS,
  TRADE_LABEL,
  evaluateFairWage,
  getStore,
  haversineKm,
  logEvent,
  matchWorkers,
  pushBot,
  recalcTrust,
  resolveArea,
  signCredential,
  uid,
  type Job,
  type Lang,
  type Level,
  type Trade,
  type Worker,
} from "./store";
import { assessTradeVideo, extractWorkerProfile } from "./gemini";

const DEMO_ID = "demo";

const isEn = (l?: Lang) => l === "en";
const tradeName = (t: Trade, l?: Lang) => (isEn(l) ? TRADE_LABEL[t].en : TRADE_LABEL[t].hi);
const levelName = (lv: Level, l?: Lang) => (isEn(l) ? lv : `${LEVEL_HI[lv]} (${lv})`);
const newCode = () => String(10 + Math.floor(Math.random() * 90));
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function demoWorker(): Worker | null {
  const s = getStore();
  return s.workers.find((w) => w.id === DEMO_ID) ?? null;
}

// ------------------------------------------------------------
// Chat input
// ------------------------------------------------------------
export interface ChatInput {
  text?: string;
  audioBase64?: string;
  audioMime?: string;
  videoBase64?: string;
  videoMime?: string;
  demoMode?: "hindi_voice" | "good_wiring" | "unsafe_wiring";
}

const greeting = () =>
  pushBot(
    "नमस्ते! 🙏 *Evalipie.in* में आपका स्वागत है — \"आपका हुनर, आपकी पहचान\"।\n\nअपना नाम, काम (जैसे बिजली, नल, चिनाई, बढ़ई), कितने साल का अनुभव और आपका इलाका बताइए। 🎙️ वॉइस नोट भेजें या टाइप करें।",
    {
      translation:
        "Welcome to Evalipie.in — \"Your skill is your ID\". Tell us your name, trade, years of experience and area. Send a voice note or type.",
      lang: "hi",
    }
  );

function askForVideo(w: Worker) {
  const s = getStore();
  const code = newCode();
  s.demo.livenessCode = code;
  const rubric = RUBRICS[w.trade];
  if (isEn(w.language)) {
    pushBot(`Now show us your skill 💪\n\n📹 Send a *30-second video* of you doing: *${rubric.task}*.\n\nWe'll check 5 points: ${rubric.criteria.map((c, i) => `\n${i + 1}. ${c}`).join("")}`, { lang: "en" });
    pushBot(`🔐 Liveness check: at the START of your video, look at the camera and say this number out loud:`, {
      kind: "liveness",
      lang: "en",
      meta: { code },
    });
  } else {
    pushBot(
      `अब अपना हुनर दिखाइए 💪\n\n📹 *30 सेकंड का वीडियो* भेजें जिसमें आप: *${rubric.taskHi}*।\n\nहम 5 बातें जाँचेंगे: ${rubric.criteria.map((c, i) => `\n${i + 1}. ${c}`).join("")}`,
      { lang: "hi", translation: `Send a 30-second video of: ${rubric.task}. We check 5 rubric points.` }
    );
    pushBot(`🔐 लाइवनेस जाँच: वीडियो की शुरुआत में कैमरे की तरफ़ देखकर यह नंबर ज़ोर से बोलें:`, {
      kind: "liveness",
      lang: "hi",
      translation: "Liveness check: say this number out loud at the start of your video",
      meta: { code },
    });
  }
}

export async function handleChat(input: ChatInput): Promise<{ error?: string }> {
  const s = getStore();
  const st = s.demo.state;
  const text = (input.text || "").trim();
  const lower = text.toLowerCase();
  const w = demoWorker();

  // Global commands
  if (lower === "reset") {
    return { error: "Use God-Mode → Reset Demo" };
  }

  switch (st) {
    case "NEW": {
      const looksLikeProfile = !!input.audioBase64 || input.demoMode === "hindi_voice" || text.split(/\s+/).length >= 5;
      if (!looksLikeProfile) {
        greeting();
        s.demo.state = "AWAITING_PROFILE";
        return {};
      }
      s.demo.state = "AWAITING_PROFILE";
      return onboardProfile(input);
    }
    case "AWAITING_PROFILE":
      if (!text && !input.audioBase64 && input.demoMode !== "hindi_voice") {
        pushBot("कृपया अपना परिचय वॉइस नोट या टेक्स्ट में भेजें 🎙️", { lang: "hi", translation: "Please introduce yourself by voice or text" });
        return {};
      }
      return onboardProfile(input);

    case "AWAITING_VIDEO": {
      if (!input.videoBase64 && input.demoMode !== "good_wiring" && input.demoMode !== "unsafe_wiring") {
        pushBot(
          isEn(w?.language) ? "📹 Please send your 30-second skill video (use the 📎 button)." : "📹 कृपया अपना 30 सेकंड का हुनर वीडियो भेजें (📎 बटन दबाएँ)।",
          { lang: w?.language, translation: isEn(w?.language) ? undefined : "Please send your 30-second skill video" }
        );
        return {};
      }
      return assessVideo(input);
    }

    case "VERIFIED_IDLE": {
      if (/card|कार्ड|id/.test(lower)) {
        sendCard(w!);
      } else {
        pushBot(
          isEn(w?.language)
            ? `✅ You're verified. We'll alert you on WhatsApp as soon as a matching job near ${w?.area} is posted. Type *card* to see your Skill Card.`
            : `✅ आप सत्यापित हैं। ${w?.area} के पास कोई भी काम आते ही हम आपको WhatsApp पर बताएँगे। अपना स्किल कार्ड देखने के लिए *card* लिखें।`,
          { lang: w?.language, translation: isEn(w?.language) ? undefined : "You're verified. We'll alert you when a matching job is posted nearby." }
        );
      }
      return {};
    }

    case "JOB_OFFERED":
      return respondToOffer(text);

    case "ACTIVE_JOB": {
      if (/done|complete|ho gaya|हो गया|khatam|ख़त्म|finished/.test(lower)) {
        s.demo.state = "AWAITING_RATING";
        pushBot(
          isEn(w?.language)
            ? "👏 Great! We've asked the employer to confirm & rate your work. Your Trust Score will update as soon as they do."
            : "👏 बढ़िया! हमने मालिक से काम की पुष्टि और रेटिंग माँगी है। रेटिंग मिलते ही आपका ट्रस्ट स्कोर अपडेट होगा।",
          { lang: w?.language, translation: isEn(w?.language) ? undefined : "We've asked the employer to rate your work." }
        );
        logEvent("system", `${w?.name} marked job done — awaiting employer rating`);
      } else {
        pushBot(
          isEn(w?.language) ? "💼 Job in progress. Reply *done* when the work is finished." : "💼 काम चल रहा है। काम पूरा होने पर *हो गया* लिखें।",
          { lang: w?.language, translation: isEn(w?.language) ? undefined : "Job in progress. Reply 'done' when finished." }
        );
      }
      return {};
    }

    case "AWAITING_RATING":
      pushBot(isEn(w?.language) ? "⏳ Waiting for the employer's rating…" : "⏳ मालिक की रेटिंग का इंतज़ार है…", {
        lang: w?.language,
        translation: isEn(w?.language) ? undefined : "Waiting for employer rating…",
      });
      return {};
  }
  return {};
}

async function onboardProfile(input: ChatInput): Promise<{ error?: string }> {
  const s = getStore();
  const p = await extractWorkerProfile({
    audioBase64: input.audioBase64,
    audioMime: input.audioMime,
    text: input.text,
    demoMode: input.demoMode === "hindi_voice" ? "hindi_voice" : undefined,
  });

  // attach transcript to the most recent user voice message
  const lastUser = [...s.chat].reverse().find((m) => m.from === "user");
  if (lastUser && lastUser.kind === "voice") lastUser.meta = { ...(lastUser.meta || {}), transcript: p.transcript };

  const loc = resolveArea(p.area);
  const existing = demoWorker();
  const w: Worker = existing ?? {
    id: DEMO_ID,
    name: p.name,
    phone: "+91 98450 12345",
    trade: p.trade,
    level: "Beginner",
    years: p.years_experience,
    area: loc.area,
    lat: loc.lat + 0.003,
    lng: loc.lng - 0.002,
    language: p.language,
    aiScore: 0,
    rubric: [],
    vouches: [],
    ratings: [],
    jobsCompleted: 0,
    trustScore: 0,
    trustHistory: [],
    verified: false,
    verifiedAt: 0,
    signature: "",
    status: "onboarding",
    isDemo: true,
    avatarHue: 145,
  };
  Object.assign(w, {
    name: p.name,
    trade: p.trade,
    years: p.years_experience,
    area: loc.area,
    lat: loc.lat + 0.003,
    lng: loc.lng - 0.002,
    language: p.language,
  });
  if (!existing) s.workers.push(w);
  s.demo.workerId = w.id;

  const reply =
    p.reply_in_worker_language ||
    (isEn(w.language) ? `Thanks ${w.name}! Profile created.` : `धन्यवाद ${w.name} जी! प्रोफ़ाइल बन गई।`);
  pushBot(
    `${reply}\n\n👤 ${w.name}\n${TRADE_LABEL[w.trade].emoji} ${tradeName(w.trade, w.language)} · ${w.years} ${isEn(w.language) ? "yrs" : "साल"}\n📍 ${w.area}`,
    {
      lang: w.language,
      translation: isEn(w.language) ? undefined : `Profile created: ${w.name}, ${TRADE_LABEL[w.trade].en}, ${w.years} yrs, ${w.area}`,
      meta: { source: p.source },
    }
  );
  logEvent("onboard", `${w.name} onboarded via ${input.audioBase64 || input.demoMode ? "voice note" : "text"} (${w.language.toUpperCase()}) · ${TRADE_LABEL[w.trade].en} · ${w.area}`);
  s.demo.state = "AWAITING_VIDEO";
  askForVideo(w);
  return {};
}

async function assessVideo(input: ChatInput): Promise<{ error?: string }> {
  const s = getStore();
  const w = demoWorker();
  if (!w) return { error: "No worker" };
  const code = s.demo.livenessCode || newCode();
  s.demo.attempts += 1;

  const a = await assessTradeVideo({
    videoBase64: input.videoBase64,
    videoMime: input.videoMime,
    trade: w.trade,
    livenessCode: code,
    language: w.language,
    demoMode: input.demoMode,
  });

  pushBot(a.summary_in_worker_language || (a.score_0_100 >= 50 ? "Assessment complete." : "Assessment failed."), {
    kind: "assessment",
    lang: w.language,
    meta: { assessment: a, code },
  });

  if (!a.liveness_passed || a.flagged_suspicious) {
    logEvent("fail", `⚠️ ${w.name}: liveness check failed / suspicious video — re-verification requested`);
    pushBot(
      isEn(w.language)
        ? "🚫 We couldn't confirm this was a live recording. Please record a fresh video and say the new code."
        : "🚫 हम पुष्टि नहीं कर पाए कि यह लाइव वीडियो है। कृपया नया वीडियो रिकॉर्ड करें और नया कोड बोलें।",
      { lang: w.language, translation: isEn(w.language) ? undefined : "Couldn't confirm live recording. Please re-record with the new code." }
    );
    askForVideo(w);
    return {};
  }

  const unsafe = a.score_0_100 < 45;
  if (unsafe) {
    logEvent("fail", `🛑 ${w.name}: unsafe practice detected (score ${a.score_0_100}) — not certified, safety tips sent`);
    pushBot(
      isEn(w.language)
        ? "🦺 Safety first: always switch OFF the MCB and test before touching wires. Watch this 2-min safety tip and try again — you've got this!"
        : "🦺 सुरक्षा पहले: तार छूने से पहले हमेशा MCB बंद करें और टेस्टर से जाँचें। 2 मिनट का सेफ्टी वीडियो देखें और फिर कोशिश करें — आप कर सकते हैं!",
      { lang: w.language, translation: isEn(w.language) ? undefined : "Safety first: switch off MCB & test before touching wires. Try again!" }
    );
    askForVideo(w);
    return {};
  }

  // VERIFIED
  w.aiScore = a.score_0_100;
  w.level = a.level;
  w.rubric = a.criteria;
  w.verified = true;
  w.verifiedAt = Date.now();
  w.status = "available";
  recalcTrust(w);
  w.signature = signCredential(w);
  s.demo.state = "VERIFIED_IDLE";
  s.demo.livenessCode = null;
  logEvent("verify", `✅ ${w.name} verified as ${w.level} ${TRADE_LABEL[w.trade].en} · AI ${a.score_0_100}/100 · Trust ${w.trustScore}`);
  sendCard(w);
  return {};
}

function sendCard(w: Worker) {
  pushBot(
    isEn(w.language)
      ? `🎉 Congratulations! Your *Evalipie.in Skill Card* is ready. Show this QR to any employer — no certificates needed.`
      : `🎉 बधाई हो! आपका *Evalipie.in स्किल कार्ड* तैयार है। यह QR किसी भी मालिक को दिखाएँ — किसी सर्टिफ़िकेट की ज़रूरत नहीं।`,
    {
      kind: "card",
      lang: w.language,
      translation: isEn(w.language) ? undefined : "Congratulations! Your Evalipie.in Skill Card is ready.",
      meta: { workerId: w.id, level: w.level, trustScore: w.trustScore, trade: w.trade, name: w.name },
    }
  );
}

// ------------------------------------------------------------
// Jobs
// ------------------------------------------------------------
export interface CreateJobInput {
  employer?: string;
  trade: Trade;
  area: string;
  duration_days: number;
  daily_wage: number;
  required_level: Level;
}

export function createJob(input: CreateJobInput): Job {
  const s = getStore();
  const loc = resolveArea(input.area);
  const fairWage = evaluateFairWage(input.trade, input.required_level, input.daily_wage);
  const job: Job = {
    id: uid("job"),
    employer: input.employer || "Sharma Constructions",
    trade: input.trade,
    area: loc.area,
    lat: loc.lat,
    lng: loc.lng,
    duration_days: input.duration_days,
    daily_wage: input.daily_wage,
    original_wage: input.daily_wage,
    required_level: input.required_level,
    status: "open",
    fairWage,
    matches: [],
    createdAt: Date.now(),
  };
  job.matches = matchWorkers(job, s.workers, 5);

  // Ensure the live demo worker is considered if eligible (closer than 25km, right trade)
  const dw = demoWorker();
  const demoIdle = dw && dw.verified && dw.trade === job.trade && s.demo.state === "VERIFIED_IDLE";
  if (dw && demoIdle && !job.matches.some((m) => m.workerId === dw.id)) {
    const d = haversineKm(job.lat, job.lng, dw.lat, dw.lng);
    if (d <= 25) {
      job.matches = [
        { workerId: dw.id, name: dw.name, level: dw.level, trustScore: dw.trustScore, distanceKm: Math.round(d * 10) / 10, matchScore: Math.round(dw.trustScore * 0.6 + Math.max(0, 1 - d / 15) * 40) },
        ...job.matches,
      ].slice(0, 5);
    }
  }
  s.jobs.unshift(job);

  logEvent("job", `${job.employer} posted ${TRADE_LABEL[job.trade].en} job · ${job.area} · ${job.duration_days}d · ${inr(job.daily_wage)}/day`);
  if (fairWage.status === "below") {
    logEvent("wage", `🛡️ Fair Wage Shield: ${inr(job.daily_wage)} is ${fairWage.gapPct}% below fair range (${inr(fairWage.min)}–${inr(fairWage.max)}) · suggested ${inr(fairWage.suggested)}`);
  }
  if (job.matches.length) {
    logEvent("match", `Matched ${job.matches.length} workers · top: ${job.matches[0].name} (${job.matches[0].distanceKm} km · Trust ${job.matches[0].trustScore})`);
  }

  if (dw && demoIdle && job.matches.some((m) => m.workerId === dw.id)) {
    offerToDemo(job, dw);
  } else if (job.matches[0]) {
    job.status = "offered";
    job.assignedWorkerId = job.matches[0].workerId;
  }
  return job;
}

function offerToDemo(job: Job, w: Worker) {
  const s = getStore();
  const m = job.matches.find((x) => x.workerId === w.id)!;
  const counter = job.fairWage.suggested;
  job.status = "offered";
  job.assignedWorkerId = w.id;
  job.counterOffer = counter;
  s.demo.pendingJobId = job.id;
  s.demo.state = "JOB_OFFERED";
  const fw = job.fairWage;
  const shieldHi =
    fw.status === "below"
      ? `\n\n🛡️ *Fair Wage Shield:* यह रेट उचित रेंज (${inr(fw.min)}–${inr(fw.max)}) से ${fw.gapPct}% कम है।`
      : `\n\n🛡️ *Fair Wage Shield:* रेट उचित है ✅ (${inr(fw.min)}–${inr(fw.max)})`;
  const shieldEn =
    fw.status === "below"
      ? `\n\n🛡️ *Fair Wage Shield:* This rate is ${fw.gapPct}% below the fair range (${inr(fw.min)}–${inr(fw.max)}).`
      : `\n\n🛡️ *Fair Wage Shield:* Fair rate ✅ (${inr(fw.min)}–${inr(fw.max)})`;
  const text = isEn(w.language)
    ? `🔔 *New job for you!*\n${TRADE_LABEL[job.trade].emoji} ${TRADE_LABEL[job.trade].en} — ${job.area} (${m.distanceKm} km)\n🏢 ${job.employer}\n📅 ${job.duration_days} days · 💰 ${inr(job.daily_wage)}/day${shieldEn}\n\nReply:\n*1* = Accept\n*2* = Skip\n*3* = Counter-offer ${inr(counter)}/day`
    : `🔔 *आपके लिए नया काम!*\n${TRADE_LABEL[job.trade].emoji} ${tradeName(job.trade, w.language)} — ${job.area} (${m.distanceKm} km)\n🏢 ${job.employer}\n📅 ${job.duration_days} दिन · 💰 ${inr(job.daily_wage)}/दिन${shieldHi}\n\nजवाब दें:\n*1* = स्वीकार ✅\n*2* = छोड़ें ❌\n*3* = ${inr(counter)}/दिन का काउंटर-ऑफर 💬`;
  pushBot(text, {
    kind: "job",
    lang: w.language,
    translation: isEn(w.language)
      ? undefined
      : `New job: ${TRADE_LABEL[job.trade].en}, ${job.area}, ${job.duration_days} days, ${inr(job.daily_wage)}/day. Reply 1 accept, 2 skip, 3 counter ${inr(counter)}.`,
    meta: { jobId: job.id, counter, fairStatus: fw.status },
  });
  logEvent("match", `📲 WhatsApp alert broadcast to top ${job.matches.length} matches incl. ${w.name} (${m.distanceKm} km) — first to accept wins`);
}

function respondToOffer(text: string): { error?: string } {
  const s = getStore();
  const w = demoWorker();
  const job = s.jobs.find((j) => j.id === s.demo.pendingJobId);
  if (!w || !job) {
    s.demo.state = "VERIFIED_IDLE";
    return {};
  }
  const t = text.trim().toLowerCase();
  if (t.startsWith("1") || /accept|haan|हाँ|ha\b|yes/.test(t)) {
    job.status = "active";
    w.status = "on_job";
    s.demo.state = "ACTIVE_JOB";
    s.demo.activeJobId = job.id;
    s.demo.pendingJobId = null;
    pushBot(
      isEn(w.language)
        ? `✅ Job confirmed! ${job.employer} has been notified.\n📍 ${job.area} · Start tomorrow 9:00 AM\n💰 ${inr(job.daily_wage)}/day × ${job.duration_days} days = *${inr(job.daily_wage * job.duration_days)}*\n\nYour number stays private 🔒 — the employer contacts you through Evalipie.in.`
        : `✅ काम पक्का! ${job.employer} को सूचित कर दिया गया है।\n📍 ${job.area} · कल सुबह 9 बजे से\n💰 ${inr(job.daily_wage)}/दिन × ${job.duration_days} दिन = *${inr(job.daily_wage * job.duration_days)}*\n\nआपका नंबर प्राइवेट रहेगा 🔒 — मालिक Evalipie.in के ज़रिए संपर्क करेगा।`,
      { lang: w.language, translation: isEn(w.language) ? undefined : `Job confirmed with ${job.employer}. Total ${inr(job.daily_wage * job.duration_days)}. Your number stays private.` }
    );
    logEvent("accept", `🤝 ${w.name} accepted ${job.employer}'s job at ${inr(job.daily_wage)}/day`);
    return {};
  }
  if (t.startsWith("2") || /skip|nahi|नहीं|no\b/.test(t)) {
    job.status = "open";
    job.assignedWorkerId = undefined;
    s.demo.pendingJobId = null;
    s.demo.state = "VERIFIED_IDLE";
    pushBot(isEn(w.language) ? "👍 Skipped. We'll send you the next matching job." : "👍 ठीक है, छोड़ दिया। अगला काम आते ही बताएँगे।", {
      lang: w.language,
      translation: isEn(w.language) ? undefined : "Skipped. We'll send the next match.",
    });
    const next = job.matches.find((m) => m.workerId !== w.id);
    if (next) {
      job.status = "offered";
      job.assignedWorkerId = next.workerId;
      logEvent("match", `${w.name} skipped · job re-offered to ${next.name}`);
    }
    return {};
  }
  if (t.startsWith("3") || /counter|zyada|ज़्यादा|more/.test(t)) {
    const counter = job.counterOffer || job.fairWage.suggested;
    const before = job.daily_wage;
    job.daily_wage = counter;
    job.status = "active";
    w.status = "on_job";
    s.demo.state = "ACTIVE_JOB";
    s.demo.activeJobId = job.id;
    s.demo.pendingJobId = null;
    const gained = (counter - before) * job.duration_days;
    if (gained > 0) s.wageProtectedInr += gained;
    pushBot(
      isEn(w.language)
        ? `💬 Counter-offer of ${inr(counter)}/day sent to ${job.employer}…`
        : `💬 ${job.employer} को ${inr(counter)}/दिन का काउंटर-ऑफर भेजा गया…`,
      { lang: w.language, translation: isEn(w.language) ? undefined : `Counter-offer of ${inr(counter)}/day sent…` }
    );
    pushBot(
      isEn(w.language)
        ? `🎉 ${job.employer} ACCEPTED ${inr(counter)}/day!\nYou earn *${inr(gained)} more* on this job. 💰 Total: ${inr(counter * job.duration_days)}\n📍 ${job.area} · Start tomorrow 9:00 AM`
        : `🎉 ${job.employer} ने ${inr(counter)}/दिन स्वीकार कर लिया!\nइस काम में आपको *${inr(gained)} ज़्यादा* मिलेंगे। 💰 कुल: ${inr(counter * job.duration_days)}\n📍 ${job.area} · कल सुबह 9 बजे से`,
      { lang: w.language, translation: isEn(w.language) ? undefined : `Employer accepted ${inr(counter)}/day! You earn ${inr(gained)} more.` }
    );
    logEvent("counter", `💬 ${w.name} counter-offered ${inr(before)} → ${inr(counter)}/day · ${job.employer} accepted (+${inr(gained)} for worker)`);
    return {};
  }
  pushBot(isEn(w.language) ? "Please reply *1*, *2* or *3*." : "कृपया *1*, *2* या *3* से जवाब दें।", { lang: w.language, translation: isEn(w.language) ? undefined : "Please reply 1, 2 or 3." });
  return {};
}

// ------------------------------------------------------------
// God-mode actions
// ------------------------------------------------------------
const DEMO_VOUCHERS = [
  { by: "Sharma Constructions (past employer)", note: "Did complete wiring for our 3BHK site. Neat and safe work." },
  { by: "Mrs. Priya Rao, Koramangala homeowner", note: "Fixed our full house wiring. Honest and punctual." },
  { by: "Brigade Facility Mgmt (site supervisor)", note: "Worked 6 months on our facility team. Highly reliable." },
  { by: "Urban Fixit Services", note: "Top-rated partner on 20+ jobs." },
];

export function vouchDemo(): { error?: string; before?: number; after?: number } {
  const w = demoWorker();
  if (!w) return { error: "Onboard the demo worker first (send a voice note in the chat)." };
  const before = w.trustScore;
  const v = DEMO_VOUCHERS[w.vouches.length % DEMO_VOUCHERS.length];
  w.vouches.push({ ...v, verified: true, at: Date.now() });
  const after = recalcTrust(w);
  if (w.verified) w.signature = signCredential(w);
  logEvent("vouch", `🤝 Verified vouch for ${w.name} from ${v.by} · Trust ${before} → ${after}`);
  pushBot(
    isEn(w.language)
      ? `🤝 *New verified vouch!*\n"${v.note}"\n— ${v.by}\n\n📈 Trust Score: ${before} → *${after}*`
      : `🤝 *नई सत्यापित सिफ़ारिश!*\n"${v.note}"\n— ${v.by}\n\n📈 ट्रस्ट स्कोर: ${before} → *${after}*`,
    { lang: w.language, translation: isEn(w.language) ? undefined : `New verified vouch from ${v.by}. Trust ${before} → ${after}` }
  );
  return { before, after };
}

export function completeAndRate(rating = 5): { error?: string; before?: number; after?: number } {
  const s = getStore();
  const w = demoWorker();
  if (!w || !w.verified) return { error: "Verify the demo worker first (send the skill video)." };
  let job = s.jobs.find((j) => j.id === s.demo.activeJobId) ?? s.jobs.find((j) => j.id === s.demo.pendingJobId);
  if (!job) {
    // close the loop even if no job was posted on stage
    job = createJob({ employer: "Sharma Constructions", trade: w.trade, area: w.area, duration_days: 2, daily_wage: evaluateFairWage(w.trade, w.level, 0).min, required_level: "Beginner" });
  }
  const before = w.trustScore;
  job.status = "completed";
  job.assignedWorkerId = w.id;
  job.rating = rating;
  w.ratings.push(rating);
  w.jobsCompleted += 1;
  w.status = "available";
  const after = recalcTrust(w);
  w.signature = signCredential(w);
  s.demo.state = "VERIFIED_IDLE";
  s.demo.activeJobId = null;
  s.demo.pendingJobId = null;
  const earned = job.daily_wage * job.duration_days;
  logEvent("complete", `⭐ ${job.employer} rated ${w.name} ${rating}★ · job closed · Trust ${before} → ${after}`);
  pushBot(
    isEn(w.language)
      ? `${"⭐".repeat(rating)}\n*${job.employer}* rated your work ${rating}/5!\n"Excellent, safe and on-time work."\n\n💰 ${inr(earned)} payment confirmed\n📈 Trust Score: ${before} → *${after}* 🚀\n\nYour Skill Card is updated. Higher trust = better-paying jobs!`
      : `${"⭐".repeat(rating)}\n*${job.employer}* ने आपके काम को ${rating}/5 रेटिंग दी!\n"बहुत बढ़िया, सुरक्षित और समय पर काम।"\n\n💰 ${inr(earned)} भुगतान की पुष्टि\n📈 ट्रस्ट स्कोर: ${before} → *${after}* 🚀\n\nआपका स्किल कार्ड अपडेट हो गया। ज़्यादा ट्रस्ट = ज़्यादा कमाई वाले काम!`,
    {
      lang: w.language,
      translation: isEn(w.language) ? undefined : `${job.employer} rated you ${rating}/5. Trust ${before} → ${after}. Skill Card updated.`,
      meta: { trustBefore: before, trustAfter: after },
    }
  );
  return { before, after };
}
