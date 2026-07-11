import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ReturnListPage } from "@/features/return";

export default function ReturnsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ReturnListPage />
    </Suspense>
  );
}
