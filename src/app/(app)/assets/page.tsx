import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { AssetListPage } from "@/features/asset";

export default function AssetsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <AssetListPage />
    </Suspense>
  );
}
