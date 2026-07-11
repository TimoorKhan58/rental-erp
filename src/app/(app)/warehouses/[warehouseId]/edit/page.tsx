import { WarehouseEditPage } from "@/features/warehouse";

type WarehouseEditRoutePageProps = {
  params: Promise<{ warehouseId: string }>;
};

export default async function WarehouseEditRoutePage({
  params,
}: WarehouseEditRoutePageProps) {
  const { warehouseId } = await params;

  return <WarehouseEditPage warehouseId={warehouseId} />;
}
