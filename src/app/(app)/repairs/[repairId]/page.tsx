import { RepairDetailPage } from "@/features/repair";

type RepairDetailRouteProps = {
  params: Promise<{ repairId: string }>;
};

export default async function RepairDetailRoute({ params }: RepairDetailRouteProps) {
  const { repairId } = await params;
  return <RepairDetailPage repairId={repairId} />;
}
