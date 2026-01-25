import { useTheme } from '@/contexts/ThemeContext';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
    const { theme } = useTheme();
    const { t } = useTranslation();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.bg },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen
                name="advanced"
                options={{
                    headerShown: false, // We use custom header in the page
                }}
            />
        </Stack>
    );
}
