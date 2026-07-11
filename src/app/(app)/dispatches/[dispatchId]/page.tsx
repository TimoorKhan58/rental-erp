import { DispatchDetailPage } from "@/features/dispatch";

type DispatchDetailRoutePageProps = {
  params: Promise<{ dispatchId: string }>;
};

export default async function DispatchDetailRoutePage({
  params,
}: DispatchDetailRoutePageProps) {
  const { dispatchId } = await params;

  return <DispatchDetailPage dispatchId={dispatchId} />;
}
