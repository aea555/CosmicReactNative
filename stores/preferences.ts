import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MIN_DEBOUNCE_MS = 500;
const MAX_DEBOUNCE_MS = 3000;
const DEBOUNCE_STEP_MS = 500;

const normalizeDebounce = (value: number): number => {
    const bounded = Math.min(MAX_DEBOUNCE_MS, Math.max(MIN_DEBOUNCE_MS, value));
    return Math.round(bounded / DEBOUNCE_STEP_MS) * DEBOUNCE_STEP_MS;
};

interface PreferencesState {
    autoSaveDebounceMs: number;
    historyDebounceMs: number;
    setAutoSaveDebounceMs: (value: number) => void;
    setHistoryDebounceMs: (value: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            autoSaveDebounceMs: 2000,
            historyDebounceMs: 2000,

            setAutoSaveDebounceMs: (value: number) => {
                set({ autoSaveDebounceMs: normalizeDebounce(value) });
            },

            setHistoryDebounceMs: (value: number) => {
                set({ historyDebounceMs: normalizeDebounce(value) });
            },
        }),
        {
            name: 'cosmic-preferences',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export { DEBOUNCE_STEP_MS, MAX_DEBOUNCE_MS, MIN_DEBOUNCE_MS };
