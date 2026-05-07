import { load, type Store } from "@tauri-apps/plugin-store";
import { createJSONStorage, type StateStorage } from "zustand/middleware";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("settings.json");
  }
  return storePromise;
}

const tauriStorage: StateStorage = {
  async getItem(name) {
    const store = await getStore();
    const value = await store.get<string>(name);
    return value ?? null;
  },
  async setItem(name, value) {
    const store = await getStore();
    await store.set(name, value);
    await store.save();
  },
  async removeItem(name) {
    const store = await getStore();
    await store.delete(name);
    await store.save();
  },
};

export const tauriJSONStorage = createJSONStorage(() => tauriStorage);
