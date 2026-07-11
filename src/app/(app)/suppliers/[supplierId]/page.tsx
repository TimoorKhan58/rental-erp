import { SupplierDetailPage } from "@/features/supplier";

type SupplierDetailRoutePageProps = {
  params: Promise<{ supplierId: string }>;
};

export default async function SupplierDetailRoutePage({
  params,
}: SupplierDetailRoutePageProps) {
  const { supplierId } = await params;

  return <SupplierDetailPage supplierId={supplierId} />;
}
