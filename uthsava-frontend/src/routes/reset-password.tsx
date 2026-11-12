import { verifyResetToken, resetPassword } from "@/lib/services/auth";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Film,
  Tv,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Uthsava Admin" },
      { name: "description", content: "Set a new password for your Uthsava Admin account." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/reset-password" });

  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<"verifying" | "valid" | "invalid" | "success">("verifying");
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Extract token from route search or browser URL query string
  useEffect(() => {
    let extractedToken = search.token || "";
    if (!extractedToken && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      extractedToken = urlParams.get("token") || "";
    }

    setToken(extractedToken);

    if (!extractedToken) {
      setTokenStatus("invalid");
      setTokenError("No reset token provided in the link.");
      return;
    }

    // Verify token with backend
    setTokenStatus("verifying");
    verifyResetToken(extractedToken)
      .then(() => {
        setTokenStatus("valid");
      })
      .catch((err: any) => {
        console.error("Token verification failed:", err);
        setTokenStatus("invalid");
        const msg =
          err?.data?.message ||
          err?.message ||
          "This password reset link is invalid or has expired.";
        setTokenError(msg);
      });
  }, [search.token]);

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
  const isPasswordStrong =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setNewPasswordError("");
    setConfirmPasswordError("");
    setGeneralError("");

    if (!newPassword) {
      setNewPasswordError("New password is required");
      return;
    }

    if (!isPasswordStrong) {
      setNewPasswordError(
        "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&)",
      );
      return;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      setTokenStatus("success");
      toast.success("Password reset successfully");
    } catch (err: any) {
      console.error("Reset password failed:", err);
      const errMsg =
        err?.data?.message ||
        err?.message ||
        "Failed to reset password. The link might have expired.";

      if (/token/i.test(errMsg)) {
        setTokenStatus("invalid");
        setTokenError(errMsg);
      } else if (/match/i.test(errMsg)) {
        setConfirmPasswordError("Passwords do not match");
      } else {
        setGeneralError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
      {/* Cinematic branding side */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-[#0f172a] via-[#172030] to-[#0b1220] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/95" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_30%_20%,oklch(0.62_0.24_305_/_0.45),transparent_60%)]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.52_0.23_22)] shadow-[var(--shadow-glow)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-xl font-bold tracking-tight">Uthsava</div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Admin & Operations
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Secure Token Verification · Encrypted Auth
            </div>
            <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Secure Account <span className="text-gradient-primary">Access Recovery.</span>
            </h2>
            <p className="text-base text-muted-foreground">
              Create a new secure password to restore full administrative access to catalog,
              analytics, and streaming platform management.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Film className="h-4 w-4" />
            <span>Uthsava Entertainment Platform</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <Tv className="h-4 w-4" /> 4K HDR · Dolby Atmos
            </span>
          </div>
        </div>
      </div>

      {/* Form / Status Side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        {tokenStatus === "verifying" && (
          <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <RefreshCw className="h-7 w-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold">Verifying reset link…</h2>
              <p className="text-xs text-muted-foreground">
                Validating your security token with Uthsava Auth Service.
              </p>
            </div>
          </div>
        )}

        {tokenStatus === "invalid" && (
          <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10 text-center space-y-5">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <XCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-bold tracking-tight">Invalid or Expired Link</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tokenError || "This password reset link is invalid or has already expired."}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed text-left">
              For security, password reset links expire after 1 hour or after being used. Please return to the login screen and request a new password reset link.
            </div>
            <button
              type="button"
              onClick={() => nav({ to: "/login" })}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-sm font-semibold tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {tokenStatus === "success" && (
          <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10 text-center space-y-5">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-bold tracking-tight">Password Reset Complete</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been successfully updated. You can now log in to the portal using your new credentials.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-600 dark:text-emerald-400 text-left leading-relaxed">
              All previous sessions and devices have been logged out for your security.
            </div>
            <button
              type="button"
              onClick={() => nav({ to: "/login" })}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-sm font-semibold tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 cursor-pointer"
            >
              Sign In to Portal <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {tokenStatus === "valid" && (
          <form
            onSubmit={handleSubmit}
            className="glass w-full max-w-md rounded-3xl p-8 sm:p-10"
          >
            <div className="mb-6">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Set New Password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your new password below to regain access to your account.
              </p>
            </div>

            {generalError && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    New Password
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-background/40 px-3.5 py-3 transition focus-within:ring-2 ${
                      newPasswordError
                        ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                        : "border-border focus-within:border-primary/60 focus-within:ring-ring"
                    }`}
                  >
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      autoFocus
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (newPasswordError) setNewPasswordError("");
                        if (generalError) setGeneralError("");
                      }}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                {newPasswordError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {newPasswordError}
                  </p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-background/40 px-3.5 py-3 transition focus-within:ring-2 ${
                      confirmPasswordError
                        ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                        : "border-border focus-within:border-primary/60 focus-within:ring-ring"
                    }`}
                  >
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError("");
                        if (generalError) setGeneralError("");
                      }}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                {confirmPasswordError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {/* Password Requirement Indicators */}
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Password Requirements:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasMinLength ? "text-emerald-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasUppercase ? "text-emerald-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    1 uppercase letter
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasLowercase ? "text-emerald-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    1 lowercase letter
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    1 number
                  </div>
                  <div
                    className={`col-span-2 flex items-center gap-1.5 ${
                      hasSpecialChar ? "text-emerald-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    1 special symbol (@$!%*?&)
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-sm font-semibold tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
                    Updating Password…
                  </>
                ) : (
                  "Save New Password"
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => nav({ to: "/login" })}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  Back to <span className="font-semibold text-primary">Sign in</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
