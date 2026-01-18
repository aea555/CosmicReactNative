import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export default function MainLayout() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { authState, masterPassword, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If authenticated but no master password (e.g. deep link or restored session),
        // we must force re-login to get the password for decryption.
        if (authState === 'AUTHENTICATED' && !masterPassword) {
            logout();
        }
    }, [authState, masterPassword, logout]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: 90, // Increased height
                    paddingTop: 10,
                    paddingBottom: 30, // Increased bottom padding to push items up
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontFamily: 'Comfortaa_500Medium',
                    fontSize: 11,
                    marginTop: 4,
                },
                tabBarIconStyle: {
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="vault"
                options={{
                    title: t('vault.title'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconContainer, focused && { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'shield' : 'shield-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="generators"
                options={{
                    title: t('generators.title'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconContainer, focused && { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'key' : 'key-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('settings.title'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={[styles.iconContainer, focused && { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        width: 44,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },

});
