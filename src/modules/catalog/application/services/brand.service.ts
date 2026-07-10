import type { PaginatedResult } from "@/shared/domain/pagination";

import type { BrandDto } from "../dtos/brand.dto";
import type {
  CreateBrandInput,
  BrandIdParamInput,
  UpdateBrandInput,
} from "../schemas/brand.schemas";
import type { ListBrandsInput } from "../schemas/list-brands.schema";
import type { IBrandService } from "./brand-application-services.interface";
import type { CreateBrandService } from "./create-brand.service";
import type { DeleteBrandService } from "./delete-brand.service";
import type { GetBrandByIdService } from "./get-brand-by-id.service";
import type { ListBrandsService } from "./list-brands.service";
import type { UpdateBrandService } from "./update-brand.service";

export class BrandService implements IBrandService {
  constructor(
    private readonly getByIdService: GetBrandByIdService,
    private readonly listService: ListBrandsService,
    private readonly createService: CreateBrandService,
    private readonly updateService: UpdateBrandService,
    private readonly deleteService: DeleteBrandService,
  ) {}

  getById(params: BrandIdParamInput): Promise<BrandDto> {
    return this.getByIdService.execute(params);
  }

  list(input: ListBrandsInput): Promise<PaginatedResult<BrandDto>> {
    return this.listService.execute(input);
  }

  create(input: CreateBrandInput): Promise<BrandDto> {
    return this.createService.execute(input);
  }

  update(
    params: BrandIdParamInput,
    input: UpdateBrandInput,
  ): Promise<BrandDto> {
    return this.updateService.execute(params, input);
  }

  delete(params: BrandIdParamInput): Promise<void> {
    return this.deleteService.execute(params);
  }
}
