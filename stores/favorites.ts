/**
 * Local favorites store using Zustand + AsyncStorage
 * Favorites are client-side only until backend support is added
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
    favoriteSecretIds: Set<string>;
    favoriteNoteIds: Set<string>;
    toggleSecretFavorite: (id: string) => void;
    toggleNoteFavorite: (id: string) => void;
    isSecretFavorited: (id: string) => boolean;
    isNoteFavorited: (id: string) => boolean;
}

// Custom serializer for Sets
const setStorage = {
    getItem: async (name: string) => {
        const str = await AsyncStorage.getItem(name);
        if (!str) return null;
        const parsed = JSON.parse(str);
        return {
            state: {
                ...parsed.state,
                favoriteSecretIds: new Set(parsed.state.favoriteSecretIds || []),
                favoriteNoteIds: new Set(parsed.state.favoriteNoteIds || []),
            },
        };
    },
    setItem: async (name: string, value: any) => {
        const serialized = JSON.stringify({
            state: {
                ...value.state,
                favoriteSecretIds: Array.from(value.state.favoriteSecretIds || []),
                favoriteNoteIds: Array.from(value.state.favoriteNoteIds || []),
            },
        });
        await AsyncStorage.setItem(name, serialized);
    },
    removeItem: async (name: string) => {
        await AsyncStorage.removeItem(name);
    },
};

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favoriteSecretIds: new Set<string>(),
            favoriteNoteIds: new Set<string>(),

            toggleSecretFavorite: (id: string) => {
                set((state) => {
                    const newFavorites = new Set(state.favoriteSecretIds);
                    if (newFavorites.has(id)) {
                        newFavorites.delete(id);
                    } else {
                        newFavorites.add(id);
                    }
                    return { favoriteSecretIds: newFavorites };
                });
            },

            toggleNoteFavorite: (id: string) => {
                set((state) => {
                    const newFavorites = new Set(state.favoriteNoteIds);
                    if (newFavorites.has(id)) {
                        newFavorites.delete(id);
                    } else {
                        newFavorites.add(id);
                    }
                    return { favoriteNoteIds: newFavorites };
                });
            },

            isSecretFavorited: (id: string) => {
                return get().favoriteSecretIds.has(id);
            },

            isNoteFavorited: (id: string) => {
                return get().favoriteNoteIds.has(id);
            },
        }),
        {
            name: 'cosmic-favorites',
            storage: setStorage as any,
        }
    )
);
