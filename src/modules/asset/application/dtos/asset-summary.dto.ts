import type { AssetSummaryResult } from "@/modules/asset/domain/asset-summary.types";

export type AssetSummaryDto = AssetSummaryResult;

export function toAssetSummaryDto(result: AssetSummaryResult): AssetSummaryDto {
  return result;
}
