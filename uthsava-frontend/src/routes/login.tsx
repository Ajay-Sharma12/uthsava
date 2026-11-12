import { login, logout, forgotPassword } from "@/lib/services/auth";
import { getStoredUser, isAuthenticated, saveSession, type AuthSession } from "@/lib/session";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Film,
  Tv,
  AlertCircle,
  Mail,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Send,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Uthsava Admin" },
      { name: "description", content: "Secure sign-in for Uthsava Entertainment Admin Portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [viewMode, setViewMode] = useState<"login" | "forgot">("login");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

function encodeSecret(val: string): string {
  try {
    return btoa(encodeURIComponent(val));
  } catch {
    return val;
  }
}

function decodeSecret(val: string): string {
  try {
    return decodeURIComponent(atob(val));
  } catch {
    return val;
  }
}

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    setCurrentUser(getStoredUser());

    // Retrieve remembered email and password from localStorage if available
    try {
      const isRemembered = localStorage.getItem("uthsava_remember_me") === "true";
      const savedEmail = localStorage.getItem("uthsava_remember_email");
      const savedPassword = localStorage.getItem("uthsava_remember_password");

      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedPassword) {
        setPassword(decodeSecret(savedPassword));
      }
      if (isRemembered || savedEmail || savedPassword) {
        setRememberMe(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setCurrentUser(null);
    toast.success("Signed out");
  };

  function getSession(response: unknown): AuthSession {
    const data = response as Record<string, unknown> | null;
    const candidate = (data?.results ?? data?.data ?? data) as Record<string, unknown> | null;

    if (!candidate || typeof candidate.token !== "string" || !candidate.token) {
      throw new Error("The login response did not include an access token.");
    }

    return candidate as AuthSession;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");
    setGeneralError("");
    setLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
        rememberMe,
        deviceId: "dev_web",
        deviceType: "WEB",
        deviceToken: "token_web",
      });

      const session = getSession(response);

      // Handle Remember Me persistence for both email and password
      if (rememberMe) {
        try {
          localStorage.setItem("uthsava_remember_me", "true");
          localStorage.setItem("uthsava_remember_email", email.trim());
          localStorage.setItem("uthsava_remember_password", encodeSecret(password));
        } catch {}
      } else {
        try {
          localStorage.removeItem("uthsava_remember_me");
          localStorage.removeItem("uthsava_remember_email");
          localStorage.removeItem("uthsava_remember_password");
        } catch {}
      }

      saveSession(session, rememberMe);

      toast.success("Login successful");
      setLoggedIn(true);
      setCurrentUser(session);

      // Full navigation to reload dashboard context
      window.location.replace("/");
    } catch (error: any) {
      console.error("Login submission error:", error);

      const errData = error?.data;
      const errErrors = errData?.errors;
      const errMsg =
        errData?.message ||
        error?.message ||
        "Login failed. Please check your credentials.";

      if (
        errErrors?.email ||
        /email not found|email does not exist|user not found|account not found/i.test(errMsg)
      ) {
        setEmailError(errErrors?.email || "Email does not exist");
      } else if (
        errErrors?.password ||
        /incorrect password|invalid password|current password is not correct|wrong password|invalid credentials/i.test(
          errMsg,
        )
      ) {
        setPasswordError(errErrors?.password || "Incorrect password");
      } else {
        setGeneralError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setForgotEmailError("");
    const targetEmail = forgotEmail.trim();

    if (!targetEmail) {
      setForgotEmailError("Email address is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setForgotEmailError("Please enter a valid email address");
      return;
    }

    setForgotLoading(true);

    try {
      await forgotPassword(targetEmail);
      setForgotSuccess(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      console.error("Forgot password error:", error);
      const errMsg =
        error?.data?.message ||
        error?.message ||
        "Failed to send reset link. Please try again.";

      if (/not found|does not exist/i.test(errMsg)) {
        setForgotEmailError("No account found with this email address");
      } else {
        setForgotEmailError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setForgotLoading(false);
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
              SSL secured · 2FA enabled
            </div>
            <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Manage the future of <span className="text-gradient-primary">Indian Cinema.</span>
            </h2>
            <p className="text-base text-muted-foreground">
              Direct and supervise the complete streaming ecosystem — catalog, producer
              settlements, content approvals, subscriptions, and access controls.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { k: "12.4M", v: "Monthly Viewers" },
                { k: "₹4.2 Cr", v: "Producer Payouts" },
                { k: "180+", v: "Originals Live" },
              ].map((s) => (
                <div key={s.v} className="glass rounded-2xl p-4">
                  <div className="font-display text-2xl font-bold text-gradient-primary">{s.k}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
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

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        {viewMode === "forgot" ? (
          <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10">
            <button
              type="button"
              onClick={() => {
                setViewMode("login");
                setForgotSuccess(false);
                setForgotEmailError("");
              }}
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign in
            </button>

            {forgotSuccess ? (
              <div className="space-y-4 py-2 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to{" "}
                    <span className="font-medium text-foreground">{forgotEmail}</span>.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left text-xs leading-relaxed text-muted-foreground">
                  Click the link in the email to open the reset password screen and set your new credentials.
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleForgotPasswordSubmit}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? "Resending…" : "Resend Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("login");
                      setForgotSuccess(false);
                      setForgotEmailError("");
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-xs font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 cursor-pointer"
                  >
                    Return to Sign in
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="mb-6">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">Forgot password?</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your registered email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block">
                      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email address
                      </div>
                      <div
                        className={`flex items-center gap-2 rounded-xl border bg-background/40 px-3.5 py-3 transition focus-within:ring-2 ${
                          forgotEmailError
                            ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                            : "border-border focus-within:border-primary/60 focus-within:ring-ring"
                        }`}
                      >
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          autoFocus
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            if (forgotEmailError) setForgotEmailError("");
                          }}
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                          placeholder="admin@uthsava.com"
                        />
                      </div>
                    </label>
                    {forgotEmailError && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {forgotEmailError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-sm font-semibold tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-70 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
                        Sending link…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("login");
                        setForgotEmailError("");
                      }}
                      className="text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      Remember your password? <span className="font-semibold text-primary">Sign in</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="glass w-full max-w-md rounded-3xl p-8 sm:p-10"
          >
            <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.52_0.23_22)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-display text-lg font-bold">Uthsava Admin</span>
              </div>

              {loggedIn && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Signed in</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-primary hover:underline"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <div className="mb-8">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Admin Portal
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                {loggedIn
                  ? `Welcome back${currentUser?.email ? `, ${currentUser.email}` : ""}`
                  : "Welcome back."}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {loggedIn
                  ? "You're currently signed in. You can navigate to dashboard or sign out."
                  : "Sign in to manage your OTT platform and content."}
              </p>
            </div>

            {generalError && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email address
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-background/40 px-3.5 py-3 transition focus-within:ring-2 ${
                      emailError
                        ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                        : "border-border focus-within:border-primary/60 focus-within:ring-ring"
                    }`}
                  >
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                        if (generalError) setGeneralError("");
                      }}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      placeholder="admin@uthsava.com"
                    />
                  </div>
                </label>
                {emailError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label className="block">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Password
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-background/40 px-3.5 py-3 transition focus-within:ring-2 ${
                      passwordError
                        ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                        : "border-border focus-within:border-primary/60 focus-within:ring-ring"
                    }`}
                  >
                    <input
                      id="login-password"
                      type={show ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                        if (generalError) setGeneralError("");
                      }}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                {passwordError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setRememberMe(checked);
                      if (!checked) {
                        try {
                          localStorage.removeItem("uthsava_remember_me");
                          localStorage.removeItem("uthsava_remember_email");
                          localStorage.removeItem("uthsava_remember_password");
                        } catch {}
                      }
                    }}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email.trim() || "");
                    setForgotEmailError("");
                    setForgotSuccess(false);
                    setViewMode("forgot");
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.52_0.23_22)] text-sm font-semibold tracking-wide text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
                    Signing in…
                  </>
                ) : (
                  "Sign in to Portal"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
