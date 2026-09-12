import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { applicationKeys, userPreferencesKeys } from "../lib/api";
import { authKeys } from "../lib/queries";

export function AuthFailureHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      queryClient.removeQueries({ queryKey: authKeys.csrf });
      queryClient.removeQueries({ queryKey: applicationKeys.all });
      queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
    };
    window.addEventListener("xeniway:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("xeniway:auth-expired", handleAuthExpired);
  }, [queryClient]);
  return null;
}
