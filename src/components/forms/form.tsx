"use client";

import {
  createContext,
  useContext,
  useId,
  type ReactNode,
} from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AppFormProps<TFieldValues extends FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  onSubmit: (values: TFieldValues) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function AppForm<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  id,
}: AppFormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form
        id={id}
        className={className}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}

type FormFieldContextValue = {
  id: string;
  name: string;
  error?: string;
  descriptionId?: string;
  messageId?: string;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
  render: (field: ControllerRenderProps<TFieldValues, TName>) => ReactNode;
};

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  className,
  render,
}: FormFieldProps<TFieldValues, TName>) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = `${id}-message`;

  return (
    <Controller
      control={control}
      name={name}
      render={(controllerProps) => {
        const error = controllerProps.fieldState.error?.message;

        return (
          <FormFieldContext.Provider
            value={{ id, name: String(name), error, descriptionId, messageId }}
          >
            <div className={cn("space-y-2", className)}>
              {label ? (
                <Label htmlFor={id} className={error ? "text-destructive" : undefined}>
                  {label}
                </Label>
              ) : null}
              {render(controllerProps.field)}
              {description ? (
                <p id={descriptionId} className="text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
              {error ? (
                <p id={messageId} className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </FormFieldContext.Provider>
        );
      }}
    />
  );
}

export function useFormField(): FormFieldContextValue {
  const context = useContext(FormFieldContext);

  if (!context) {
    throw new Error("useFormField must be used within a FormField.");
  }

  return context;
}

export function useAppFormContext<TFieldValues extends FieldValues>() {
  return useFormContext<TFieldValues>();
}
