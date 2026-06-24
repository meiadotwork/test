import { create } from "zustand";

import * as db from "@/lib/db";
import type { Mode, Track } from "@/models/track";

interface AppState {
  tracks: Track[];
  loading: boolean;
  /** Last mode the user picked, reused as the default on the create screen. */
  lastMode: Mode;

  loadTracks: () => Promise<void>;
  upsertTrack: (track: Track) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  setLastMode: (mode: Mode) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tracks: [],
  loading: false,
  lastMode: "run",

  loadTracks: async () => {
    set({ loading: true });
    const tracks = await db.getTracks();
    set({ tracks, loading: false });
  },

  upsertTrack: async (track) => {
    await db.saveTrack(track);
    await get().loadTracks();
  },

  removeTrack: async (id) => {
    await db.deleteTrack(id);
    set({ tracks: get().tracks.filter((t) => t.id !== id) });
  },

  setLastMode: (mode) => set({ lastMode: mode }),
}));
