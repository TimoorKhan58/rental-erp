import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { DispatchListPage } from "@/features/dispatch";

export default function DispatchesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <DispatchListPage />
    </Suspense>
  );
}
