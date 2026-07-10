import type { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toNumberSequenceAuditValues(
  sequence: NumberSequence,
): AuditValues {
  const props = sequence.toProps();

  return {
    id: props.id,
    companySettingId: props.companySettingId,
    documentType: props.documentType,
    prefix: props.prefix,
    suffix: props.suffix,
    startingNumber: props.startingNumber,
    currentNumber: props.currentNumber,
    paddingLength: props.paddingLength,
  };
}
