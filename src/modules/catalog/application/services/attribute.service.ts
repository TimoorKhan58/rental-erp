import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AttributeDto } from "../dtos/attribute.dto";
import type {
  CreateAttributeInput,
  AttributeIdParamInput,
  UpdateAttributeInput,
} from "../schemas/attribute.schemas";
import type { ListAttributesInput } from "../schemas/list-attributes.schema";
import type { IAttributeService } from "./attribute-application-services.interface";
import type { CreateAttributeService } from "./create-attribute.service";
import type { DeleteAttributeService } from "./delete-attribute.service";
import type { GetAttributeByIdService } from "./get-attribute-by-id.service";
import type { ListAttributesService } from "./list-attributes.service";
import type { UpdateAttributeService } from "./update-attribute.service";

export class AttributeService implements IAttributeService {
  constructor(
    private readonly getByIdService: GetAttributeByIdService,
    private readonly listService: ListAttributesService,
    private readonly createService: CreateAttributeService,
    private readonly updateService: UpdateAttributeService,
    private readonly deleteService: DeleteAttributeService,
  ) {}

  getById(params: AttributeIdParamInput): Promise<AttributeDto> {
    return this.getByIdService.execute(params);
  }

  list(input: ListAttributesInput): Promise<PaginatedResult<AttributeDto>> {
    return this.listService.execute(input);
  }

  create(input: CreateAttributeInput): Promise<AttributeDto> {
    return this.createService.execute(input);
  }

  update(
    params: AttributeIdParamInput,
    input: UpdateAttributeInput,
  ): Promise<AttributeDto> {
    return this.updateService.execute(params, input);
  }

  delete(params: AttributeIdParamInput): Promise<void> {
    return this.deleteService.execute(params);
  }
}
