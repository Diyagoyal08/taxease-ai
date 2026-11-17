"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setAuthBridge } from "@/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { clearActivity, clearTaxInput } from "@/lib/store";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: isSupabaseConfigured, session: null });

  // Why the person is being signed out: "deliberate" (they clicked Log out) or "expired" (the backend refused their token).
  const signOutReason = useRef(null);

  const signOut = useCallback(async (scope = "local") => {
    signOutReason.current = "deliberate";
    await getSupabase()?.auth.signOut({ scope });
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return undefined;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Do not leave one person's saved numbers behind for the next person on this browser.
      if (event === "SIGNED_OUT") {
        clearTaxInput();
        clearActivity();
      } else if (event === "SIGNED_IN") {
        signOutReason.current = null;
      }
      setState({ loading: false, session });
    });

    setAuthBridge({
      getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
      // RequireAuth sends the person to the login page once the session is gone.
      onExpired: async () => {
        signOutReason.current = "expired";
        await supabase.auth.signOut({ scope: "local" });
      },
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const user = state.session?.user ?? null;
    return {
      configured: isSupabaseConfigured,
      loading: state.loading,
      session: state.session,
      user,
      role: user?.app_metadata?.role ?? "user",
      signOut,
      signOutReason: () => signOutReason.current,
    };
  }, [state, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
