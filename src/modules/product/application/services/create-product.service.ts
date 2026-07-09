import type { ProductDto } from "../dtos/product.dto";
import {
  toCreateProductData,
  toProductDto,
} from "../mappers/product.mapper";
import {
  CreateProductSchema,
  type CreateProductInput,
} from "../schemas/product.schemas";
import { toProductAuditValues } from "./product-audit.mapper";
import {
  PRODUCT_ENTITY_NAME,
  PRODUCT_MODULE,
} from "./product-service.constants";
import type { IProductTransactionRunner } from "./product-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

export class CreateProductService {
  constructor(private readonly transactionRunner: IProductTransactionRunner) {}

  async execute(input: CreateProductInput): Promise<ProductDto> {
    const data = parseRequest(CreateProductSchema, input);
    const createData = toCreateProductData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingCode = await repository.findByProductCode(
        createData.productCode,
      );

      if (existingCode !== null) {
        throw new ConflictError({
          message: "Product code already exists",
          details: { productCode: createData.productCode },
        });
      }

      const product = await repository.create(createData);

      await auditLogger.log({
        module: PRODUCT_MODULE,
        entityName: PRODUCT_ENTITY_NAME,
        recordId: product.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toProductAuditValues(product),
      });

      return toProductDto(product);
    });
  }
}
