import { describe, expect, it, vi } from "vitest";

import { CreateProductService } from "@/modules/product/application/services/create-product.service";
import { DeleteProductService } from "@/modules/product/application/services/delete-product.service";
import { GetProductByIdService } from "@/modules/product/application/services/get-product-by-id.service";
import { ListProductsService } from "@/modules/product/application/services/list-products.service";
import { UpdateProductService } from "@/modules/product/application/services/update-product.service";
import {
  PRODUCT_ENTITY_NAME,
  PRODUCT_MODULE,
} from "@/modules/product/application/services/product-service.constants";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { ValidationError } from "@/shared/infrastructure/errors";

import {
  PRODUCT_ID,
  OTHER_PRODUCT_ID,
  VALID_CREATE_INPUT,
  buildProductEntity,
} from "../tests/helpers/product.fixtures";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createUnit,
} from "@/modules/product/domain";
import { InMemoryProductRepository } from "../tests/helpers/in-memory-product.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughTransactionRunner,
  createRollbackTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

describe("CreateProductService", () => {
  it("creates a product and returns a DTO", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(VALID_CREATE_INPUT);

    expect(result.productCode).toBe("PROD-001");
    expect(result.rentalRate).toBe("1500.00");
    expect(result.replacementCost).toBe("50000.00");
    expect(repository.count()).toBe(1);
  });

  it("creates a product without optional replacement cost", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const inputWithoutCost = {
      productCode: VALID_CREATE_INPUT.productCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      unit: VALID_CREATE_INPUT.unit,
      rentalRate: VALID_CREATE_INPUT.rentalRate,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    const result = await service.execute(inputWithoutCost);

    expect(result.replacementCost).toBeNull();
    expect(repository.count()).toBe(1);
  });

  it("rejects duplicate product code", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects invalid rental rate", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, rentalRate: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects negative replacement cost", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, replacementCost: -1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateProductService", () => {
  it("updates an existing product", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: PRODUCT_ID },
      { name: "Updated Name" },
    );

    expect(result.name).toBe("Updated Name");
  });

  it("throws when product does not exist", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new UpdateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ id: PRODUCT_ID }, { name: "Updated Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates rental rate", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: PRODUCT_ID },
      { rentalRate: 2000 },
    );

    expect(result.rentalRate).toBe("2000.00");
  });

  it("clears replacement cost when set to null", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    const result = await service.execute(
      { id: PRODUCT_ID },
      { replacementCost: null },
    );

    expect(result.replacementCost).toBeNull();
  });
});

describe("DeleteProductService", () => {
  it("deletes an existing product", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: PRODUCT_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when product does not exist", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new DeleteProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(service.execute({ id: PRODUCT_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetProductByIdService", () => {
  it("returns product DTO", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const service = new GetProductByIdService(repository);

    const result = await service.execute({ id: PRODUCT_ID });

    expect(result.id).toBe(PRODUCT_ID);
    expect(result.rentalRate).toBe("1500.00");
  });

  it("throws NotFoundError for missing product", async () => {
    const service = new GetProductByIdService(new InMemoryProductRepository());

    await expect(service.execute({ id: PRODUCT_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListProductsService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([
      buildProductEntity(),
      buildProductEntity({
        id: OTHER_PRODUCT_ID,
        productCode: createProductCode("PROD-002"),
        name: createProductName("Second Product"),
        unit: createUnit("hour"),
        rentalRate: createRentalRate(500),
      }),
    ]);
    const service = new ListProductsService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });
});

describe("Product application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(PRODUCT_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(PRODUCT_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: PRODUCT_ID }, { name: "Updated Name" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Wedding Tent 20x40",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Name",
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: PRODUCT_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createPassThroughTransactionRunner({ repository, auditLogger }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_INPUT, productCode: "" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Product application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemoryProductRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await service.execute(VALID_CREATE_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateProductService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemoryProductRepository();
    repository.seed([buildProductEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteProductService(
      createRollbackTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: PRODUCT_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
