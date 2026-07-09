export {
  handleCreateProduct,
  handleDeleteProduct,
  handleGetProductById,
  handleListProducts,
  handleUpdateProduct,
} from "./routes/product-api.routes";
export {
  runProductApiRoute,
  toJsonResponse,
  type ProductApiRouteOptions,
} from "./http/product-api.route-runner";
export {
  toProductListResponse,
  toProductResponse,
  type ProductListResponse,
  type ProductResponse,
} from "./mappers/product-response.mapper";
export { PRODUCT_ROUTES, type ProductRouteKey } from "./routes/product.routes";
