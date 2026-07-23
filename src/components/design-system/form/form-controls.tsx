"use client";

import { useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { CalendarIcon, CheckIcon, ChevronsUpDownIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/forms";
import { AppButton } from "@/components/design-system/button";
import { SearchBox } from "@/components/shared/search-box";
import { parseCurrencyInput, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

type BaseFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

/** TextField — standard text input integrated with RHF. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  placeholder,
  type = "text",
}: BaseFieldProps<T> & { placeholder?: string; type?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <Input
          {...field}
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={field.value ?? ""}
        />
      )}
    />
  );
}

/** NumberField — numeric input with min/max support. */
export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  min,
  max,
  step,
}: BaseFieldProps<T> & { min?: number; max?: number; step?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <Input
          {...field}
          id={name}
          type="number"
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={field.value ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            field.onChange(value === "" ? undefined : Number(value));
          }}
        />
      )}
    />
  );
}

/** CurrencyField — currency formatted numeric input. */
export function CurrencyField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <Input
          id={name}
          inputMode="decimal"
          disabled={disabled}
          placeholder="0.00"
          value={field.value == null ? "" : formatCurrency(Number(field.value))}
          onChange={(event) => field.onChange(parseCurrencyInput(event.target.value))}
        />
      )}
    />
  );
}

/** TextAreaField — multiline text input. */
export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  rows = 4,
}: BaseFieldProps<T> & { rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <Textarea
          {...field}
          id={name}
          rows={rows}
          disabled={disabled}
          value={field.value ?? ""}
        />
      )}
    />
  );
}

/** SelectField — single select dropdown. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  options,
  placeholder = "Select an option",
}: BaseFieldProps<T> & {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <Select
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled}
        >
          <SelectTrigger id={name}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

/** ComboboxField — searchable single select. */
export function ComboboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
}: BaseFieldProps<T> & {
  options: Array<{ value: string; label: string; keywords?: string }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => {
        const selectedLabel =
          options.find((option) => option.value === field.value)?.label ?? null;

        const filteredOptions = options.filter((option) => {
          const query = search.trim().toLowerCase();
          if (!query) {
            return true;
          }

          const haystack = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
          return haystack.includes(query);
        });

        return (
          <Popover
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) {
                setSearch("");
              }
            }}
          >
            <PopoverTrigger
              render={
                <AppButton
                  id={name}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled}
                  className="w-full justify-between font-normal"
                  rightIcon={<ChevronsUpDownIcon className="size-4 opacity-50" />}
                />
              }
            >
              <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
                {selectedLabel ?? placeholder}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--anchor-width)] min-w-56 p-2" align="start">
              <SearchBox
                id={`${String(name)}-search`}
                value={search}
                onChange={setSearch}
                placeholder={searchPlaceholder}
                className="max-w-none"
              />
              <div className="max-h-56 overflow-y-auto pt-1" role="listbox">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </p>
                ) : (
                  filteredOptions.map((option) => {
                    const selected = option.value === field.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                          selected && "bg-muted",
                        )}
                        onClick={() => {
                          field.onChange(option.value);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}

/** MultiSelectField — checkbox list multi-select in a popover. */
export function MultiSelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  options,
}: BaseFieldProps<T> & {
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];

        return (
          <Popover>
            <PopoverTrigger
              render={
                <AppButton
                  variant="outline"
                  className="w-full justify-start font-normal"
                  disabled={disabled}
                />
              }
            >
              {selected.length > 0 ? `${selected.length} selected` : "Select options"}
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2" align="start">
              {options.map((option) => {
                const checked = selected.includes(option.value);

                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const next = isChecked
                          ? [...selected, option.value]
                          : selected.filter((value) => value !== option.value);
                        field.onChange(next);
                      }}
                    />
                    {option.label}
                  </label>
                );
              })}
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}

/** CheckboxField — boolean checkbox. */
export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      description={description}
      className={className}
      render={(field) => (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
          {label}
        </label>
      )}
    />
  );
}

/** SwitchField — boolean toggle switch. */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      description={description}
      className={className}
      render={(field) => (
        <div className="flex items-center justify-between gap-3">
          {label ? <Label htmlFor={name}>{label}</Label> : null}
          <Switch
            id={name}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        </div>
      )}
    />
  );
}

/** RadioGroupField — single-choice radio group. */
export function RadioGroupField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  options,
}: BaseFieldProps<T> & {
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <RadioGroup
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled}
          className="space-y-2"
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
              {option.label}
            </label>
          ))}
        </RadioGroup>
      )}
    />
  );
}

/** PasswordField — password input with visibility toggle. */
export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => (
        <div className="relative">
          <Input
            {...field}
            id={name}
            type={visible ? "text" : "password"}
            disabled={disabled}
            value={field.value ?? ""}
            className="pr-10"
          />
          <AppButton
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </AppButton>
        </div>
      )}
    />
  );
}

/** SearchField — standalone search input (non-RHF). */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SearchBox
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}

/** DatePickerField — calendar popover date picker. */
export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      className={className}
      render={(field) => {
        const dateValue = field.value ? new Date(field.value) : undefined;

        return (
          <Popover>
            <PopoverTrigger
              render={
                <AppButton
                  variant="outline"
                  className={cn("w-full justify-start font-normal", !dateValue && "text-muted-foreground")}
                  disabled={disabled}
                />
              }
            >
              <CalendarIcon className="size-4" />
              {dateValue ? format(dateValue, "PPP") : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => field.onChange(date?.toISOString())}
              />
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}
