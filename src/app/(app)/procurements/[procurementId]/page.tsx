import { ProcurementDetailPage } from "@/features/procurement";

type ProcurementDetailRoutePageProps = {
  params: Promise<{ procurementId: string }>;
};

export default async function ProcurementDetailRoutePage({
  params,
}: ProcurementDetailRoutePageProps) {
  const { procurementId } = await params;

  return <ProcurementDetailPage procurementId={procurementId} />;
}
