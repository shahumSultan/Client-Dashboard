"use client";
import { useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import api, { setTokenGetter } from "@/lib/api";
import type { User } from "@/lib/types";

export function useAuthToken() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setTokenGetter(null);
      return;
    }
    // Hand the getter itself to the axios interceptor rather than a single
    // token value — tokens expire in ~60s and would otherwise go stale.
    setTokenGetter(() => getToken());
  }, [isLoaded, isSignedIn, getToken]);

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
