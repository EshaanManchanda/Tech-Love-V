import { create } from "zustand";

interface PortalUiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

/** Cross-component UI state for the portal shell (mobile sidebar drawer). */
export const usePortalUiStore = create<PortalUiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
