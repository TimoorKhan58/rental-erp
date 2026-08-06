import { vi } from "vitest";

import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";

/**
 * Typed stub for application tests that inject INumberSequenceRepository.
 * Create flows typically pass an explicit document number, so
 * generateNextNumber is unused unless overridden via Partial.
 */
export function createMockNumberSequenceRepository(
  overrides: Partial<INumberSequenceRepository> = {},
): INumberSequenceRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    findByDocumentType: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockRejectedValue(
      new Error("INumberSequenceRepository.update is not stubbed in this test"),
    ),
    generateNextNumber: vi
      .fn<INumberSequenceRepository["generateNextNumber"]>()
      .mockRejectedValue(
        new Error(
          "INumberSequenceRepository.generateNextNumber was called without a stub; provide a document number or override generateNextNumber",
        ),
      ),
    ...overrides,
  } satisfies INumberSequenceRepository;
}
