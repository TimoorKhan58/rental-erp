import { Prisma } from "@/generated/prisma/client";
import { Settings } from "@/modules/settings/domain/settings.entity";
import type { CreateSettingsData, UpdateSettingsData } from "@/modules/settings/domain/settings.types";
import type { CompanySettingId } from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toSettingsDomain(record: {
  id: string;
  companyName: string;
  businessName: string;
  ownerName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string;
  website: string | null;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode: string | null;
  ntn: string | null;
  strn: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  defaultRentalDays: number;
  defaultTaxPercentage: Prisma.Decimal;
  fiscalYearStartMonth: number;
  securityDepositEnabled: boolean;
  lateFeeEnabled: boolean;
  isActive: boolean;
  setupCompleted: boolean;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Settings {
  return Settings.reconstitute({
    id: record.id as CompanySettingId,
    companyName: record.companyName,
    businessName: record.businessName,
    ownerName: record.ownerName,
    phone: record.phone,
    secondaryPhone: record.secondaryPhone,
    email: record.email,
    website: record.website,
    address: record.address,
    city: record.city,
    province: record.province,
    country: record.country,
    postalCode: record.postalCode,
    ntn: record.ntn,
    strn: record.strn,
    logoUrl: record.logoUrl,
    faviconUrl: record.faviconUrl,
    currencyCode: record.currencyCode,
    currencySymbol: record.currencySymbol,
    timezone: record.timezone,
    language: record.language,
    dateFormat: record.dateFormat,
    timeFormat: record.timeFormat,
    numberFormat: record.numberFormat,
    defaultRentalDays: record.defaultRentalDays,
    defaultTaxPercentage: decimalToNumber(record.defaultTaxPercentage),
    fiscalYearStartMonth: record.fiscalYearStartMonth,
    securityDepositEnabled: record.securityDepositEnabled,
    lateFeeEnabled: record.lateFeeEnabled,
    isActive: record.isActive,
    setupCompleted: record.setupCompleted,
    maintenanceMode: record.maintenanceMode,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toSettingsUpdateInput(
  data: UpdateSettingsData,
): Prisma.CompanySettingUpdateInput {
  const update: Prisma.CompanySettingUpdateInput = {};

  if (data.companyName !== undefined) {
    update.companyName = data.companyName;
  }

  if (data.businessName !== undefined) {
    update.businessName = data.businessName;
  }

  if (data.ownerName !== undefined) {
    update.ownerName = data.ownerName;
  }

  if (data.phone !== undefined) {
    update.phone = data.phone;
  }

  if (data.secondaryPhone !== undefined) {
    update.secondaryPhone = data.secondaryPhone;
  }

  if (data.email !== undefined) {
    update.email = data.email;
  }

  if (data.website !== undefined) {
    update.website = data.website;
  }

  if (data.address !== undefined) {
    update.address = data.address;
  }

  if (data.city !== undefined) {
    update.city = data.city;
  }

  if (data.province !== undefined) {
    update.province = data.province;
  }

  if (data.country !== undefined) {
    update.country = data.country;
  }

  if (data.postalCode !== undefined) {
    update.postalCode = data.postalCode;
  }

  if (data.ntn !== undefined) {
    update.ntn = data.ntn;
  }

  if (data.strn !== undefined) {
    update.strn = data.strn;
  }

  if (data.logoUrl !== undefined) {
    update.logoUrl = data.logoUrl;
  }

  if (data.faviconUrl !== undefined) {
    update.faviconUrl = data.faviconUrl;
  }

  if (data.currencyCode !== undefined) {
    update.currencyCode = data.currencyCode;
  }

  if (data.currencySymbol !== undefined) {
    update.currencySymbol = data.currencySymbol;
  }

  if (data.timezone !== undefined) {
    update.timezone = data.timezone;
  }

  if (data.language !== undefined) {
    update.language = data.language;
  }

  if (data.dateFormat !== undefined) {
    update.dateFormat = data.dateFormat;
  }

  if (data.timeFormat !== undefined) {
    update.timeFormat = data.timeFormat;
  }

  if (data.numberFormat !== undefined) {
    update.numberFormat = data.numberFormat;
  }

  if (data.defaultRentalDays !== undefined) {
    update.defaultRentalDays = data.defaultRentalDays;
  }

  if (data.defaultTaxPercentage !== undefined) {
    update.defaultTaxPercentage = toPrismaDecimal(data.defaultTaxPercentage);
  }

  if (data.fiscalYearStartMonth !== undefined) {
    update.fiscalYearStartMonth = data.fiscalYearStartMonth;
  }

  if (data.securityDepositEnabled !== undefined) {
    update.securityDepositEnabled = data.securityDepositEnabled;
  }

  if (data.lateFeeEnabled !== undefined) {
    update.lateFeeEnabled = data.lateFeeEnabled;
  }

  if (data.isActive !== undefined) {
    update.isActive = data.isActive;
  }

  if (data.setupCompleted !== undefined) {
    update.setupCompleted = data.setupCompleted;
  }

  if (data.maintenanceMode !== undefined) {
    update.maintenanceMode = data.maintenanceMode;
  }

  return update;
}

export function toSettingsCreateInput(
  data: CreateSettingsData,
): Prisma.CompanySettingCreateInput {
  const normalized = Settings.create(data);

  return {
    companyName: normalized.companyName,
    businessName: normalized.businessName,
    ownerName: normalized.ownerName,
    phone: normalized.phone,
    secondaryPhone: normalized.secondaryPhone,
    email: normalized.email,
    website: normalized.website,
    address: normalized.address,
    city: normalized.city,
    province: normalized.province,
    country: normalized.country,
    postalCode: normalized.postalCode,
    ntn: normalized.ntn,
    strn: normalized.strn,
    logoUrl: normalized.logoUrl,
    faviconUrl: normalized.faviconUrl,
    currencyCode: normalized.currencyCode,
    currencySymbol: normalized.currencySymbol,
    timezone: normalized.timezone,
    language: normalized.language,
    dateFormat: normalized.dateFormat,
    timeFormat: normalized.timeFormat,
    numberFormat: normalized.numberFormat,
    defaultRentalDays: normalized.defaultRentalDays,
    defaultTaxPercentage: toPrismaDecimal(normalized.defaultTaxPercentage),
    fiscalYearStartMonth: normalized.fiscalYearStartMonth,
    securityDepositEnabled: normalized.securityDepositEnabled,
    lateFeeEnabled: normalized.lateFeeEnabled,
    isActive: normalized.isActive,
    setupCompleted: normalized.setupCompleted,
    maintenanceMode: normalized.maintenanceMode,
  };
}
