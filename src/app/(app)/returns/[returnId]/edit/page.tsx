import { ReturnEditPage } from "@/features/return";

type ReturnEditRouteProps = {
  params: Promise<{ returnId: string }>;
};

export default async function ReturnEditRoute({ params }: ReturnEditRouteProps) {
  const { returnId } = await params;
  return <ReturnEditPage returnId={returnId} />;
}
