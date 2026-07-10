import type { SettingsApplicationServices as SettingsApplicationServicesBase } from "@/modules/settings/application/services/settings-application-services.interface";
import { GenerateNextNumberService } from "@/modules/settings/application/services/generate-next-number.service";
import { GetNumberSequenceByIdService } from "@/modules/settings/application/services/get-number-sequence-by-id.service";
import { GetSettingsService } from "@/modules/settings/application/services/get-settings.service";
import { ListNumberSequencesService } from "@/modules/settings/application/services/list-number-sequences.service";
import {
  SettingsService,
  type ISettingsService,
} from "@/modules/settings/application/services/settings.service";
import { UpdateNumberSequenceService } from "@/modules/settings/application/services/update-number-sequence.service";
import { UpdateSettingsService } from "@/modules/settings/application/services/update-settings.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createNumberSequenceRepositoryFromSharedDeps } from "./create-number-sequence.repository";
import { createNumberSequenceTransactionRunner } from "./create-number-sequence-transaction.runner";
import { createSettingsRepositoryFromSharedDeps } from "./create-settings.repository";
import { createSettingsTransactionRunner } from "./create-settings-transaction.runner";
import { createSystemSettingsRepositoryFromSharedDeps } from "./create-system-settings.repository";

export type { SettingsApplicationServicesBase as SettingsApplicationServices };

export interface WiredSettingsApplicationServices
  extends SettingsApplicationServicesBase {
  settingsService: ISettingsService;
}

export function createSettingsApplicationServices(
  deps: SharedDeps,
): WiredSettingsApplicationServices {
  const settingsRepository = createSettingsRepositoryFromSharedDeps(deps);
  const systemSettingsRepository =
    createSystemSettingsRepositoryFromSharedDeps(deps);
  const numberSequenceRepository =
    createNumberSequenceRepositoryFromSharedDeps(deps);
  const settingsTransactionRunner = createSettingsTransactionRunner(deps);
  const numberSequenceTransactionRunner =
    createNumberSequenceTransactionRunner(deps);

  const getSettings = new GetSettingsService(
    settingsRepository,
    systemSettingsRepository,
  );
  const updateSettings = new UpdateSettingsService(settingsTransactionRunner);
  const listNumberSequences = new ListNumberSequencesService(
    numberSequenceRepository,
  );
  const getNumberSequenceById = new GetNumberSequenceByIdService(
    numberSequenceRepository,
  );
  const updateNumberSequence = new UpdateNumberSequenceService(
    numberSequenceTransactionRunner,
  );
  const generateNextNumber = new GenerateNextNumberService(
    numberSequenceTransactionRunner,
  );

  return {
    getSettings,
    updateSettings,
    listNumberSequences,
    getNumberSequenceById,
    updateNumberSequence,
    generateNextNumber,
    settingsService: new SettingsService(
      getSettings,
      updateSettings,
      listNumberSequences,
      getNumberSequenceById,
      updateNumberSequence,
      generateNextNumber,
    ),
  };
}
