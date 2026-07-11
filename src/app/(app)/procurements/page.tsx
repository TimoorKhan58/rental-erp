import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ProcurementListPage } from "@/features/procurement";

export default function ProcurementsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ProcurementListPage />
    </Suspense>
  );
}
