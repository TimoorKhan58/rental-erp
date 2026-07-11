import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { RentalInvoiceListPage } from "@/features/rental-invoice";

export default function RentalInvoicesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <RentalInvoiceListPage />
    </Suspense>
  );
}
