import { WarehouseDetailPage } from "@/features/warehouse";

type WarehouseDetailRoutePageProps = {
  params: Promise<{ warehouseId: string }>;
};

export default async function WarehouseDetailRoutePage({
  params,
}: WarehouseDetailRoutePageProps) {
  const { warehouseId } = await params;

  return <WarehouseDetailPage warehouseId={warehouseId} />;
}
