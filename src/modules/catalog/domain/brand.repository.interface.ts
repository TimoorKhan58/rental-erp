import type { BrandId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Brand } from "./brand.entity";
import type { BrandListQuery } from "./brand-list.query";
import type { CreateBrandData, UpdateBrandData } from "./brand.types";

export interface IBrandRepository {
  findById(id: BrandId): Promise<Brand | null>;
  findByName(name: string): Promise<Brand | null>;
  findPaged(query: BrandListQuery): Promise<PaginatedResult<Brand>>;
  exists(id: BrandId): Promise<boolean>;
  create(data: CreateBrandData): Promise<Brand>;
  update(id: BrandId, data: UpdateBrandData): Promise<Brand>;
  delete(id: BrandId): Promise<void>;
}
