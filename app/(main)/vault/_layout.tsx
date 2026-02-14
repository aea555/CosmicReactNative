import { useTheme } from '@/contexts/ThemeContext';
import { Stack } from 'expo-router';

export default function VaultLayout() {
    const { theme } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.bg },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="[id]" />
            <Stack.Screen name="editor" />
        </Stack>
    );
}
