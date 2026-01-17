import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function MainLayout() {
    const { theme } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: 80,
                    paddingTop: 12,
                    paddingBottom: 24,
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontFamily: 'Comfortaa_500Medium',
                    fontSize: 11,
                    marginTop: 2,
                },
                tabBarIconStyle: {
                    marginBottom: 0,
                },
            }}
        >
            <Tabs.Screen
                name="vault/index"
                options={{
                    title: 'Vault',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={focused && [styles.activeIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'shield' : 'shield-outline'} size={size} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="generators"
                options={{
                    title: 'Generators',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={focused && [styles.activeIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'key' : 'key-outline'} size={size} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size, focused }) => (
                        <View style={focused && [styles.activeIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
                        </View>
                    ),
                }}
            />
            {/* Hidden screens */}
            <Tabs.Screen
                name="vault/[id]"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIcon: {
        padding: 6,
        borderRadius: 10,
    },
});
