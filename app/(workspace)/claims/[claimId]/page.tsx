import { ClaimDetailClient } from "@/components/detail/ClaimDetailClient";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = await params;
  return <ClaimDetailClient claimId={claimId} />;
}
