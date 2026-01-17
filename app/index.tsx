import { Redirect } from 'expo-router';

export default function Index() {
    // Always redirect to auth landing on app start
    // Navigation guard will handle the actual routing based on auth state
    return <Redirect href="/(auth)/landing" />;
}
