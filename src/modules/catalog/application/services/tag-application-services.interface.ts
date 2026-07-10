import type { PaginatedResult } from "@/shared/domain/pagination";

import type { TagDto } from "../dtos/tag.dto";
import type {
  CreateTagInput,
  TagIdParamInput,
  UpdateTagInput,
} from "../schemas/tag.schemas";
import type { ListTagsInput } from "../schemas/list-tags.schema";
import type { CreateTagService } from "./create-tag.service";
import type { DeleteTagService } from "./delete-tag.service";
import type { GetTagByIdService } from "./get-tag-by-id.service";
import type { ListTagsService } from "./list-tags.service";
import type { UpdateTagService } from "./update-tag.service";

export interface TagApplicationServices {
  getTagById: GetTagByIdService;
  listTags: ListTagsService;
  createTag: CreateTagService;
  updateTag: UpdateTagService;
  deleteTag: DeleteTagService;
}

export interface ITagService {
  getById(params: TagIdParamInput): Promise<TagDto>;
  list(input: ListTagsInput): Promise<PaginatedResult<TagDto>>;
  create(input: CreateTagInput): Promise<TagDto>;
  update(
    params: TagIdParamInput,
    input: UpdateTagInput,
  ): Promise<TagDto>;
  delete(params: TagIdParamInput): Promise<void>;
}
