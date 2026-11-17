// Things the app remembers in THIS browser only (localStorage). Nothing is sent anywhere.
import { useSyncExternalStore } from "react";

const TAX_KEY = "taxease.taxInput";
const ACTIVITY_KEY = "taxease.activity";
const EMPTY_TAX_INPUT = { values: {}, sources: [] };
const EMPTY_LIST = [];

const listeners = new Set();
const cache = new Map();

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Returns the same object until the stored text changes, which React requires.
function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  let raw = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value = fallback;
  try {
    value = raw ? JSON.parse(raw) : fallback;
  } catch {
    /* damaged data: start fresh */
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return; // storage can be blocked; the app still works without it
  }
  listeners.forEach((listener) => listener());
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

function useStored(key, fallback) {
  return useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback
  );
}

// ---- the numbers for the tax calculator ----
export const useTaxInput = () => useStored(TAX_KEY, EMPTY_TAX_INPUT);

export function saveTaxInput(newValues, source) {
  const current = read(TAX_KEY, EMPTY_TAX_INPUT);
  const sources = source && !current.sources.includes(source) ? [...current.sources, source] : current.sources;
  write(TAX_KEY, { values: { ...current.values, ...newValues }, sources });
}

export const clearTaxInput = () => remove(TAX_KEY);

// ---- the "recent activity" list on the dashboard ----
export const useActivity = () => useStored(ACTIVITY_KEY, EMPTY_LIST);

export function addActivity(text) {
  const list = [{ text, at: new Date().toISOString() }, ...read(ACTIVITY_KEY, EMPTY_LIST)].slice(0, 8);
  write(ACTIVITY_KEY, list);
}

export const clearActivity = () => remove(ACTIVITY_KEY);
