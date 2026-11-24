# Evalipie.in — "Your skill is your ID" · आपका हुनर, आपकी पहचान

**Track 4 (UnlockED)** · A closed-loop, voice-first WhatsApp AI agent that turns an Indian blue-collar worker's *skill* into a verifiable digital identity — and protects their wages.

> 🎙️ Voice onboarding → 🔐 Liveness-checked 30s video assessment → 🪪 Cryptographically signed Skill Card + QR → 📍 Hyper-local job match + 🛡️ Fair Wage Shield (1-tap counter-offer) → ✅ Job completion & rating → 📈 Live Trust Score jump

## Run it in 60 seconds

```bash
npm install
cp .env.example .env.local   # optionally add GEMINI_API_KEY
npm run dev                  # http://localhost:3000  (landing) · /studio (live demo)
```

- **Zero external setup**: no DB, no auth, no Twilio. Everything lives in an in-memory `globalThis` store pre-seeded with 20 realistic Bengaluru workers.
- **With `GEMINI_API_KEY`** → real Gemini 2.5 Flash: voice-note profile extraction (any Indian language), video skill assessment with liveness check, employer voice → job.
- **Without a key / rate-limited / timed out** → deterministic demo fallbacks. The stage demo never fails.

## Demo script (3 minutes)

0. Open `/` (landing) → **Launch live demo** → `/studio`.
1. **WhatsApp pane** → tap **🎙️ Demo Hindi Voice** (or record your own voice note) → Gemini extracts name/trade/years/area and replies in Hindi (spoken aloud via Web Speech API).
2. A random **2-digit liveness code** appears. Tap **⚠️ Demo Unsafe Video** → rejected with safety tips (worked on a live circuit). Tap **📹 Demo Good Wiring Video** (or upload a real video) → 5-point rubric, score, level → **Skill Card**.
3. **Employer Job Post** tab → Electrician · Koramangala · ₹700/day → **Fair Wage Shield** flashes amber (18% below fair range) → post → ranked matches (Haversine distance + Trust Score) → localized WhatsApp job alert lands in the chat.
4. In WhatsApp tap **💬 ₹1,000** (counter-offer) → employer accepts → "₹900 more for you".
5. **God-Mode** tab → **Complete Job & Rate 5★** → Trust Score jumps live (header widget + breakdown). **Simulate Vouch** adds +10.
6. Open the **Skill Card** (`/card/demo`) → ✓ Cryptographically Verified (HMAC-SHA256), QR, rubric, vouches, **Download Toolbox QR Sticker**. Click *Try tampering* to see verification fail.

## Architecture

| File | Role |
|---|---|
| `src/lib/store.ts` | In-memory store, 20 seeded workers, sample fair-wage table, 4 trade rubrics, `calculateTrustScore` (40% AI + 30% vouches + 30% jobs/ratings), `haversineKm`, `matchWorkers`, `evaluateFairWage`, HMAC `signCredential` / `verifyCredential` |
| `src/lib/gemini.ts` | `@google/genai` (`gemini-2.5-flash`, JSON mode): `extractWorkerProfile`, `assessTradeVideo`, `extractJobFromVoice` + deterministic fallbacks |
| `src/lib/engine.ts` | WhatsApp state machine `NEW → AWAITING_PROFILE → AWAITING_VIDEO → VERIFIED_IDLE → JOB_OFFERED → ACTIVE_JOB → AWAITING_RATING`, job creation/matching, vouch & rating actions |
| `src/app/api/chat/route.ts` | Worker WhatsApp messages (text / voice / video / demo modes) |
| `src/app/api/jobs/route.ts` | `GET` snapshot · `POST` create job (form or voice) · `PATCH` god-mode (`vouch`, `complete_and_rate`, `reset`) |
| `src/app/page.tsx` + `src/components/landing/*` | Editorial landing page: particle hero, sticky story, manifesto, gallery, product story, axonometric figures, pricing, ⌘K palette |
| `src/app/studio/page.tsx` | Split-screen Demo Studio: WhatsApp simulator + live dashboard |
| `src/components/LiveMap.tsx` | Raw Leaflet + OpenStreetMap map (no react-leaflet) |
| `src/app/card/[id]/page.tsx` | Public mobile-first Skill Card with live signature verification + QR |

**Privacy**: worker phone numbers are stripped from every API response and never shown on cards.
**Fair wages**: the wage table is clearly labelled *sample data* — swap in state minimum-wage notifications for production.

**Production path**: swap the simulated chat for the WhatsApp Cloud API webhook (same state machine), the in-memory store for Postgres, and HMAC for Ed25519 / W3C Verifiable Credentials.
