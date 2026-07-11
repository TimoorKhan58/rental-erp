import { ProductDetailPage } from "@/features/product";

type ProductDetailRoutePageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductDetailRoutePage({
  params,
}: ProductDetailRoutePageProps) {
  const { productId } = await params;

  return <ProductDetailPage productId={productId} />;
}
