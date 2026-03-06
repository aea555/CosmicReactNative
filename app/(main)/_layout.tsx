import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabItemButton({
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  style,
  onPress,
  onLongPress,
  testID,
  children,
}: BottomTabBarButtonProps) {
  const { theme } = useTheme();
  const isActive = Boolean(accessibilityState?.selected);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        style,
        styles.tabItemButton,
        isActive ? { backgroundColor: theme.colors.bg } : null,
        pressed ? styles.tabItemPressed : null,
      ]}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.tabIconFrame}>
      <View
        pointerEvents="none"
        style={[
          styles.tabIconGlow,
          {
            opacity: focused ? 1 : 0,
            borderColor: `${theme.colors.accent}80`,
            backgroundColor: `${theme.colors.accent}12`,
          },
        ]}
      />
      <View
        style={[
          styles.tabIconWrap,
          focused ? styles.tabIconActiveShadow : styles.tabIconInactiveShadow,
          {
            backgroundColor: focused
              ? theme.colors.accent
              : theme.colors.surfaceElevated,
            borderColor: focused
              ? `${theme.colors.accent}A6`
              : `${theme.colors.border}E6`,
          },
        ]}
      >
        <Ionicons
          name={name}
          size={size - 1}
          color={focused ? "#ffffff" : color}
        />
      </View>
    </View>
  );
}

export default function MainLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { authState, masterPassword, logout } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // If authenticated but no master password (e.g. deep link or restored session),
    // we must force re-login to get the password for decryption.
    if (authState === "AUTHENTICATED" && !masterPassword) {
      logout();
    }
  }, [authState, masterPassword, logout]);

  const androidBottomEscape = Platform.OS === "android" ? 4 : 0;
  const tabBarBottomInset = insets.bottom + androidBottomEscape;
  const tabBarHeight = 66 + tabBarBottomInset;
  const tabBarPaddingBottom = 8 + tabBarBottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <TabItemButton {...props} />,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: `${theme.colors.border}E6`,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 10,
          paddingBottom: tabBarPaddingBottom,
          paddingHorizontal: 8,
          overflow: "visible",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.16,
          shadowRadius: 9,
          elevation: 16,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontFamily: "Comfortaa_700Bold",
          fontSize: 11,
          lineHeight: 13,
          marginTop: 1,
          textAlign: "center",
          includeFontPadding: false,
          textShadowColor: "rgba(0,0,0,0.18)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        },
        tabBarIconStyle: {
          marginTop: -24,
          marginBottom: 8,
          alignSelf: "center",
        },
      }}
    >
      <Tabs.Screen
        name="vault"
        options={{
          title: t("vault.title"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "shield" : "shield-outline"}
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="generators"
        options={{
          title: t("generators.title"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "key" : "key-outline"}
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings.title"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "settings" : "settings-outline"}
              size={size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItemButton: {
    borderRadius: 16,
    marginHorizontal: 3,
    top: 0,
    paddingTop: 3,
    paddingBottom: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tabItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  tabIconFrame: {
    width: 42,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  tabIconGlow: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 2,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActiveShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  tabIconInactiveShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
});
