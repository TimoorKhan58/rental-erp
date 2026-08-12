import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ExternalRentalCreatePage } from "@/features/external-rental";

export default function NewExternalRentalPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ExternalRentalCreatePage />
    </Suspense>
  );
}
