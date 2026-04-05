import { fetchTotalConnectionsCount } from "@/lib/airtable";
import PricingClient from "@/components/PricingClient";

export const revalidate = 0;

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { trial_expired?: string };
}) {
  const trialExpired = searchParams?.trial_expired === "1";
  const totalConnections = trialExpired
    ? await fetchTotalConnectionsCount().catch(() => 0)
    : 0;

  return (
    <PricingClient
      trialExpired={trialExpired}
      totalConnections={totalConnections}
    />
  );
}
