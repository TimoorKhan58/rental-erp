import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { PaymentListPage } from "@/features/payment";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <PaymentListPage />
    </Suspense>
  );
}
