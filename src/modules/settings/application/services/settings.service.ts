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
import type { ISettingsService } from "./settings-application-services.interface";

export type { ISettingsService };
import type { GenerateNextNumberService } from "./generate-next-number.service";
import type { GetNumberSequenceByIdService } from "./get-number-sequence-by-id.service";
import type { GetSettingsService } from "./get-settings.service";
import type { ListNumberSequencesService } from "./list-number-sequences.service";
import type { UpdateNumberSequenceService } from "./update-number-sequence.service";
import type { UpdateSettingsService } from "./update-settings.service";

export class SettingsService implements ISettingsService {
  constructor(
    private readonly getSettingsService: GetSettingsService,
    private readonly updateSettingsService: UpdateSettingsService,
    private readonly listNumberSequencesService: ListNumberSequencesService,
    private readonly getNumberSequenceByIdService: GetNumberSequenceByIdService,
    private readonly updateNumberSequenceService: UpdateNumberSequenceService,
    private readonly generateNextNumberService: GenerateNextNumberService,
  ) {}

  getSettings(): Promise<SettingsProfileDto> {
    return this.getSettingsService.execute();
  }

  updateSettings(input: UpdateSettingsInput): Promise<SettingsProfileDto> {
    return this.updateSettingsService.execute(input);
  }

  listNumberSequences(): Promise<NumberSequenceDto[]> {
    return this.listNumberSequencesService.execute();
  }

  getNumberSequenceById(
    params: NumberSequenceIdParamInput,
  ): Promise<NumberSequenceDto> {
    return this.getNumberSequenceByIdService.execute(params);
  }

  updateNumberSequence(
    params: NumberSequenceIdParamInput,
    input: UpdateNumberSequenceInput,
  ): Promise<NumberSequenceDto> {
    return this.updateNumberSequenceService.execute(params, input);
  }

  generateNextNumber(
    params: NumberSequenceIdParamInput,
  ): Promise<GenerateNextNumberDto> {
    return this.generateNextNumberService.execute(params);
  }
}
