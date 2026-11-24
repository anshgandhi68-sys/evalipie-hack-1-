import Landing, { type LandingData } from "@/components/landing/Landing";
import { TRADE_LABEL, getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Home() {
  const s = getStore();
  const verified = s.workers.filter((w) => w.verified);
  const workers: LandingData["workers"] = [...verified]
    .sort((a, b) => b.trustScore - a.trustScore)
    .map((w) => ({
      id: w.id,
      name: w.name,
      trade: w.trade,
      tradeLabel: TRADE_LABEL[w.trade].en,
      emoji: TRADE_LABEL[w.trade].emoji,
      level: w.level,
      area: w.area,
      trustScore: w.trustScore,
      jobs: w.jobsCompleted,
      rating: w.ratings.length ? w.ratings.reduce((a, b) => a + b, 0) / w.ratings.length : 0,
      vouches: w.vouches.length,
      aiScore: w.aiScore,
      passed: w.rubric.filter((c) => c.passed).length,
      hue: w.avatarHue,
    }));
  const data: LandingData = {
    stats: {
      verified: verified.length,
      avgTrust: Math.round(verified.reduce((a, w) => a + w.trustScore, 0) / Math.max(1, verified.length)),
      jobsDone: verified.reduce((a, w) => a + w.jobsCompleted, 0),
      wageProtected: s.wageProtectedInr,
    },
    workers,
    sampleId: workers[0]?.id ?? "w01",
  };
  return <Landing data={data} />;
}
