import type { CompanySettingId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import {
  normalizeCreateSettingsData,
  normalizeSettingsProps,
  normalizeUpdateSettingsData,
} from "./settings.rules";
import type {
  CreateSettingsData,
  SettingsProps,
  UpdateSettingsData,
} from "./settings.types";

export class Settings implements Entity<CompanySettingId> {
  readonly id: CompanySettingId;
  readonly companyName: string;
  readonly businessName: string;
  readonly ownerName: string | null;
  readonly phone: string;
  readonly secondaryPhone: string | null;
  readonly email: string;
  readonly website: string | null;
  readonly address: string;
  readonly city: string;
  readonly province: string;
  readonly country: string;
  readonly postalCode: string | null;
  readonly ntn: string | null;
  readonly strn: string | null;
  readonly logoUrl: string | null;
  readonly faviconUrl: string | null;
  readonly currencyCode: string;
  readonly currencySymbol: string;
  readonly timezone: string;
  readonly language: string;
  readonly dateFormat: string;
  readonly timeFormat: string;
  readonly numberFormat: string;
  readonly defaultRentalDays: number;
  readonly defaultTaxPercentage: number;
  readonly fiscalYearStartMonth: number;
  readonly securityDepositEnabled: boolean;
  readonly lateFeeEnabled: boolean;
  readonly isActive: boolean;
  readonly setupCompleted: boolean;
  readonly maintenanceMode: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SettingsProps) {
    const normalized = normalizeSettingsProps(props);

    this.id = normalized.id;
    this.companyName = normalized.companyName;
    this.businessName = normalized.businessName;
    this.ownerName = normalized.ownerName;
    this.phone = normalized.phone;
    this.secondaryPhone = normalized.secondaryPhone;
    this.email = normalized.email;
    this.website = normalized.website;
    this.address = normalized.address;
    this.city = normalized.city;
    this.province = normalized.province;
    this.country = normalized.country;
    this.postalCode = normalized.postalCode;
    this.ntn = normalized.ntn;
    this.strn = normalized.strn;
    this.logoUrl = normalized.logoUrl;
    this.faviconUrl = normalized.faviconUrl;
    this.currencyCode = normalized.currencyCode;
    this.currencySymbol = normalized.currencySymbol;
    this.timezone = normalized.timezone;
    this.language = normalized.language;
    this.dateFormat = normalized.dateFormat;
    this.timeFormat = normalized.timeFormat;
    this.numberFormat = normalized.numberFormat;
    this.defaultRentalDays = normalized.defaultRentalDays;
    this.defaultTaxPercentage = normalized.defaultTaxPercentage;
    this.fiscalYearStartMonth = normalized.fiscalYearStartMonth;
    this.securityDepositEnabled = normalized.securityDepositEnabled;
    this.lateFeeEnabled = normalized.lateFeeEnabled;
    this.isActive = normalized.isActive;
    this.setupCompleted = normalized.setupCompleted;
    this.maintenanceMode = normalized.maintenanceMode;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateSettingsData,
  ): Omit<SettingsProps, "id" | "createdAt" | "updatedAt"> {
    return normalizeCreateSettingsData(data);
  }

  static reconstitute(props: SettingsProps): Settings {
    return new Settings(props);
  }

  toProps(): SettingsProps {
    return {
      id: this.id,
      companyName: this.companyName,
      businessName: this.businessName,
      ownerName: this.ownerName,
      phone: this.phone,
      secondaryPhone: this.secondaryPhone,
      email: this.email,
      website: this.website,
      address: this.address,
      city: this.city,
      province: this.province,
      country: this.country,
      postalCode: this.postalCode,
      ntn: this.ntn,
      strn: this.strn,
      logoUrl: this.logoUrl,
      faviconUrl: this.faviconUrl,
      currencyCode: this.currencyCode,
      currencySymbol: this.currencySymbol,
      timezone: this.timezone,
      language: this.language,
      dateFormat: this.dateFormat,
      timeFormat: this.timeFormat,
      numberFormat: this.numberFormat,
      defaultRentalDays: this.defaultRentalDays,
      defaultTaxPercentage: this.defaultTaxPercentage,
      fiscalYearStartMonth: this.fiscalYearStartMonth,
      securityDepositEnabled: this.securityDepositEnabled,
      lateFeeEnabled: this.lateFeeEnabled,
      isActive: this.isActive,
      setupCompleted: this.setupCompleted,
      maintenanceMode: this.maintenanceMode,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  withUpdated(data: UpdateSettingsData): Settings {
    const normalized = normalizeUpdateSettingsData(data);

    return Settings.reconstitute({
      ...this.toProps(),
      companyName: normalized.companyName ?? this.companyName,
      businessName: normalized.businessName ?? this.businessName,
      ownerName:
        normalized.ownerName !== undefined ? normalized.ownerName : this.ownerName,
      phone: normalized.phone ?? this.phone,
      secondaryPhone:
        normalized.secondaryPhone !== undefined
          ? normalized.secondaryPhone
          : this.secondaryPhone,
      email: normalized.email ?? this.email,
      website: normalized.website !== undefined ? normalized.website : this.website,
      address: normalized.address ?? this.address,
      city: normalized.city ?? this.city,
      province: normalized.province ?? this.province,
      country: normalized.country ?? this.country,
      postalCode:
        normalized.postalCode !== undefined ? normalized.postalCode : this.postalCode,
      ntn: normalized.ntn !== undefined ? normalized.ntn : this.ntn,
      strn: normalized.strn !== undefined ? normalized.strn : this.strn,
      logoUrl: normalized.logoUrl !== undefined ? normalized.logoUrl : this.logoUrl,
      faviconUrl:
        normalized.faviconUrl !== undefined ? normalized.faviconUrl : this.faviconUrl,
      currencyCode: normalized.currencyCode ?? this.currencyCode,
      currencySymbol: normalized.currencySymbol ?? this.currencySymbol,
      timezone: normalized.timezone ?? this.timezone,
      language: normalized.language ?? this.language,
      dateFormat: normalized.dateFormat ?? this.dateFormat,
      timeFormat: normalized.timeFormat ?? this.timeFormat,
      numberFormat: normalized.numberFormat ?? this.numberFormat,
      defaultRentalDays: normalized.defaultRentalDays ?? this.defaultRentalDays,
      defaultTaxPercentage:
        normalized.defaultTaxPercentage ?? this.defaultTaxPercentage,
      fiscalYearStartMonth:
        normalized.fiscalYearStartMonth ?? this.fiscalYearStartMonth,
      securityDepositEnabled:
        normalized.securityDepositEnabled ?? this.securityDepositEnabled,
      lateFeeEnabled: normalized.lateFeeEnabled ?? this.lateFeeEnabled,
      isActive: normalized.isActive ?? this.isActive,
      setupCompleted: normalized.setupCompleted ?? this.setupCompleted,
      maintenanceMode: normalized.maintenanceMode ?? this.maintenanceMode,
      updatedAt: new Date(),
    });
  }
}
