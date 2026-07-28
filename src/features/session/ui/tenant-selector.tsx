import { useState, type FormEvent } from "react";
import { selectSessionTenant } from "../api/session.api";
import { useSession } from "../model/session-provider";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Spinner } from "../../../shared/ui/spinner";

export function TenantSelector() {
  const { session, refreshSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await selectSessionTenant({});
      await refreshSession();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Tenant selection failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tenant-input">Institution</Label>
        <Input
          id="tenant-input"
          value={
            session?.tenant?.displayName ??
            session?.tenant?.tenantCode ??
            "Assigned institution"
          }
          readOnly
          className="bg-slate-50"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? (
          <>
            <Spinner className="h-4 w-4" />
            Selecting…
          </>
        ) : (
          "Select tenant"
        )}
      </Button>
    </form>
  );
}
