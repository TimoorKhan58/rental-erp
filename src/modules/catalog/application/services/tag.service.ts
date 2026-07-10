import type { PaginatedResult } from "@/shared/domain/pagination";

import type { TagDto } from "../dtos/tag.dto";
import type {
  CreateTagInput,
  TagIdParamInput,
  UpdateTagInput,
} from "../schemas/tag.schemas";
import type { ListTagsInput } from "../schemas/list-tags.schema";
import type { ITagService } from "./tag-application-services.interface";
import type { CreateTagService } from "./create-tag.service";
import type { DeleteTagService } from "./delete-tag.service";
import type { GetTagByIdService } from "./get-tag-by-id.service";
import type { ListTagsService } from "./list-tags.service";
import type { UpdateTagService } from "./update-tag.service";

export class TagService implements ITagService {
  constructor(
    private readonly getByIdService: GetTagByIdService,
    private readonly listService: ListTagsService,
    private readonly createService: CreateTagService,
    private readonly updateService: UpdateTagService,
    private readonly deleteService: DeleteTagService,
  ) {}

  getById(params: TagIdParamInput): Promise<TagDto> {
    return this.getByIdService.execute(params);
  }

  list(input: ListTagsInput): Promise<PaginatedResult<TagDto>> {
    return this.listService.execute(input);
  }

  create(input: CreateTagInput): Promise<TagDto> {
    return this.createService.execute(input);
  }

  update(
    params: TagIdParamInput,
    input: UpdateTagInput,
  ): Promise<TagDto> {
    return this.updateService.execute(params, input);
  }

  delete(params: TagIdParamInput): Promise<void> {
    return this.deleteService.execute(params);
  }
}
