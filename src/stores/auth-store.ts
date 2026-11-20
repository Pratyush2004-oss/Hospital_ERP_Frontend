"use client";

import { create } from "zustand";
import { getCurrentUser, login, logout } from "@/lib/auth/auth-service";
import type { AuthSession } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  session: AuthSession | null;
  status: AuthStatus;
  initialized: boolean;
  initialize: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const EMPTY_PERMISSIONS: string[] = [];

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  status: "loading",
  initialized: false,
  initialize: async () => {
    if (get().initialized) return;
    set({ status: "loading" });
    try {
      const session = await getCurrentUser();
      set({ session, status: "authenticated", initialized: true });
    } catch {
      set({ session: null, status: "unauthenticated", initialized: true });
    }
  },
  refreshSession: async () => {
    try {
      const session = await getCurrentUser();
      set({ session, status: "authenticated", initialized: true });
    } catch {
      set({ session: null, status: "unauthenticated", initialized: true });
    }
  },
  signIn: async (identifier, password) => {
    const session = await login({ identifier, password });
    set({ session, status: "authenticated", initialized: true });
  },
  signOut: async () => {
    try {
      await logout();
    } finally {
      set({ session: null, status: "unauthenticated", initialized: true });
    }
  },
}));
