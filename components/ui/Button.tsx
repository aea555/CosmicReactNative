import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
    style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    fullWidth = false,
    style,
}: ButtonProps) {
    const { theme } = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const getBackgroundColor = (): string => {
        if (disabled) return theme.colors.surfaceElevated;
        switch (variant) {
            case 'primary':
                return theme.colors.accent;
            case 'secondary':
                return theme.colors.surface;
            case 'danger':
                return theme.colors.error;
            case 'outline':
            case 'ghost':
                return 'transparent';
            default:
                return theme.colors.accent;
        }
    };

    const getTextColor = (): string => {
        if (disabled) return theme.colors.textMuted;
        switch (variant) {
            case 'primary':
                return theme.mode === 'dark' ? '#fff' : '#fff';
            case 'secondary':
                return theme.colors.text;
            case 'danger':
                return '#fff';
            case 'outline':
            case 'ghost':
                return theme.colors.accent;
            default:
                return '#fff';
        }
    };

    const getBorderStyle = (): ViewStyle => {
        if (variant === 'outline') {
            return {
                borderWidth: 1.5,
                borderColor: disabled ? theme.colors.border : theme.colors.accent,
            };
        }
        return {};
    };

    const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
        switch (size) {
            case 'sm':
                return {
                    container: { paddingVertical: 8, paddingHorizontal: 16 },
                    text: { fontSize: 14 },
                };
            case 'lg':
                return {
                    container: { paddingVertical: 16, paddingHorizontal: 28 },
                    text: { fontSize: 18 },
                };
            default:
                return {
                    container: { paddingVertical: 12, paddingHorizontal: 24 },
                    text: { fontSize: 16 },
                };
        }
    };

    const getShadowStyle = (): ViewStyle => {
        // Don't apply shadow to transparent variants
        if (variant === 'outline' || variant === 'ghost') {
            return {};
        }
        return {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        };
    };

    const sizeStyles = getSizeStyles();

    return (
        <AnimatedPressable
            onPress={disabled || loading ? undefined : onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                styles.button,
                getShadowStyle(),
                {
                    backgroundColor: getBackgroundColor(),
                    ...getBorderStyle(),
                    ...sizeStyles.container,
                    width: fullWidth ? '100%' : undefined,
                    opacity: disabled ? 0.5 : 1,
                },
                animatedStyle,
                style,
            ]}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text
                        style={[
                            styles.text,
                            {
                                color: getTextColor(),
                                ...sizeStyles.text,
                                marginLeft: icon ? 8 : 0,
                                fontFamily: 'Comfortaa_500Medium',
                            },
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
});

