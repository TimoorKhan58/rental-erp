import { toProductId } from "../mappers/product.mapper";
import {
  ProductIdParamSchema,
  type ProductIdParamInput,
} from "../schemas/product.schemas";
import { toProductAuditValues } from "./product-audit.mapper";
import {
  PRODUCT_ENTITY_NAME,
  PRODUCT_MODULE,
} from "./product-service.constants";
import type { IProductTransactionRunner } from "./product-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class DeleteProductService {
  constructor(private readonly transactionRunner: IProductTransactionRunner) {}

  async execute(input: ProductIdParamInput): Promise<void> {
    const { id } = parseRequest(ProductIdParamSchema, input);
    const productId = toProductId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(productId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Product not found",
          details: { id },
        });
      }

      await repository.delete(productId);

      await auditLogger.log({
        module: PRODUCT_MODULE,
        entityName: PRODUCT_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toProductAuditValues(existing),
      });
    });
  }
}
