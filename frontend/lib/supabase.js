import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REMEMBER_KEY = "taxease.remember";

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);
export const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true";

// "Remember me" on: the session survives closing the browser (localStorage).
// Off: it ends when the tab is closed (sessionStorage).
const storage = {
  getItem: (key) => window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
  setItem: (key, value) => {
    const keep = window.localStorage.getItem(REMEMBER_KEY) !== "0";
    (keep ? window.sessionStorage : window.localStorage).removeItem(key);
    (keep ? window.localStorage : window.sessionStorage).setItem(key, value);
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const setRemember = (remember) => window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");

let client = null;

// Only the public "anon" key is used here. Row Level Security in the database decides what it may do.
export function getSupabase() {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  client ??= createClient(URL, ANON_KEY, { auth: { flowType: "pkce", storage } });
  return client;
}
