import type { ProductDto } from "../dtos/product.dto";
import {
  toProductDto,
  toProductId,
  toUpdateProductData,
} from "../mappers/product.mapper";
import {
  ProductIdParamSchema,
  UpdateProductSchema,
  type ProductIdParamInput,
  type UpdateProductInput,
} from "../schemas/product.schemas";
import { toProductAuditValues } from "./product-audit.mapper";
import {
  PRODUCT_ENTITY_NAME,
  PRODUCT_MODULE,
} from "./product-service.constants";
import type { IProductTransactionRunner } from "./product-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class UpdateProductService {
  constructor(private readonly transactionRunner: IProductTransactionRunner) {}

  async execute(
    params: ProductIdParamInput,
    input: UpdateProductInput,
  ): Promise<ProductDto> {
    const { id } = parseRequest(ProductIdParamSchema, params);
    const data = parseRequest(UpdateProductSchema, input);
    const productId = toProductId(id);
    const updateData = toUpdateProductData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(productId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product not found",
          details: { id },
        });
      }

      const updated = await repository.update(productId, updateData);

      await auditLogger.log({
        module: PRODUCT_MODULE,
        entityName: PRODUCT_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toProductAuditValues(existing),
        newValues: toProductAuditValues(updated),
      });

      return toProductDto(updated);
    });
  }
}
