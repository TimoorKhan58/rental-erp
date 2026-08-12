import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ExternalRentalDetailPage } from "@/features/external-rental";

interface PageProps {
  params: Promise<{ externalRentalId: string }>;
}

export default async function ExternalRentalDetailRoute({ params }: PageProps) {
  const { externalRentalId } = await params;

  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ExternalRentalDetailPage externalRentalId={externalRentalId} />
    </Suspense>
  );
}
