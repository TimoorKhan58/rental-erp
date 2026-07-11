import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { InventoryListPage } from "@/features/inventory";

export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <InventoryListPage />
    </Suspense>
  );
}
