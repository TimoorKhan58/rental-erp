import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { GeneralLedgerPage } from "@/features/accounting";

export default function GeneralLedgerRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <GeneralLedgerPage />
    </Suspense>
  );
}
