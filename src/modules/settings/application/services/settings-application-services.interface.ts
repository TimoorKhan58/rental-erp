import type { ExecutionContext } from "@/shared/application/context";

import type { SettingsProfileDto } from "../dtos/settings.dto";
import type {
  GenerateNextNumberDto,
  NumberSequenceDto,
} from "../dtos/number-sequence.dto";
import type {
  NumberSequenceIdParamInput,
  UpdateNumberSequenceInput,
} from "../schemas/number-sequence.schemas";
import type { UpdateSettingsInput } from "../schemas/settings.schemas";
import type { GenerateNextNumberService } from "./generate-next-number.service";
import type { GetNumberSequenceByIdService } from "./get-number-sequence-by-id.service";
import type { GetSettingsService } from "./get-settings.service";
import type { ListNumberSequencesService } from "./list-number-sequences.service";
import type { UpdateNumberSequenceService } from "./update-number-sequence.service";
import type { UpdateSettingsService } from "./update-settings.service";

export interface SettingsApplicationServices {
  getSettings: GetSettingsService;
  updateSettings: UpdateSettingsService;
  listNumberSequences: ListNumberSequencesService;
  getNumberSequenceById: GetNumberSequenceByIdService;
  updateNumberSequence: UpdateNumberSequenceService;
  generateNextNumber: GenerateNextNumberService;
}

export type SettingsServiceResolver = (
  ctx: ExecutionContext,
) => SettingsApplicationServices;

export interface ISettingsService {
  getSettings(): Promise<SettingsProfileDto>;
  updateSettings(input: UpdateSettingsInput): Promise<SettingsProfileDto>;
  listNumberSequences(): Promise<NumberSequenceDto[]>;
  getNumberSequenceById(
    params: NumberSequenceIdParamInput,
  ): Promise<NumberSequenceDto>;
  updateNumberSequence(
    params: NumberSequenceIdParamInput,
    input: UpdateNumberSequenceInput,
  ): Promise<NumberSequenceDto>;
  generateNextNumber(
    params: NumberSequenceIdParamInput,
  ): Promise<GenerateNextNumberDto>;
}
