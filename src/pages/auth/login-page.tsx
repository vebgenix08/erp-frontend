import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, EyeOff, GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { getSessionDashboardPath } from "../../features/session/api/session.api";
import { useSession } from "../../features/session/model/session-provider";
import {
  CognitoAuthError,
  completeNewPassword,
  signIn,
  validateNewPassword,
} from "../../shared/auth/cognito-client";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../shared/ui/form";
import { cn } from "../../shared/ui/utils";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const newPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one number"),
});
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { session, status, error, establishSession } = useSession();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<{ session: string; username: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const newPasswordForm = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  const newPassword = newPasswordForm.watch("newPassword");
  const passwordRules = validateNewPassword(newPassword);

  useEffect(() => {
    if (status === "authenticated") {
      navigate(getSessionDashboardPath(session), { replace: true });
    }
  }, [navigate, session, status]);

  async function handleLogin(values: LoginForm) {
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await signIn(values.email, values.password);
      if (result.type === "new-password-required") setChallenge(result);
      else await establishSession(result.idToken);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(values: NewPasswordForm) {
    if (!challenge) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const idToken = await completeNewPassword({ ...challenge, newPassword: values.newPassword });
      await establishSession(idToken);
    } catch (err) {
      if (
        err instanceof CognitoAuthError &&
        /invalid session|session.*used once/i.test(err.message)
      ) {
        setChallenge(null);
        loginForm.reset();
        newPasswordForm.reset();
        setFormError(
          "That one-time setup session has expired. Sign in again using your current or temporary password.",
        );
      } else {
        setFormError(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-slate-50">
      <section
        className="relative hidden min-h-screen overflow-hidden lg:flex lg:w-[56%] lg:flex-col lg:justify-end"
        aria-label="Vebgenix education platform"
      >
        <img
          src="/images/campus.jpg"
          alt="Students walking through an educational campus"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-accent-600">
              <GraduationCap size={24} />
            </span>
            <div>
              <strong className="block text-xl">Vebgenix ERP</strong>
              <span className="text-sm font-medium text-slate-300">
                Education operations platform
              </span>
            </div>
          </div>

          <div className="max-w-2xl pb-4 text-white">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-200">
              One institution. One operating system.
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight xl:text-5xl">
              Run every campus with clarity and control.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200">
              Secure access to admissions, academics, students, finance, staff, and institutional
              administration.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/25 pt-6 text-sm font-semibold text-slate-100">
              <span className="flex items-center gap-2">
                <Building2 size={18} /> Multi-campus operations
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={18} /> Role and scope protection
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-[460px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-accent-600 text-white">
              <GraduationCap size={22} />
            </span>
            <div>
              <span className="block text-xl font-bold text-slate-900">Vebgenix ERP</span>
              <span className="text-sm text-slate-500">Education operations platform</span>
            </div>
          </div>

          <div className="border-t-4 border-accent-600 bg-white pt-8">
            <header className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-accent-700">
                Secure sign in
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {challenge ? "Secure your account" : "Welcome back"}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-slate-500">
                {challenge
                  ? "Create a permanent password to continue."
                  : "Enter your institution account details to continue to your workspace."}
              </p>
            </header>

            {/* Login form */}
            {!challenge ? (
              <Form {...loginForm}>
                <form
                  onSubmit={(e) => void loginForm.handleSubmit(handleLogin)(e)}
                  className="space-y-6"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="name@institution.com"
                            autoComplete="username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              className="pr-11"
                              {...field}
                            />
                            <button
                              type="button"
                              title={showPassword ? "Hide password" : "Show password"}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Link
                      className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                      to="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {(formError || error) && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {formError || error}
                    </div>
                  )}

                  <Button type="submit" className="h-11 w-full text-base" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              /* New password form */
              <Form {...newPasswordForm}>
                <form
                  onSubmit={(e) => void newPasswordForm.handleSubmit(handleNewPassword)(e)}
                  className="space-y-6"
                >
                  <FormField
                    control={newPasswordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <p className="text-xs text-slate-500 mt-1">
                          12+ characters with uppercase, lowercase, and a number.
                        </p>
                        {newPassword && passwordRules.length > 0 && (
                          <p className="text-xs text-red-600 font-medium">
                            {passwordRules.join(" · ")}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password strength indicators */}
                  {newPassword && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "12+ characters", ok: newPassword.length >= 12 },
                        { label: "Uppercase", ok: /[A-Z]/.test(newPassword) },
                        { label: "Lowercase", ok: /[a-z]/.test(newPassword) },
                        { label: "Number", ok: /[0-9]/.test(newPassword) },
                      ].map(({ label, ok }) => (
                        <div
                          key={label}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                            ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                          )}
                        >
                          <span>{ok ? "✓" : "○"}</span>
                          {label}
                        </div>
                      ))}
                    </div>
                  )}

                  {(formError || error) && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {formError || error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full text-base"
                    disabled={submitting || passwordRules.length > 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Setting password...
                      </>
                    ) : (
                      "Set password"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </div>

          <p className="mt-8 text-sm text-slate-500">
            © {new Date().getFullYear()} Vebgenix. Authorized institutional access only.
          </p>
        </div>
      </section>
    </main>
  );
}
