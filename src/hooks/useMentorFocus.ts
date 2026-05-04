import { useSyncExternalStore } from "react";

type Tab = "now" | "next" | "past" | "journal";

type State = { tab: Tab | null; itemId: string | null; stamp: number };

let state: State = { tab: null, itemId: null, stamp: 0 };
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

export function focusMentor(tab: Tab, itemId: string | null = null) {
  state = { tab, itemId, stamp: Date.now() };
  emit();
}
export function clearMentorFocus() {
  state = { tab: null, itemId: null, stamp: 0 };
  emit();
}

type Selected<T> = (s: State) => T;

export function useMentorFocus<T = State>(selector?: Selected<T>): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (selector ? selector(snap) : (snap as unknown as T));
}
