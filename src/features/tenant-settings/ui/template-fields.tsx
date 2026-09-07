import type { TenantTemplate, TenantTemplateField } from "../model/settings.types";
import { Label } from "../../../shared/ui/label";
import type { ReactNode } from "react";

interface TemplateFieldsProps {
  template: TenantTemplate;
  values: Record<string, unknown>;
  systemKeys: string[];
  scope?: "ENQUIRY" | "APPLICATION" | "BOTH";
  onChange: (key: string, value: unknown) => void;
  renderSystemField?: (field: TenantTemplateField) => ReactNode;
}

function fieldValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function TemplateInput({
  field,
  value,
  onChange,
}: {
  field: TenantTemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputClass =
    "flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

  if (field.type === "textarea") {
    return (
      <textarea
        required={field.required}
        value={fieldValue(value)}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="flex w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-600 resize-none"
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        required={field.required}
        value={fieldValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">Select {field.label.toLowerCase()}</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 py-1">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={field.key}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-3.5 w-3.5 border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 py-1">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
        />
        <span>{field.description || field.label}</span>
      </label>
    );
  }

  if (field.type === "document") {
    return (
      <input
        type="file"
        aria-label={field.label}
        required={field.required}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="flex w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
      />
    );
  }

  const type =
    field.type === "email"
      ? "email"
      : field.type === "phone"
        ? "tel"
        : field.type === "date"
          ? "date"
          : "text";

  return (
    <input
      type={type}
      inputMode={field.type === "number" ? "decimal" : undefined}
      required={field.required}
      value={fieldValue(value)}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

export function TemplateFields({
  template,
  values,
  systemKeys,
  scope = "BOTH",
  onChange,
  renderSystemField,
}: TemplateFieldsProps) {
  const fields = template.fields.filter(
    (field) =>
      field.visible &&
      (!systemKeys.includes(field.key) ||
        Object.prototype.hasOwnProperty.call(values, field.key) ||
        Boolean(renderSystemField)) &&
      (scope === "BOTH" || field.scope === "BOTH" || field.scope === scope),
  );

  const sections: TenantTemplate["sections"] = template.sections.length
    ? template.sections
    : [...new Set(fields.map((field) => field.section || "additional"))].map((key, index) => ({
        key,
        label: key.replaceAll("_", " "),
        order: index + 1,
      }));

  return (
    <div className="space-y-4">
      {sections
        .sort((left, right) => left.order - right.order)
        .map((section) => {
          const sectionFields = fields.filter(
            (field) => (field.section || "additional") === section.key,
          );
          if (!sectionFields.length) return null;

          return (
            <div key={section.key} className="space-y-2.5 pt-1">
              <div className="border-b border-slate-100 pb-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {section.label}
                </h4>
                {section.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{section.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sectionFields
                  .sort((left, right) => left.order - right.order)
                  .map((field) => {
                    const systemControl = systemKeys.includes(field.key)
                      ? renderSystemField?.(field)
                      : null;
                    const isWide = field.type === "textarea" || field.type === "document";
                    return (
                      <div
                        key={field.key}
                        className={isWide ? "sm:col-span-2 space-y-1" : "space-y-1"}
                      >
                        <Label className="text-xs font-semibold text-slate-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                        {systemControl ?? (
                          <TemplateInput
                            field={field}
                            value={values[field.key]}
                            onChange={(val) => onChange(field.key, val)}
                          />
                        )}
                        {field.description && field.type !== "checkbox" && (
                          <p className="text-[10px] text-slate-400">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
