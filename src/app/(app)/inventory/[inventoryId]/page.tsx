import { InventoryDetailPage } from "@/features/inventory";

type InventoryDetailRoutePageProps = {
  params: Promise<{ inventoryId: string }>;
};

export default async function InventoryDetailRoutePage({
  params,
}: InventoryDetailRoutePageProps) {
  const { inventoryId } = await params;

  return <InventoryDetailPage inventoryId={inventoryId} />;
}
