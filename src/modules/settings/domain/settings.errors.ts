export class SettingsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsDomainError";
  }
}

export class SettingsInvariantError extends SettingsDomainError {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "SettingsInvariantError";
  }
}

export class SettingsNotFoundError extends SettingsDomainError {
  constructor(id?: string) {
    super(id ? `Settings not found: ${id}` : "Settings not found");
    this.name = "SettingsNotFoundError";
  }
}
