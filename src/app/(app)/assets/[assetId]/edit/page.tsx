import { AssetEditPage } from "@/features/asset";

type AssetEditRouteProps = {
  params: Promise<{ assetId: string }>;
};

export default async function AssetEditRoute({ params }: AssetEditRouteProps) {
  const { assetId } = await params;
  return <AssetEditPage assetId={assetId} />;
}
