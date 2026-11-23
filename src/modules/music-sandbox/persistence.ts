import { isSandboxProject } from "./interpreter";
import type { SandboxProject } from "./types";

export const SANDBOX_STORAGE_KEY = "arpeggio-music-sandbox-v1";

export function readSavedProjects(storage?: Pick<Storage, "getItem">): SandboxProject[] {
  try {
    const store = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
    const raw = store?.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSandboxProject) : [];
  } catch {
    return [];
  }
}

export function writeSavedProjects(projects: readonly SandboxProject[], storage?: Pick<Storage, "setItem">): boolean {
  try {
    const store = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);
    if (!store) return false;
    store.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}
