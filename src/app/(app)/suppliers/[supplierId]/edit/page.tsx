import { SupplierEditPage } from "@/features/supplier";

type SupplierEditRoutePageProps = {
  params: Promise<{ supplierId: string }>;
};

export default async function SupplierEditRoutePage({
  params,
}: SupplierEditRoutePageProps) {
  const { supplierId } = await params;

  return <SupplierEditPage supplierId={supplierId} />;
}
