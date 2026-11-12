import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: AuthResetPasswordRedirect,
});

function AuthResetPasswordRedirect() {
  const nav = useNavigate();
  const search = useSearch({ from: "/auth/reset-password" });

  useEffect(() => {
    const token = search.token || "";
    nav({
      to: "/reset-password",
      search: { token },
      replace: true,
    });
  }, [search.token, nav]);

  return null;
}
