import { ArrowLeft, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../../shared/auth/password-recovery";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(email);
      navigate(`/reset-password?username=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to request password reset");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Mail size={18} />
        </span>
        <CardTitle>Reset your password</CardTitle>
        <p className="text-sm text-slate-500">
          Enter your login email. Cognito will send a verification code.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@institution.com"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={busy}>
            {busy ? "Sending code..." : "Send verification code"}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              <ArrowLeft size={15} />
              Back to login
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
