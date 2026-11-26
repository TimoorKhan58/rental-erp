"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
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

  // Settings that changed nothing ("stored flag only", date and number
  // patterns, default tax, fiscal year…) are no longer shown: a switch that
  // does nothing only confuses. Their saved values stay in the form and are
  // saved back unchanged.
  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Your business"
        description="This is what your customers see. The company name is shown at the top of the app and on the sign-in page; the business name, phone, email and logo are printed on your bills."
        actions={
          canUpdate ? (
            <AppButton type="submit" loading={isSubmitting} disabled={!form.formState.isDirty}>
              Save changes
            </AppButton>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="companyName"
            label="Company name"
            description="Shown at the top of the app and on the sign-in page."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="businessName"
            label="Business name on bills"
            description="The name printed at the top of every bill."
            disabled={disabled}
          />
          <TextField control={form.control} name="ownerName" label="Owner name" disabled={disabled} />
          <TextField control={form.control} name="email" label="Email" disabled={disabled} />
          <TextField control={form.control} name="phone" label="Phone" disabled={disabled} />
          <TextField control={form.control} name="secondaryPhone" label="Second phone" disabled={disabled} />
          <TextField control={form.control} name="website" label="Website" disabled={disabled} />
          <TextField
            control={form.control}
            name="logoUrl"
            label="Logo web address"
            description="Optional. A web address of your logo image; it is printed on bills."
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Address and tax number"
        description="Printed on your bills, under your business name."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField control={form.control} name="address" label="Address" disabled={disabled} className="md:col-span-2" />
          <TextField control={form.control} name="city" label="City" disabled={disabled} />
          <TextField control={form.control} name="province" label="Province" disabled={disabled} />
          <TextField control={form.control} name="country" label="Country" disabled={disabled} />
          <TextField control={form.control} name="postalCode" label="Postal code" disabled={disabled} />
          <TextField
            control={form.control}
            name="ntn"
            label="Tax number (NTN)"
            description="Optional. Printed on bills."
            disabled={disabled}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Currency and time"
        description="How money, dates and times are shown everywhere in RentCore."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            control={form.control}
            name="currencyCode"
            label="Currency"
            description="The three-letter code, for example PKR, USD, AED."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="timezone"
            label="Time zone"
            description="For example Asia/Karachi. 'Today' on your dashboard and new forms follows this."
            disabled={disabled}
          />
          <TextField
            control={form.control}
            name="language"
            label="Language"
            description="For example en."
            disabled={disabled}
          />
        </div>
      </SectionCard>
    </AppForm>
  );
}
