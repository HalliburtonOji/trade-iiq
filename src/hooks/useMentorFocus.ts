import { create } from "zustand";

type Tab = "now" | "next" | "past" | "journal";

type FocusState = {
  tab: Tab | null;
  itemId: string | null;
  stamp: number;
  focus: (tab: Tab, itemId?: string | null) => void;
  clear: () => void;
};

export const useMentorFocus = create<FocusState>((set) => ({
  tab: null,
  itemId: null,
  stamp: 0,
  focus: (tab, itemId = null) => set({ tab, itemId, stamp: Date.now() }),
  clear: () => set({ tab: null, itemId: null }),
}));
