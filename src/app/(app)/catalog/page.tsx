import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { CatalogPage } from "@/features/catalog";

export default function CatalogRoutePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <CatalogPage />
    </Suspense>
  );
}
