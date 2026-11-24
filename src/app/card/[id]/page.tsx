import CardView from "./CardView";

export const dynamic = "force-dynamic";

/**
 * The card data is fetched client-side from /api/card/:id so it is served by the
 * same server function that holds the live demo store (important on Vercel).
 */
export default async function SkillCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tamper?: string }> }) {
  const { id } = await params;
  const { tamper } = await searchParams;
  return <CardView id={id} tamper={tamper === "1"} />;
}
