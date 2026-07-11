import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { AuditListPage } from "@/features/audit";

export default function AuditPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <AuditListPage />
    </Suspense>
  );
}
