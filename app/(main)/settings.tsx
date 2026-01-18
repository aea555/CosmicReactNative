import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsPage() {
    const { t } = useTranslation();
    const { theme, setThemeMode, setSubTheme, availableSubThemes } = useTheme();
    const { logout } = useAuth();

    const getSubThemeColor = (subTheme: string): string => {
        const colors: Record<string, string> = {
            // Dark
            crimson: '#dc2626',
            emerald: '#10b981',
            zinc: '#a1a1aa',
            slate: '#38bdf8',
            // Light
            milk: '#0f172a',
            sandstorm: '#b45309',
            lavender: '#7c3aed',
        };
        return colors[subTheme] || theme.colors.accent;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('settings.title')}</Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Theme Mode */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.theme')}</Text>
                    <View style={styles.themeToggle}>
                        <TouchableOpacity
                            style={[
                                styles.themeOption,
                                {
                                    backgroundColor: theme.mode === 'dark' ? theme.colors.accent : theme.colors.surface,
                                },
                            ]}
                            onPress={() => setThemeMode('dark')}
                        >
                            <Ionicons
                                name="moon"
                                size={20}
                                color={theme.mode === 'dark' ? '#fff' : theme.colors.textMuted}
                            />
                            <Text
                                style={[
                                    styles.themeOptionText,
                                    { color: theme.mode === 'dark' ? '#fff' : theme.colors.textMuted },
                                ]}
                            >
                                {t('settings.dark')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.themeOption,
                                {
                                    backgroundColor: theme.mode === 'light' ? theme.colors.accent : theme.colors.surface,
                                },
                            ]}
                            onPress={() => setThemeMode('light')}
                        >
                            <Ionicons
                                name="sunny"
                                size={20}
                                color={theme.mode === 'light' ? '#fff' : theme.colors.textMuted}
                            />
                            <Text
                                style={[
                                    styles.themeOptionText,
                                    { color: theme.mode === 'light' ? '#fff' : theme.colors.textMuted },
                                ]}
                            >
                                {t('settings.light')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sub-Theme */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.colorScheme')}</Text>
                    <View style={styles.subThemeGrid}>
                        {availableSubThemes.map((sub) => (
                            <TouchableOpacity
                                key={sub}
                                style={[
                                    styles.subThemeOption,
                                    {
                                        backgroundColor: theme.colors.surface,
                                        borderColor: theme.subTheme === sub ? getSubThemeColor(sub) : theme.colors.border,
                                        borderWidth: theme.subTheme === sub ? 2 : 1,
                                    },
                                ]}
                                onPress={() => setSubTheme(sub)}
                            >
                                <View style={[styles.subThemeColor, { backgroundColor: getSubThemeColor(sub) }]} />
                                <Text
                                    style={[
                                        styles.subThemeText,
                                        {
                                            color: theme.subTheme === sub ? theme.colors.text : theme.colors.textMuted,
                                            fontFamily: theme.subTheme === sub ? 'Comfortaa_700Bold' : 'Comfortaa_400Regular',
                                        },
                                    ]}
                                >
                                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                                </Text>
                                {theme.subTheme === sub && (
                                    <Ionicons name="checkmark-circle" size={18} color={getSubThemeColor(sub)} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Preview */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.preview')}</Text>
                    <View style={[styles.previewCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.previewRow}>
                            <View style={[styles.previewDot, { backgroundColor: theme.colors.accent }]} />
                            <Text style={[styles.previewText, { color: theme.colors.text }]}>
                                {t('settings.accentColor')}
                            </Text>
                        </View>
                        <View style={styles.previewRow}>
                            <View style={[styles.previewDot, { backgroundColor: theme.colors.success }]} />
                            <Text style={[styles.previewText, { color: theme.colors.textMuted }]}>
                                {t('settings.successIndicator')}
                            </Text>
                        </View>
                        <View style={styles.previewRow}>
                            <View style={[styles.previewDot, { backgroundColor: theme.colors.error }]} />
                            <Text style={[styles.previewText, { color: theme.colors.textMuted }]}>
                                {t('settings.errorState')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.account')}</Text>
                    <Button
                        title={t('settings.signOut')}
                        onPress={logout}
                        variant="outline"
                        fullWidth
                        icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.accent} />}
                    />
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.about')}</Text>
                    <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.aboutRow}>
                            <Text style={[styles.aboutLabel, { color: theme.colors.textMuted }]}>{t('settings.version')}</Text>
                            <Text style={[styles.aboutValue, { color: theme.colors.text }]}>1.0.0</Text>
                        </View>
                        <View style={styles.aboutRow}>
                            <Text style={[styles.aboutLabel, { color: theme.colors.textMuted }]}>
                                {t('settings.build')}
                            </Text>
                            <Text style={[styles.aboutValue, { color: theme.colors.text }]}>
                                2026.01.18
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
                        {t('settings.madeWith')}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Comfortaa_700Bold',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Comfortaa_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    themeToggle: {
        flexDirection: 'row',
        gap: 12,
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
    },
    themeOptionText: {
        fontSize: 15,
        fontFamily: 'Comfortaa_500Medium',
    },
    subThemeGrid: {
        gap: 10,
    },
    subThemeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
        gap: 14,
    },
    subThemeColor: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    subThemeText: {
        flex: 1,
        fontSize: 15,
    },
    previewCard: {
        padding: 20,
        borderRadius: 14,
        gap: 16,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    previewDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    previewText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    aboutCard: {
        padding: 20,
        borderRadius: 14,
        gap: 12,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    aboutLabel: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    aboutValue: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 13,
        fontFamily: 'Comfortaa_400Regular',
    },
});
