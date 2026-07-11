import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ProductListPage } from "@/features/product";

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ProductListPage />
    </Suspense>
  );
}
