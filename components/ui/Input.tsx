import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface InputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
    isPassword?: boolean;
}

export function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    isPassword = false,
    ...props
}: InputProps) {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const borderColor = useSharedValue(theme.colors.border);

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: borderColor.value,
    }));

    const handleFocus = () => {
        setIsFocused(true);
        borderColor.value = withTiming(error ? theme.colors.error : theme.colors.accent, {
            duration: 150,
        });
    };

    const handleBlur = () => {
        setIsFocused(false);
        borderColor.value = withTiming(
            error ? theme.colors.error : theme.colors.border,
            { duration: 150 }
        );
    };

    const actualRightIcon = isPassword
        ? showPassword
            ? 'eye-off-outline'
            : 'eye-outline'
        : rightIcon;

    const handleRightIconPress = isPassword
        ? () => setShowPassword(!showPassword)
        : onRightIconPress;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text
                    style={[
                        styles.label,
                        {
                            color: error ? theme.colors.error : theme.colors.textMuted,
                            fontFamily: 'Comfortaa_500Medium',
                        },
                    ]}
                >
                    {label}
                </Text>
            )}

            <Animated.View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1.5,
                    },
                    animatedBorderStyle,
                    error && { borderColor: theme.colors.error },
                ]}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={20}
                        color={isFocused ? theme.colors.accent : theme.colors.textMuted}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    {...props}
                    style={[
                        styles.input,
                        {
                            color: theme.colors.text,
                            fontFamily: 'Comfortaa_400Regular',
                        },
                    ]}
                    placeholderTextColor={theme.colors.textMuted}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={isPassword && !showPassword}
                />

                {actualRightIcon && (
                    <TouchableOpacity
                        onPress={handleRightIconPress}
                        style={styles.rightIcon}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={actualRightIcon}
                            size={20}
                            color={theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {(error || hint) && (
                <Text
                    style={[
                        styles.hint,
                        {
                            color: error ? theme.colors.error : theme.colors.textMuted,
                            fontFamily: 'Comfortaa_400Regular',
                        },
                    ]}
                >
                    {error || hint}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    leftIcon: {
        marginLeft: 14,
    },
    rightIcon: {
        paddingRight: 14,
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});
