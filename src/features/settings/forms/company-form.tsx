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
        description="Company name appears in the app header, dashboard, and sign-in screen after save. The other fields are stored on the company record and are not printed on invoices yet."
        actions={
          canUpdate ? (
            <AppButton type="submit" loading={isSubmitting} disabled={!form.formState.isDirty}>
              Save company
            </AppButton>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="companyName"
            label="Company name"
            description="Shown in the header, dashboard, and sign-in screen."
            disabled={disabled}
          />
          <TextField control={form.control} name="businessName" label="Business name" disabled={disabled} />
          <TextField control={form.control} name="ownerName" label="Owner name" disabled={disabled} />
          <TextField control={form.control} name="email" label="Email" disabled={disabled} />
          <TextField control={form.control} name="phone" label="Phone" disabled={disabled} />
          <TextField control={form.control} name="secondaryPhone" label="Secondary phone" disabled={disabled} />
          <TextField control={form.control} name="website" label="Website" disabled={disabled} />
          <TextField
            control={form.control}
            name="logoUrl"
            label="Logo URL"
            description="Stored URL only. The current shell does not render this logo."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="faviconUrl"
            label="Favicon URL"
            description="Stored URL only. The browser tab icon is not changed from this field."
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Address"
        description="Stored on the company record. Current invoices and reports do not print this address block."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="address" label="Address" disabled={disabled} className="md:col-span-2" />
          <TextField control={form.control} name="city" label="City" disabled={disabled} />
          <TextField control={form.control} name="province" label="State / Province" disabled={disabled} />
          <TextField control={form.control} name="country" label="Country" disabled={disabled} />
          <TextField control={form.control} name="postalCode" label="Postal code" disabled={disabled} />
          <TextField
            control={form.control}
            name="ntn"
            label="Tax ID"
            description="Stored tax identifier. It is not printed on current invoices."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="strn"
            label="Secondary tax ID"
            description="Stored identifier. It is not printed on current invoices."
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard title="Locale & commerce defaults">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="currencyCode"
            label="Currency code"
            description="ISO 4217 code used by on-screen money formatting after save (USD, PKR, EUR, AED, …)."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="currencySymbol"
            label="Currency symbol"
            description="Stored display symbol. Live money formatting uses the currency code, not this override."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="timezone"
            label="Timezone"
            description="Used by on-screen date and time formatting after save."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="language"
            label="Language"
            description="Locale used by on-screen date and money formatting after save."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="dateFormat"
            label="Date format"
            description="Stored preference. Dates currently format from the language/timezone locale, not this pattern string."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="timeFormat"
            label="Time format"
            description="Stored preference. Times currently format from the language/timezone locale, not this pattern string."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="numberFormat"
            label="Number format"
            description="Stored preference. Numbers currently format from the language locale, not this pattern string."
            disabled={disabled}
          />
          <NumberField
            control={form.control}
            name="defaultRentalDays"
            label="Default rental days"
            description="Stored company default. Rental order duration is calculated from event dates, not this field."
            disabled={disabled}
          />
          <NumberField
            control={form.control}
            name="defaultTaxPercentage"
            label="Default tax %"
            description="Stored company default. Current rental invoices do not apply tax from this field."
            disabled={disabled}
          />
          <NumberField
            control={form.control}
            name="fiscalYearStartMonth"
            label="Fiscal year start month"
            description="Stored 1–12 value. Financial reports currently use the dates you select, not this field."
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Stored flags"
        description="These values are saved on the company record. The current application does not enforce them at runtime."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SwitchField
            control={form.control}
            name="securityDepositEnabled"
            label="Security deposit enabled"
            description="Stored flag only. Rental orders do not add a deposit from this switch."
            disabled={disabled}
          />
          <SwitchField
            control={form.control}
            name="lateFeeEnabled"
            label="Late fee enabled"
            description="Stored flag only. Returns and invoices do not calculate late fees from this switch."
            disabled={disabled}
          />
          <SwitchField
            control={form.control}
            name="isActive"
            label="Company active"
            description="Stored record flag. Sign-in and module access still use user permissions."
            disabled={disabled}
          />
          <SwitchField
            control={form.control}
            name="setupCompleted"
            label="Setup completed"
            description="Stored onboarding flag. It does not lock or unlock other modules."
            disabled={disabled}
          />
          <SwitchField
            control={form.control}
            name="maintenanceMode"
            label="Maintenance mode"
            description="Stored flag only. It does not currently take the application offline."
            disabled={disabled}
          />
        </div>
      </SectionCard>
    </AppForm>
  );
}
