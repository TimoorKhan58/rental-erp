import { DispatchEditPage } from "@/features/dispatch";

type DispatchEditRoutePageProps = {
  params: Promise<{ dispatchId: string }>;
};

export default async function DispatchEditRoutePage({
  params,
}: DispatchEditRoutePageProps) {
  const { dispatchId } = await params;

  return <DispatchEditPage dispatchId={dispatchId} />;
}
