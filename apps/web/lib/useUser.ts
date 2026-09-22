"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export interface CurrentUser {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
}

export function useUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<CurrentUser>("/api/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}
