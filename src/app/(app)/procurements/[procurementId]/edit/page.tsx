import { ProcurementEditPage } from "@/features/procurement";

type ProcurementEditRoutePageProps = {
  params: Promise<{ procurementId: string }>;
};

export default async function ProcurementEditRoutePage({
  params,
}: ProcurementEditRoutePageProps) {
  const { procurementId } = await params;

  return <ProcurementEditPage procurementId={procurementId} />;
}
