import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, validateNewPassword } from "../../shared/auth/password-recovery";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";

export function ResetPasswordPage() {
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState(query.get("username") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const passwordError = validateNewPassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirmation) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset({ username, code, password });
      navigate("/login?passwordReset=success", { replace: true });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to reset password");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <KeyRound size={18} />
        </span>
        <CardTitle>Set a new password</CardTitle>
        <p className="text-sm text-slate-500">Use the verification code sent to your email.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-3.5" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              required
              type="email"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-code">Verification code</Label>
            <Input
              id="reset-code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirmation">Confirm password</Label>
            <Input
              id="reset-confirmation"
              required
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            At least 12 characters with uppercase, lowercase, number and special character.
          </p>
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={busy}>
            {busy ? "Updating password..." : "Update password"}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/forgot-password">Request another code</Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
