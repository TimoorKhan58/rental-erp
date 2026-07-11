import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ChartOfAccountsPage } from "@/features/accounting";

export default function ChartOfAccountsRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ChartOfAccountsPage />
    </Suspense>
  );
}
