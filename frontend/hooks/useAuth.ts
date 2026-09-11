"use client";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import api, { setTokenGetter } from "@/lib/api";
import type { User } from "@/lib/types";

export function useAuthToken() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  // Registered during render, not in an effect. Effects run after the first
  // paint, and the /users/me query fires in that same commit - so on a cold
  // load the first request went out with no Authorization header and 401'd,
  // relying on a retry to recover. The assignment is idempotent.
  if (isLoaded) {
    // Hand the getter itself to the axios interceptor rather than a single
    // token value - tokens expire in ~60s and would otherwise go stale.
    setTokenGetter(isSignedIn ? () => getToken() : null);
  }

  return { isLoaded, isSignedIn };
}

export function useCurrentUser() {
  // Register the token getter here too, so this hook is usable on its own.
  const { isLoaded, isSignedIn } = useAuthToken();

  return useQuery<User>({
    queryKey: ["currentUser"],
    enabled: isLoaded && !!isSignedIn,
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      return data;
    },
  });
}
