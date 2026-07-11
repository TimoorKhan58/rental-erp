import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { WarehouseListPage } from "@/features/warehouse";

export default function WarehousesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <WarehouseListPage />
    </Suspense>
  );
}
