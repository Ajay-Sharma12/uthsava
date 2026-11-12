import { useEffect } from "react";
import { quickActions } from "@/lib/quick-actions";

export function useQuickAction(event: string, fn: () => void) {
  useEffect(() => {
    const off = quickActions.on(event, fn);
    return () => {
      off?.();
    };
  }, [event, fn]);
}
