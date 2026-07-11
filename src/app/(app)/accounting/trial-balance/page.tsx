import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { TrialBalancePage } from "@/features/accounting";

export default function TrialBalanceRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <TrialBalancePage />
    </Suspense>
  );
}
