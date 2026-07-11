import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { CustomerListPage } from "@/features/customer";

export default function CustomersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <CustomerListPage />
    </Suspense>
  );
}
