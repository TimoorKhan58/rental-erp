import { ReturnDetailPage } from "@/features/return";

type ReturnDetailRouteProps = {
  params: Promise<{ returnId: string }>;
};

export default async function ReturnDetailRoute({ params }: ReturnDetailRouteProps) {
  const { returnId } = await params;
  return <ReturnDetailPage returnId={returnId} />;
}
