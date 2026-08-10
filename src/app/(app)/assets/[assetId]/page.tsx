import { AssetDetailPage } from "@/features/asset";

type AssetDetailRouteProps = {
  params: Promise<{ assetId: string }>;
};

export default async function AssetDetailRoute({ params }: AssetDetailRouteProps) {
  const { assetId } = await params;
  return <AssetDetailPage assetId={assetId} />;
}
