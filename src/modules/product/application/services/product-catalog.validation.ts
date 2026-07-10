import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type {
  BrandId,
  CategoryId,
  UnitOfMeasureId,
} from "@/shared/domain/ids";
import { NotFoundError } from "@/shared/infrastructure/errors";

export interface ProductCatalogRefs {
  categoryId?: CategoryId | null;
  brandId?: BrandId | null;
  unitId?: UnitOfMeasureId | null;
}

export interface ProductCatalogRepositories {
  categoryRepository: ICategoryRepository;
  brandRepository: IBrandRepository;
  unitRepository: IUnitRepository;
}

export async function validateProductCatalogRefs(
  repositories: ProductCatalogRepositories,
  refs: ProductCatalogRefs,
): Promise<void> {
  if (refs.categoryId) {
    const categoryExists = await repositories.categoryRepository.exists(
      refs.categoryId,
    );

    if (!categoryExists) {
      throw new NotFoundError({
        message: "Category not found",
        details: { categoryId: refs.categoryId },
      });
    }
  }

  if (refs.brandId) {
    const brandExists = await repositories.brandRepository.exists(refs.brandId);

    if (!brandExists) {
      throw new NotFoundError({
        message: "Brand not found",
        details: { brandId: refs.brandId },
      });
    }
  }

  if (refs.unitId) {
    const unitExists = await repositories.unitRepository.exists(refs.unitId);

    if (!unitExists) {
      throw new NotFoundError({
        message: "Unit of measure not found",
        details: { unitId: refs.unitId },
      });
    }
  }
}
