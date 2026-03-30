import dynamic from "next/dynamic";
import { fetchNetworkData } from "@/lib/mutualContacts";

export const revalidate = 0;

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), { ssr: false });

export default async function NetworkChainPage() {
  let artistNames: string[] = [];
  let contacts: Awaited<ReturnType<typeof fetchNetworkData>>["contacts"] = [];

  try {
    const data = await fetchNetworkData();
    artistNames = data.artistNames;
    contacts = data.contacts;
  } catch {
    // show empty graph
  }

  return (
    <div style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>
      <NetworkGraph contacts={contacts} artistNames={artistNames} />
    </div>
  );
}
