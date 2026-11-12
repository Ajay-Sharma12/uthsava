import { apiPost } from "../api";
import { clearSession } from "../session";

export function login(payload: Record<string, unknown>) {
  return apiPost("/admin/auth/login", payload, { withAuth: false });
}

export function forgotPassword(email: string) {
  return apiPost(
    "/admin/auth/forgot-password",
    {
      email: email.trim(),
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
      adminUrl: typeof window !== "undefined" ? window.location.origin : undefined,
    },
    { withAuth: false },
  );
}

export function verifyResetToken(token: string) {
  return apiPost(
    "/admin/auth/verify-reset-token",
    { token },
    { withAuth: false },
  );
}

export function resetPassword(payload: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiPost("/admin/auth/reset-password", payload, { withAuth: false });
}

// Client-side logout: notify backend to record audit log, clear credentials, and redirect
export async function logout() {
  try {
    await apiPost("/admin/auth/logout", {}, { withAuth: true });
  } catch (err) {
    console.error("Backend logout error:", err);
  } finally {
    clearSession({ manual: true });
    window.location.href = "/login";
  }
}
