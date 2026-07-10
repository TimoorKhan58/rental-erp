import { NumberSequenceInvariantError } from "./number-sequence.errors";
import type { NumberSequenceProps } from "./number-sequence.types";

export function formatDocumentNumber(
  prefix: string,
  number: number,
  paddingLength: number,
  suffix: string | null,
): string {
  assertValidPaddingLength(paddingLength);

  if (!Number.isInteger(number) || number < 0) {
    throw new NumberSequenceInvariantError(
      "Document number must be a non-negative integer",
      "number",
    );
  }

  const paddedNumber = String(number).padStart(paddingLength, "0");
  return `${prefix}${paddedNumber}${suffix ?? ""}`;
}

export function assertValidSequenceConfig(config: {
  prefix: string;
  startingNumber: number;
  currentNumber: number;
  paddingLength: number;
}): void {
  const prefix = config.prefix.trim();

  if (prefix.length === 0) {
    throw new NumberSequenceInvariantError("Prefix is required", "prefix");
  }

  assertValidStartingNumber(config.startingNumber);
  assertValidPaddingLength(config.paddingLength);
  assertCurrentNumberAtLeastStarting(config.currentNumber, config.startingNumber);
}

export function assertCanGenerate(config: {
  startingNumber: number;
  currentNumber: number;
  paddingLength: number;
  prefix: string;
}): void {
  assertValidSequenceConfig(config);

  const nextNumber = config.currentNumber;

  if (nextNumber < config.startingNumber) {
    throw new NumberSequenceInvariantError(
      "Current number must be at least the starting number before generating",
      "currentNumber",
    );
  }

  const maxNumberForPadding = 10 ** config.paddingLength - 1;

  if (nextNumber > maxNumberForPadding) {
    throw new NumberSequenceInvariantError(
      `Next number exceeds maximum supported by padding length ${config.paddingLength}`,
      "currentNumber",
    );
  }
}

export function assertValidStartingNumber(startingNumber: number): void {
  if (!Number.isInteger(startingNumber) || startingNumber < 1) {
    throw new NumberSequenceInvariantError(
      "Starting number must be a positive integer",
      "startingNumber",
    );
  }
}

export function assertValidPaddingLength(paddingLength: number): void {
  if (!Number.isInteger(paddingLength) || paddingLength < 1 || paddingLength > 12) {
    throw new NumberSequenceInvariantError(
      "Padding length must be between 1 and 12",
      "paddingLength",
    );
  }
}

export function assertCurrentNumberAtLeastStarting(
  currentNumber: number,
  startingNumber: number,
): void {
  if (!Number.isInteger(currentNumber) || currentNumber < startingNumber) {
    throw new NumberSequenceInvariantError(
      "Current number must be greater than or equal to the starting number",
      "currentNumber",
    );
  }
}

export function normalizeNumberSequenceProps(
  props: NumberSequenceProps,
): NumberSequenceProps {
  const prefix = props.prefix.trim();
  const suffix =
    props.suffix === null || props.suffix === undefined
      ? null
      : props.suffix.trim().length > 0
        ? props.suffix.trim()
        : null;

  assertValidSequenceConfig({
    prefix,
    startingNumber: props.startingNumber,
    currentNumber: props.currentNumber,
    paddingLength: props.paddingLength,
  });

  return {
    ...props,
    prefix,
    suffix,
  };
}

export function normalizeSequencePrefix(prefix: string): string {
  const trimmed = prefix.trim();

  if (trimmed.length === 0) {
    throw new NumberSequenceInvariantError("Prefix is required", "prefix");
  }

  return trimmed;
}

export function normalizeSequenceSuffix(
  suffix: string | null | undefined,
): string | null {
  if (suffix === null || suffix === undefined) {
    return null;
  }

  const trimmed = suffix.trim();
  return trimmed.length > 0 ? trimmed : null;
}
