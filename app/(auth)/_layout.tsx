import { useTheme } from '@/contexts/ThemeContext';
import { Stack } from 'expo-router';

export default function AuthLayout() {
    const { theme } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.bg },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="landing" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="waiting-area" />
        </Stack>
    );
}
