import {
  Comfortaa_400Regular,
  Comfortaa_500Medium,
  Comfortaa_700Bold,
  useFonts,
} from '@expo-google-fonts/comfortaa';
import { ProstoOne_400Regular } from '@expo-google-fonts/prosto-one';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

// Initialize i18n
import '@/i18n';

import { SplashAnimation } from '@/components/SplashAnimation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { authState, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    if (authState === 'NOT_AUTHENTICATED') {
      // Redirect to landing if trying to access protected routes
      if (inMainGroup) {
        router.replace('/(auth)/landing');
      }
    } else if (authState === 'AUTHENTICATED') {
      // Redirect to vault if trying to access auth routes
      if (inAuthGroup) {
        router.replace('/(main)/vault');
      }
    } else if (authState === 'WAITING_FOR_VERIFICATION') {
      // Stay on waiting area or allow going back to auth pages
      if (inMainGroup) {
        router.replace('/(auth)/waiting-area');
      }
    }
  }, [authState, segments, isLoading]);

  return <>{children}</>;
}

function RefreshOverlay() {
  const { isRefreshing } = useAuth();
  const { theme } = useTheme();

  if (!isRefreshing) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
      <View style={[styles.syncContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.syncSpinner} />
        <View style={{ alignItems: 'center' }}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: theme.colors.accent }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { theme } = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <RefreshOverlay />
    </>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Comfortaa_400Regular,
    Comfortaa_500Medium,
    Comfortaa_700Bold,
    ProstoOne_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setAppIsReady(true);
    }
  }, [fontsLoaded]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!appIsReady) {
    return null;
  }

  if (showSplash) {
    return <SplashAnimation onAnimationComplete={handleSplashComplete} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationGuard>
          <RootLayoutNav />
        </NavigationGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  syncContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderTopColor: '#7c3aed',
    marginBottom: 12,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
