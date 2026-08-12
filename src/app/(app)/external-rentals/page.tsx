import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ExternalRentalListPage } from "@/features/external-rental";

export default function ExternalRentalsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ExternalRentalListPage />
    </Suspense>
  );
}
