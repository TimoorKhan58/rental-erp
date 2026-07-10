import type { ProductAttributeId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Attribute } from "./attribute.entity";
import type { AttributeListQuery } from "./attribute-list.query";
import type {
  CreateAttributeData,
  UpdateAttributeData,
} from "./attribute.types";

export interface IAttributeRepository {
  findById(id: ProductAttributeId): Promise<Attribute | null>;
  findByName(name: string): Promise<Attribute | null>;
  findPaged(query: AttributeListQuery): Promise<PaginatedResult<Attribute>>;
  exists(id: ProductAttributeId): Promise<boolean>;
  create(data: CreateAttributeData): Promise<Attribute>;
  update(
    id: ProductAttributeId,
    data: UpdateAttributeData,
  ): Promise<Attribute>;
  delete(id: ProductAttributeId): Promise<void>;
}
