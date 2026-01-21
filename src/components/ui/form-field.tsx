import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ZodError } from "zod";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  type?: "text" | "email" | "number" | "password" | "date" | "url" | "tel";
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number | string;
  max?: number | string;
  step?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function FormField({
  id,
  label,
  error,
  required,
  type = "text",
  placeholder,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  className,
  inputClassName,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(error && "border-destructive", inputClassName)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface FormTextareaFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function FormTextareaField({
  id,
  label,
  error,
  required,
  placeholder,
  value,
  onChange,
  rows = 3,
  disabled,
  className,
}: FormTextareaFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface FormSelectFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FormSelectField({
  id,
  label,
  error,
  required,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
}: FormSelectFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive",
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Helper type for validation errors
export type ValidationErrors<T> = Partial<Record<keyof T | string, string>>;

// Helper function to extract Zod errors from a ZodError
export function extractZodErrors<T>(zodError: ZodError): ValidationErrors<T> {
  const errors: ValidationErrors<T> = {};
  zodError.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path as keyof T]) {
      errors[path as keyof T] = err.message;
    }
  });
  return errors;
}
