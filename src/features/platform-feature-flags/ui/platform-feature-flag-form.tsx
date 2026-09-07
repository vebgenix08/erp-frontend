import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";

interface FeatureFlagFormProps {
  busy: boolean;
  onSubmit: (input: {
    code: string;
    name: string;
    description?: string;
    isEnabled: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PlatformFeatureFlagForm({ busy, onSubmit, onCancel }: FeatureFlagFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return void onSubmit({
      code: code.trim(),
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      isEnabled,
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1.5">
        <Label htmlFor="flag-code">Feature code</Label>
        <Input
          id="flag-code"
          required
          placeholder="finance.onlinePayments"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="flag-name">Feature name</Label>
        <Input
          id="flag-name"
          required
          placeholder="Online payments"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="flag-desc">Description</Label>
        <textarea
          id="flag-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
        />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-600"
        />
        <span className="text-sm text-slate-700">Globally available for tenant grants</span>
      </label>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Creating…
            </>
          ) : (
            "Create feature"
          )}
        </Button>
      </div>
    </form>
  );
}
