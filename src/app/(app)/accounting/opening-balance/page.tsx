import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { OpeningBalancePage } from "@/features/accounting";

export default function OpeningBalanceRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <OpeningBalancePage />
    </Suspense>
  );
}
