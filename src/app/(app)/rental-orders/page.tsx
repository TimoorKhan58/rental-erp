import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { RentalOrderListPage } from "@/features/rental-order";

export default function RentalOrdersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <RentalOrderListPage />
    </Suspense>
  );
}
