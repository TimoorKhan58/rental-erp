import type { PrismaClient } from "@/generated/prisma/client";
import type { DocumentSequenceId } from "@/shared/domain/ids";
import type { DbClient } from "@/shared/infrastructure/database";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  repositoryFindFirst,
  repositoryFindMany,
  repositoryUpdate,
} from "@/shared/infrastructure/database";

import {
  DEFAULT_SEQUENCE_STARTING_NUMBER,
  DOCUMENT_TYPE_PREFIXES,
} from "@/modules/settings/domain/number-sequence.constants";
import { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import { NumberSequenceNotFoundError } from "@/modules/settings/domain/number-sequence.errors";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { assertCanGenerate } from "@/modules/settings/domain/number-sequence.rules";
import type { EnsureActiveCompanySettingsService } from "@/modules/settings/application/services/ensure-active-company-settings.service";
import type { DocumentType } from "@/modules/settings/domain/settings.constants";
import type {
  GeneratedNumberResult,
  UpdateNumberSequenceData,
} from "@/modules/settings/domain/number-sequence.types";

import {
  toNumberSequenceDomain,
  toNumberSequenceUpdateInput,
} from "../mappers/number-sequence.persistence.mapper";

const MODEL = "DocumentSequence";
const AUTO_CREATE_PADDING_LENGTH = 5;

function isPrismaClient(db: DbClient): db is PrismaClient {
  return "$transaction" in db;
}

export class PrismaNumberSequenceRepository implements INumberSequenceRepository {
  constructor(
    private readonly runner: RepositoryRunner,
    private readonly ensureActiveCompanySettings: EnsureActiveCompanySettingsService,
  ) {}

  findById(id: DocumentSequenceId): Promise<NumberSequence | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.documentSequence.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toNumberSequenceDomain(record) : null));
  }

  async findAll(): Promise<NumberSequence[]> {
    const companySetting = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.companySetting.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
      { model: "CompanySetting", operation: "findActive" },
    );

    if (companySetting === null) {
      return [];
    }

    const records = await repositoryFindMany(
      this.runner,
      (db) =>
        db.documentSequence.findMany({
          where: { companySettingId: companySetting.id },
          orderBy: { documentType: "asc" },
        }),
      { model: MODEL, operation: "findAll" },
    );

    return records.map(toNumberSequenceDomain);
  }

  findByDocumentType(documentType: DocumentType): Promise<NumberSequence | null> {
    return repositoryFindFirst(
      this.runner,
      async (db) => {
        const companySetting = await db.companySetting.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (companySetting === null) {
          return null;
        }

        return db.documentSequence.findUnique({
          where: {
            companySettingId_documentType: {
              companySettingId: companySetting.id,
              documentType,
            },
          },
        });
      },
      { model: MODEL, operation: "findByDocumentType" },
    ).then((record) => (record ? toNumberSequenceDomain(record) : null));
  }

  update(
    id: DocumentSequenceId,
    data: UpdateNumberSequenceData,
  ): Promise<NumberSequence> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.documentSequence.update({
          where: { id },
          data: toNumberSequenceUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    ).then(toNumberSequenceDomain);
  }

  generateNextNumber(documentType: DocumentType): Promise<GeneratedNumberResult> {
    return this.runner.run(async (db) => {
      const execute = (client: DbClient) =>
        this.generateNextNumberInTransaction(client, documentType);

      if (isPrismaClient(db)) {
        return db.$transaction((tx) => execute(tx));
      }

      return execute(db);
    }, { model: MODEL, operation: "generateNextNumber" });
  }

  private async generateNextNumberInTransaction(
    db: DbClient,
    documentType: DocumentType,
  ): Promise<GeneratedNumberResult> {
    await this.ensureActiveCompanySettings.execute();

    const companySetting = await db.companySetting.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (companySetting === null) {
      throw new Error("Company settings bootstrap failed");
    }

    let record = await db.documentSequence.findUnique({
      where: {
        companySettingId_documentType: {
          companySettingId: companySetting.id,
          documentType,
        },
      },
    });

    if (record === null) {
      const created = NumberSequence.create({
        companySettingId: companySetting.id as never,
        documentType,
        prefix: DOCUMENT_TYPE_PREFIXES[documentType],
        startingNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
        currentNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
        paddingLength: AUTO_CREATE_PADDING_LENGTH,
      });

      record = await db.documentSequence.create({
        data: {
          companySettingId: companySetting.id,
          documentType,
          prefix: created.prefix,
          suffix: created.suffix,
          startingNumber: created.startingNumber,
          currentNumber: created.currentNumber,
          paddingLength: created.paddingLength,
        },
      });
    }

    if (record === null) {
      throw new NumberSequenceNotFoundError(documentType);
    }

    const sequence = toNumberSequenceDomain(record);

    assertCanGenerate({
      prefix: sequence.prefix,
      startingNumber: sequence.startingNumber,
      currentNumber: sequence.currentNumber,
      paddingLength: sequence.paddingLength,
    });

    const number = sequence.currentNumber;
    const formattedNumber = sequence.formatNumber(number);
    const nextSequence = sequence.withNextNumber(number);

    const saved = await db.documentSequence.update({
      where: { id: record.id },
      data: {
        currentNumber: nextSequence.currentNumber,
      },
    });

    const savedDomain = toNumberSequenceDomain(saved);

    return {
      sequence: savedDomain,
      formattedNumber,
      number,
    };
  }
}
