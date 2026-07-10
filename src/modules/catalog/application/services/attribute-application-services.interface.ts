import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AttributeDto } from "../dtos/attribute.dto";
import type {
  CreateAttributeInput,
  AttributeIdParamInput,
  UpdateAttributeInput,
} from "../schemas/attribute.schemas";
import type { ListAttributesInput } from "../schemas/list-attributes.schema";
import type { CreateAttributeService } from "./create-attribute.service";
import type { DeleteAttributeService } from "./delete-attribute.service";
import type { GetAttributeByIdService } from "./get-attribute-by-id.service";
import type { ListAttributesService } from "./list-attributes.service";
import type { UpdateAttributeService } from "./update-attribute.service";

export interface AttributeApplicationServices {
  getAttributeById: GetAttributeByIdService;
  listAttributes: ListAttributesService;
  createAttribute: CreateAttributeService;
  updateAttribute: UpdateAttributeService;
  deleteAttribute: DeleteAttributeService;
}

export interface IAttributeService {
  getById(params: AttributeIdParamInput): Promise<AttributeDto>;
  list(input: ListAttributesInput): Promise<PaginatedResult<AttributeDto>>;
  create(input: CreateAttributeInput): Promise<AttributeDto>;
  update(
    params: AttributeIdParamInput,
    input: UpdateAttributeInput,
  ): Promise<AttributeDto>;
  delete(params: AttributeIdParamInput): Promise<void>;
}
