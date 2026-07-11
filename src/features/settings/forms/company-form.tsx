"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  NumberField,
  SwitchField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import {
  updateCompanyFormSchema,
  type UpdateCompanyFormValues,
} from "../schemas";
import type { CompanySettingsResponse } from "../types";

type CompanyFormProps = {
  company: CompanySettingsResponse;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdateCompanyFormValues) => void | Promise<void>;
};

function toFormValues(company: CompanySettingsResponse): UpdateCompanyFormValues {
  return {
    companyName: company.companyName,
    businessName: company.businessName,
    ownerName: company.ownerName,
    phone: company.phone,
    secondaryPhone: company.secondaryPhone,
    email: company.email,
    website: company.website,
    address: company.address,
    city: company.city,
    province: company.province,
    country: company.country,
    postalCode: company.postalCode,
    ntn: company.ntn,
    strn: company.strn,
    logoUrl: company.logoUrl,
    faviconUrl: company.faviconUrl,
    currencyCode: company.currencyCode,
    currencySymbol: company.currencySymbol,
    timezone: company.timezone,
    language: company.language,
    dateFormat: company.dateFormat,
    timeFormat: company.timeFormat,
    numberFormat: company.numberFormat,
    defaultRentalDays: company.defaultRentalDays,
    defaultTaxPercentage: company.defaultTaxPercentage,
    fiscalYearStartMonth: company.fiscalYearStartMonth,
    securityDepositEnabled: company.securityDepositEnabled,
    lateFeeEnabled: company.lateFeeEnabled,
    isActive: company.isActive,
    setupCompleted: company.setupCompleted,
    maintenanceMode: company.maintenanceMode,
  };
}

export function CompanyForm({
  company,
  canUpdate,
  isSubmitting = false,
  onSubmit,
}: CompanyFormProps) {
  const form = useForm<UpdateCompanyFormValues>({
    resolver: zodResolver(updateCompanyFormSchema),
    defaultValues: toFormValues(company),
  });

  useEffect(() => {
    form.reset(toFormValues(company));
  }, [company, form]);

  const disabled = !canUpdate;

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Company identity"
        actions={
          canUpdate ? (
            <AppButton type="submit" loading={isSubmitting} disabled={!form.formState.isDirty}>
              Save company
            </AppButton>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="companyName" label="Company name" disabled={disabled} />
          <TextField control={form.control} name="businessName" label="Business name" disabled={disabled} />
          <TextField control={form.control} name="ownerName" label="Owner name" disabled={disabled} />
          <TextField control={form.control} name="email" label="Email" disabled={disabled} />
          <TextField control={form.control} name="phone" label="Phone" disabled={disabled} />
          <TextField control={form.control} name="secondaryPhone" label="Secondary phone" disabled={disabled} />
          <TextField control={form.control} name="website" label="Website" disabled={disabled} />
          <TextField control={form.control} name="logoUrl" label="Logo URL" disabled={disabled} />
          <TextField control={form.control} name="faviconUrl" label="Favicon URL" disabled={disabled} />
        </div>
      </SectionCard>

      <SectionCard title="Address">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="address" label="Address" disabled={disabled} className="md:col-span-2" />
          <TextField control={form.control} name="city" label="City" disabled={disabled} />
          <TextField control={form.control} name="province" label="Province" disabled={disabled} />
          <TextField control={form.control} name="country" label="Country" disabled={disabled} />
          <TextField control={form.control} name="postalCode" label="Postal code" disabled={disabled} />
          <TextField control={form.control} name="ntn" label="NTN" disabled={disabled} />
          <TextField control={form.control} name="strn" label="STRN" disabled={disabled} />
        </div>
      </SectionCard>

      <SectionCard title="Locale & commerce defaults">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="currencyCode" label="Currency code" disabled={disabled} />
          <TextField control={form.control} name="currencySymbol" label="Currency symbol" disabled={disabled} />
          <TextField control={form.control} name="timezone" label="Timezone" disabled={disabled} />
          <TextField control={form.control} name="language" label="Language" disabled={disabled} />
          <TextField control={form.control} name="dateFormat" label="Date format" disabled={disabled} />
          <TextField control={form.control} name="timeFormat" label="Time format" disabled={disabled} />
          <TextField control={form.control} name="numberFormat" label="Number format" disabled={disabled} />
          <NumberField control={form.control} name="defaultRentalDays" label="Default rental days" disabled={disabled} />
          <NumberField control={form.control} name="defaultTaxPercentage" label="Default tax %" disabled={disabled} />
          <NumberField control={form.control} name="fiscalYearStartMonth" label="Fiscal year start month" disabled={disabled} />
        </div>
      </SectionCard>

      <SectionCard title="Flags">
        <div className="grid gap-4 md:grid-cols-2">
          <SwitchField control={form.control} name="securityDepositEnabled" label="Security deposit enabled" disabled={disabled} />
          <SwitchField control={form.control} name="lateFeeEnabled" label="Late fee enabled" disabled={disabled} />
          <SwitchField control={form.control} name="isActive" label="Company active" disabled={disabled} />
          <SwitchField control={form.control} name="setupCompleted" label="Setup completed" disabled={disabled} />
          <SwitchField control={form.control} name="maintenanceMode" label="Maintenance mode" disabled={disabled} />
        </div>
      </SectionCard>
    </AppForm>
  );
}
