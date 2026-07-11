import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { RepairListPage } from "@/features/repair";

export default function RepairsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <RepairListPage />
    </Suspense>
  );
}
