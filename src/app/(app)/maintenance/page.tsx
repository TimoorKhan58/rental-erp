import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { MaintenanceListPage } from "@/features/maintenance";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <MaintenanceListPage />
    </Suspense>
  );
}
