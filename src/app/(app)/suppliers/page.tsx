import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { SupplierListPage } from "@/features/supplier";

export default function SuppliersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <SupplierListPage />
    </Suspense>
  );
}
