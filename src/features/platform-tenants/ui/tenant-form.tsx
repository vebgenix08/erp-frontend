import { useState, type FormEvent } from "react";
import type { TenantUpdateInput } from "../model/tenant.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Spinner } from "../../../shared/ui/spinner";
import { Separator } from "../../../shared/ui/separator";

interface TenantFormProps {
  initialValue?: Partial<TenantUpdateInput>;
  submitLabel: string;
  onSubmit: (value: TenantUpdateInput) => Promise<void> | void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TenantForm({ initialValue, submitLabel, onSubmit }: TenantFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [contactEmail, setContactEmail] = useState(initialValue?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initialValue?.contactPhone ?? "");
  const [address, setAddress] = useState(initialValue?.address ?? "");
  const [academicYearStartMonth, setAcademicYearStartMonth] = useState(
    initialValue?.academicYearStartMonth?.toString() ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: TenantUpdateInput = { name: name.trim() };
      const nextEmail = contactEmail.trim();
      if (nextEmail) payload.contactEmail = nextEmail;
      const nextPhone = contactPhone.trim();
      if (nextPhone) payload.contactPhone = nextPhone;
      const nextAddress = address.trim();
      if (nextAddress) payload.address = nextAddress;
      if (academicYearStartMonth) payload.academicYearStartMonth = Number(academicYearStartMonth);
      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tenant-name">Name</Label>
          <Input id="tenant-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-email">Contact email</Label>
          <Input
            id="tenant-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-phone">Contact phone</Label>
          <Input
            id="tenant-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tenant-address">Address</Label>
          <textarea
            id="tenant-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-start-month">Academic year start month</Label>
          <select
            id="tenant-start-month"
            value={academicYearStartMonth}
            onChange={(e) => setAcademicYearStartMonth(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <Separator />
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Spinner className="h-4 w-4" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
