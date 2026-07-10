import type { ICatalogService } from "./catalog-application-services.interface";
import type { IAttributeService } from "./attribute-application-services.interface";
import type { IBrandService } from "./brand-application-services.interface";
import type { ICategoryService } from "./category-application-services.interface";
import type { ITagService } from "./tag-application-services.interface";
import type { IUnitService } from "./unit-application-services.interface";

export type { ICatalogService } from "./catalog-application-services.interface";
export class CatalogService implements ICatalogService {
  constructor(
    readonly categories: ICategoryService,
    readonly brands: IBrandService,
    readonly units: IUnitService,
    readonly attributes: IAttributeService,
    readonly tags: ITagService,
  ) {}
}
