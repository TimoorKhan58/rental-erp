import { describe, expect, it, vi } from "vitest";

import { CreateCategoryService } from "@/modules/asset/application/services/create-category.service";
import { UpdateCategoryService } from "@/modules/asset/application/services/update-category.service";
import { DeleteCategoryService } from "@/modules/asset/application/services/delete-category.service";
import { GetCategoryByIdService } from "@/modules/asset/application/services/get-category-by-id.service";
import { ListCategoriesService } from "@/modules/asset/application/services/list-categories.service";
import {
  ASSET_CATEGORY_ENTITY_NAME,
  ASSET_CATEGORY_MODULE,
} from "@/modules/asset/application/services/category-service.constants";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/shared/infrastructure/errors";

import {
  CATEGORY_ID,
  OTHER_CATEGORY_ID,
  VALID_CREATE_CATEGORY_INPUT,
  buildCategoryEntity,
} from "../tests/helpers/asset-category.fixtures";
import { InMemoryAssetCategoryRepository } from "../tests/helpers/in-memory-asset-category.repository";
import { MockAuditLogger } from "../tests/helpers/mock-audit-logger";
import {
  createPassThroughCategoryTransactionRunner,
  createRollbackCategoryTransactionRunner,
} from "../tests/helpers/transaction-test-runner";

describe("CreateCategoryService", () => {
  it("creates a category and returns a DTO", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository,
        auditLogger,
      }),
    );

    const result = await service.execute(VALID_CREATE_CATEGORY_INPUT);

    expect(result.name).toBe("Equipment");
    expect(repository.count()).toBe(1);
  });

  it("rejects duplicate category name", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const service = new CreateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository,
        auditLogger: new MockAuditLogger(),
      }),
    );

    await expect(
      service.execute(VALID_CREATE_CATEGORY_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid input", async () => {
    const service = new CreateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository: new InMemoryAssetCategoryRepository(),
        auditLogger: new MockAuditLogger(),
      }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_CATEGORY_INPUT, name: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("UpdateCategoryService", () => {
  it("updates an existing category", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const service = new UpdateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository,
        auditLogger: new MockAuditLogger(),
      }),
    );

    const result = await service.execute(
      { id: CATEGORY_ID },
      { name: "Updated Equipment" },
    );

    expect(result.name).toBe("Updated Equipment");
  });

  it("throws when category does not exist", async () => {
    const service = new UpdateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository: new InMemoryAssetCategoryRepository(),
        auditLogger: new MockAuditLogger(),
      }),
    );

    await expect(
      service.execute({ id: CATEGORY_ID }, { name: "Updated" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects duplicate name on another category", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([
      buildCategoryEntity(),
      buildCategoryEntity({
        id: OTHER_CATEGORY_ID,
        name: "Vehicles",
      }),
    ]);
    const service = new UpdateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository,
        auditLogger: new MockAuditLogger(),
      }),
    );

    await expect(
      service.execute({ id: CATEGORY_ID }, { name: "Vehicles" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("DeleteCategoryService", () => {
  it("deletes an existing category", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const service = new DeleteCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository,
        auditLogger: new MockAuditLogger(),
      }),
    );

    await service.execute({ id: CATEGORY_ID });

    expect(repository.count()).toBe(0);
  });

  it("throws when category does not exist", async () => {
    const service = new DeleteCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository: new InMemoryAssetCategoryRepository(),
        auditLogger: new MockAuditLogger(),
      }),
    );

    await expect(service.execute({ id: CATEGORY_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("GetCategoryByIdService", () => {
  it("returns category DTO", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const service = new GetCategoryByIdService(repository);

    const result = await service.execute({ id: CATEGORY_ID });

    expect(result.id).toBe(CATEGORY_ID);
  });

  it("throws NotFoundError for missing category", async () => {
    const service = new GetCategoryByIdService(
      new InMemoryAssetCategoryRepository(),
    );

    await expect(service.execute({ id: CATEGORY_ID })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("ListCategoriesService", () => {
  it("returns paginated DTOs", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([
      buildCategoryEntity(),
      buildCategoryEntity({
        id: OTHER_CATEGORY_ID,
        name: "Vehicles",
      }),
    ]);
    const service = new ListCategoriesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 1,
      sortOrder: "asc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(2);
  });

  it("filters by active status", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([
      buildCategoryEntity(),
      buildCategoryEntity({
        id: OTHER_CATEGORY_ID,
        name: "Inactive Category",
        isActive: false,
      }),
    ]);
    const service = new ListCategoriesService(repository);

    const result = await service.execute({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      isActive: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isActive).toBe(false);
  });
});

describe("Category application audit behavior", () => {
  it("writes CREATE audit on success", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCategoryService(
      createPassThroughCategoryTransactionRunner({ repository, auditLogger }),
    );

    await service.execute(VALID_CREATE_CATEGORY_INPUT);

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]?.action).toBe("CREATE");
    expect(auditLogger.entries[0]?.module).toBe(ASSET_CATEGORY_MODULE);
    expect(auditLogger.entries[0]?.entityName).toBe(ASSET_CATEGORY_ENTITY_NAME);
  });

  it("writes UPDATE audit with old and new values", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new UpdateCategoryService(
      createPassThroughCategoryTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: CATEGORY_ID }, { name: "Updated Equipment" });

    expect(auditLogger.entries[0]?.action).toBe("UPDATE");
    expect(auditLogger.entries[0]?.oldValues).toMatchObject({
      name: "Equipment",
    });
    expect(auditLogger.entries[0]?.newValues).toMatchObject({
      name: "Updated Equipment",
    });
  });

  it("writes DELETE audit on success", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new DeleteCategoryService(
      createPassThroughCategoryTransactionRunner({ repository, auditLogger }),
    );

    await service.execute({ id: CATEGORY_ID });

    expect(auditLogger.entries[0]?.action).toBe("DELETE");
  });

  it("does not write audit when create fails validation", async () => {
    const auditLogger = new MockAuditLogger();
    const service = new CreateCategoryService(
      createPassThroughCategoryTransactionRunner({
        repository: new InMemoryAssetCategoryRepository(),
        auditLogger,
      }),
    );

    await expect(
      service.execute({ ...VALID_CREATE_CATEGORY_INPUT, name: "" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(auditLogger.entries).toHaveLength(0);
  });
});

describe("Category application transaction behavior", () => {
  it("commits successful writes", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    const auditLogger = new MockAuditLogger();
    const service = new CreateCategoryService(
      createRollbackCategoryTransactionRunner(repository, auditLogger),
    );

    await service.execute(VALID_CREATE_CATEGORY_INPUT);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(1);
  });

  it("rolls back data and audit when write fails", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const auditLogger = new MockAuditLogger();
    const service = new CreateCategoryService(
      createRollbackCategoryTransactionRunner(repository, auditLogger),
    );

    await expect(
      service.execute(VALID_CREATE_CATEGORY_INPUT),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(repository.count()).toBe(1);
    expect(auditLogger.entries).toHaveLength(0);
  });

  it("rolls back delete when audit logging fails", async () => {
    const repository = new InMemoryAssetCategoryRepository();
    repository.seed([buildCategoryEntity()]);
    const auditLogger = new MockAuditLogger();
    auditLogger.log = vi.fn(async () => {
      throw new Error("audit failed");
    });
    const service = new DeleteCategoryService(
      createRollbackCategoryTransactionRunner(repository, auditLogger),
    );

    await expect(service.execute({ id: CATEGORY_ID })).rejects.toThrow(
      "audit failed",
    );

    expect(repository.count()).toBe(1);
  });
});
