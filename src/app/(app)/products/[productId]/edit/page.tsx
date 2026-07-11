import { ProductEditPage } from "@/features/product";

type ProductEditRoutePageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductEditRoutePage({
  params,
}: ProductEditRoutePageProps) {
  const { productId } = await params;

  return <ProductEditPage productId={productId} />;
}
