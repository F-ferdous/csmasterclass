"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
import { normalizeProfile } from "@/lib/normalize";
import type { UserProfile } from "@/lib/types";
import { isAdminEmail } from "@/lib/admins";
import { ensureProfile } from "@/lib/auth";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  /** True until we know whether someone is signed in (and have their profile). */
  loading: boolean;
  isAdmin: boolean;
  configured: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: false,
  isAdmin: false,
  configured: false,
});

export const useAuth = () => useContext(AuthContext);

/** Tracks the signed-in Firebase user and their live users/{uid} profile. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: isFirebaseConfigured,
    isAdmin: false,
    configured: isFirebaseConfigured,
  });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let stopProfile: (() => void) | undefined;

    const stopAuth = onAuthStateChanged(auth(), (user) => {
      stopProfile?.();
      stopProfile = undefined;
      if (!user) {
        setState((s) => ({ ...s, user: null, profile: null, loading: false, isAdmin: false }));
        return;
      }
      setState((s) => ({ ...s, user, loading: true }));
      stopProfile = onSnapshot(
        doc(db(), "users", user.uid),
        (snap) => {
          // Admin accounts created in the Firebase console get a profile on first sign-in.
          if (!snap.exists() && isAdminEmail(user.email)) ensureProfile(user).catch(() => {});
          const profile = snap.exists() ? normalizeProfile(user.uid, snap.data()) : null;
          const isAdmin = profile?.role === "admin" || isAdminEmail(user.email);
          setState((s) => ({ ...s, user, profile, loading: false, isAdmin }));
        },
        () => setState((s) => ({ ...s, user, profile: null, loading: false, isAdmin: isAdminEmail(user.email) })),
      );
    });

    return () => {
      stopAuth();
      stopProfile?.();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
