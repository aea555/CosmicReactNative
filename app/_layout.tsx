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
import { useTranslation } from 'react-i18next';
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
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';
    const isAtRoot = !segments[0]; // No segment = at root

    let needsRedirect = false;

    if (authState === 'NOT_AUTHENTICATED') {
      if (inMainGroup || isAtRoot) {
        router.replace('/(auth)/landing');
        needsRedirect = true;
      }
    } else if (authState === 'AUTHENTICATED') {
      if (inAuthGroup || isAtRoot) {
        router.replace('/(main)/vault');
        needsRedirect = true;
      }
    } else if (authState === 'WAITING_FOR_VERIFICATION') {
      if (inMainGroup || isAtRoot) {
        router.replace('/(auth)/waiting-area');
        needsRedirect = true;
      }
    }

    // Only mark as navigated after redirect logic completes
    if (!needsRedirect) {
      setHasNavigated(true);
    } else {
      // Wait a tick for the navigation to process
      setTimeout(() => setHasNavigated(true), 100);
    }
  }, [authState, segments, isLoading]);

  // Show splash while loading or until initial navigation is complete
  if (isLoading || !hasNavigated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f11', alignItems: 'center', justifyContent: 'center' }}>
        <SplashAnimation onAnimationComplete={() => { }} />
      </View>
    );
  }

  return <>{children}</>;
}

function RefreshOverlay() {
  const { isRefreshing } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (!isRefreshing) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.syncContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.syncText, { color: theme.colors.text }]}>{t('common.refreshingSession')}</Text>
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, Text } from 'react-native';

// Initialize QueryClient
const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationGuard>
            <RootLayoutNav />
          </NavigationGuard>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
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
    gap: 12,
    minWidth: 200,
  },
  syncText: {
    fontFamily: 'Comfortaa_500Medium',
    fontSize: 16,
  },
});
