/**
 * Comprehensive theme system for Cosmic Vault
 * Supports dark/light modes with multiple sub-themes
 */

export type ThemeMode = 'dark' | 'light';
export type DarkSubTheme = 'crimson' | 'emerald' | 'zinc' | 'slate';
export type LightSubTheme = 'milk' | 'sandstorm' | 'lavender';
export type SubTheme = DarkSubTheme | LightSubTheme;

export interface ThemeColors {
    bg: string;
    surface: string;
    surfaceElevated: string;
    accent: string;
    accentMuted: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
    warning: string;
}

export interface Theme {
    mode: ThemeMode;
    subTheme: SubTheme;
    colors: ThemeColors;
}

// Dark sub-themes
const darkThemes: Record<DarkSubTheme, ThemeColors> = {
    crimson: {
        bg: '#0f0808',
        surface: '#1a0f0f',
        surfaceElevated: '#2d1a1a',
        accent: '#ef4444',
        accentMuted: '#b91c1c',
        text: '#fef2f2',
        textMuted: '#fca5a5',
        border: '#7f1d1d',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
    },
    emerald: {
        bg: '#071410',
        surface: '#0d1f17',
        surfaceElevated: '#14532d',
        accent: '#10b981',
        accentMuted: '#059669',
        text: '#ecfdf5',
        textMuted: '#a7f3d0',
        border: '#065f46',
        error: '#f87171',
        success: '#34d399',
        warning: '#fbbf24',
    },
    zinc: {
        bg: '#09090b',
        surface: '#18181b',
        surfaceElevated: '#27272a',
        accent: '#a1a1aa',
        accentMuted: '#71717a',
        text: '#fafafa',
        textMuted: '#d4d4d8',
        border: '#3f3f46',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
    },
    slate: {
        bg: '#020617',
        surface: '#0f172a',
        surfaceElevated: '#1e293b',
        accent: '#38bdf8',
        accentMuted: '#0284c7',
        text: '#f8fafc',
        textMuted: '#cbd5e1',
        border: '#334155',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
    },
};

// Light sub-themes
const lightThemes: Record<LightSubTheme, ThemeColors> = {
    milk: {
        bg: '#ffffff',
        surface: '#f8fafc',
        surfaceElevated: '#f1f5f9',
        accent: '#0f172a',
        accentMuted: '#475569',
        text: '#0f172a',
        textMuted: '#64748b',
        border: '#e2e8f0',
        error: '#dc2626',
        success: '#16a34a',
        warning: '#d97706',
    },
    sandstorm: {
        bg: '#fffbeb',
        surface: '#fef3c7',
        surfaceElevated: '#fde68a',
        accent: '#b45309',
        accentMuted: '#d97706',
        text: '#78350f',
        textMuted: '#92400e',
        border: '#fcd34d',
        error: '#dc2626',
        success: '#16a34a',
        warning: '#d97706',
    },
    lavender: {
        bg: '#faf5ff',
        surface: '#f3e8ff',
        surfaceElevated: '#e9d5ff',
        accent: '#7c3aed',
        accentMuted: '#8b5cf6',
        text: '#3b0764',
        textMuted: '#6b21a8',
        border: '#c4b5fd',
        error: '#dc2626',
        success: '#16a34a',
        warning: '#d97706',
    },
};

export const darkSubThemes: DarkSubTheme[] = ['crimson', 'emerald', 'zinc', 'slate'];
export const lightSubThemes: LightSubTheme[] = ['milk', 'sandstorm', 'lavender'];

export function getTheme(mode: ThemeMode, subTheme: SubTheme): Theme {
    const colors = mode === 'dark'
        ? darkThemes[subTheme as DarkSubTheme] || darkThemes.slate
        : lightThemes[subTheme as LightSubTheme] || lightThemes.milk;

    return { mode, subTheme, colors };
}

export function getDefaultSubTheme(mode: ThemeMode): SubTheme {
    return mode === 'dark' ? 'slate' : 'milk';
}

// Color coding for URL domains
const domainColors: string[] = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
];

export function getDomainColor(url: string | null | undefined): string {
    if (!url) {
        return domainColors[Math.floor(Math.random() * domainColors.length)];
    }

    try {
        const domain = new URL(url).hostname.replace('www.', '');
        // Generate consistent color from domain hash
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
            hash = domain.charCodeAt(i) + ((hash << 5) - hash);
        }
        return domainColors[Math.abs(hash) % domainColors.length];
    } catch {
        return domainColors[Math.floor(Math.random() * domainColors.length)];
    }
}
