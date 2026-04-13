import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage } from 'zustand/middleware';

export const mmkv = createMMKV({ id: 'sazda' });

export const zustandStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));
