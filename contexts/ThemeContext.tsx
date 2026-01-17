import {
    SubTheme,
    Theme,
    ThemeMode,
    darkSubThemes,
    getDefaultSubTheme,
    getTheme,
    lightSubThemes,
} from '@/constants/themes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@cosmic_theme';
const SUBTHEME_STORAGE_KEY = '@cosmic_subtheme';

interface ThemeContextType {
    theme: Theme;
    setThemeMode: (mode: ThemeMode) => void;
    setSubTheme: (subTheme: SubTheme) => void;
    availableSubThemes: SubTheme[];
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const systemColorScheme = useSystemColorScheme();
    const [mode, setMode] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');
    const [subTheme, setSubThemeState] = useState<SubTheme>(getDefaultSubTheme(mode));
    const [isLoading, setIsLoading] = useState(true);

    // Load saved theme preferences
    useEffect(() => {
        async function loadTheme() {
            try {
                const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                const savedSubTheme = await AsyncStorage.getItem(SUBTHEME_STORAGE_KEY);

                if (savedMode) {
                    const parsedMode = savedMode as ThemeMode;
                    setMode(parsedMode);

                    if (savedSubTheme) {
                        // Validate subtheme belongs to the mode
                        const validSubs: SubTheme[] = parsedMode === 'dark'
                            ? ['crimson', 'emerald', 'zinc', 'slate']
                            : ['milk', 'sandstorm', 'lavender'];
                        if (validSubs.includes(savedSubTheme as SubTheme)) {
                            setSubThemeState(savedSubTheme as SubTheme);
                        } else {
                            setSubThemeState(getDefaultSubTheme(parsedMode));
                        }
                    } else {
                        setSubThemeState(getDefaultSubTheme(parsedMode));
                    }
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadTheme();
    }, []);

    const setThemeMode = async (newMode: ThemeMode) => {
        setMode(newMode);
        const newSubTheme = getDefaultSubTheme(newMode);
        setSubThemeState(newSubTheme);

        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
            await AsyncStorage.setItem(SUBTHEME_STORAGE_KEY, newSubTheme);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const setSubTheme = async (newSubTheme: SubTheme) => {
        setSubThemeState(newSubTheme);

        try {
            await AsyncStorage.setItem(SUBTHEME_STORAGE_KEY, newSubTheme);
        } catch (error) {
            console.error('Failed to save subtheme:', error);
        }
    };

    const theme = getTheme(mode, subTheme);
    const availableSubThemes = mode === 'dark' ? darkSubThemes : lightSubThemes;

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setThemeMode,
                setSubTheme,
                availableSubThemes,
                isLoading,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
