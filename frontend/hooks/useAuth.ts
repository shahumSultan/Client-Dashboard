"use client";
import { useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import api, { setAuthToken } from "@/lib/api";
import type { User } from "@/lib/types";

export function useAuthToken() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    getToken().then((token) => setAuthToken(token));
  }, [isLoaded, isSignedIn, getToken]);

  return { isLoaded, isSignedIn };
}

export function useCurrentUser() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  return useQuery<User>({
    queryKey: ["currentUser"],
    enabled: isLoaded && !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      setAuthToken(token);
      const { data } = await api.get("/users/me");
      return data;
    },
  });
}
