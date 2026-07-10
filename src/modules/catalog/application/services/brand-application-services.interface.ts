import type { PaginatedResult } from "@/shared/domain/pagination";

import type { BrandDto } from "../dtos/brand.dto";
import type {
  CreateBrandInput,
  BrandIdParamInput,
  UpdateBrandInput,
} from "../schemas/brand.schemas";
import type { ListBrandsInput } from "../schemas/list-brands.schema";
import type { CreateBrandService } from "./create-brand.service";
import type { DeleteBrandService } from "./delete-brand.service";
import type { GetBrandByIdService } from "./get-brand-by-id.service";
import type { ListBrandsService } from "./list-brands.service";
import type { UpdateBrandService } from "./update-brand.service";

export interface BrandApplicationServices {
  getBrandById: GetBrandByIdService;
  listBrands: ListBrandsService;
  createBrand: CreateBrandService;
  updateBrand: UpdateBrandService;
  deleteBrand: DeleteBrandService;
}

export interface IBrandService {
  getById(params: BrandIdParamInput): Promise<BrandDto>;
  list(input: ListBrandsInput): Promise<PaginatedResult<BrandDto>>;
  create(input: CreateBrandInput): Promise<BrandDto>;
  update(
    params: BrandIdParamInput,
    input: UpdateBrandInput,
  ): Promise<BrandDto>;
  delete(params: BrandIdParamInput): Promise<void>;
}
