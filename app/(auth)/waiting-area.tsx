import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const WAITING_TIME = 10 * 60; // 10 minutes in seconds

export default function WaitingAreaPage() {
    const { theme } = useTheme();
    const { verifyEmail, authState } = useAuth();
    const router = useRouter();

    const [timeRemaining, setTimeRemaining] = useState(WAITING_TIME);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);

    const ripple = useSharedValue(0);

    // Ripple animation
    useEffect(() => {
        ripple.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const rippleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ripple.value, [0, 1], [1, 3]) }],
        opacity: interpolate(ripple.value, [0, 0.3, 1], [0.5, 0.3, 0]),
    }));

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    router.replace('/(auth)/landing');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Handle deep link verification
    const handleDeepLink = useCallback(async (url: string) => {
        try {
            const urlObj = new URL(url);
            const token = urlObj.searchParams.get('token');

            if (token && (urlObj.pathname === 'verify-email' || url.includes('verify-email'))) {
                setIsVerifying(true);
                await verifyEmail(token);
                setShowSuccessModal(true);
            }
        } catch (error: any) {
            Alert.alert(
                'Verification Failed',
                error.message || 'The verification link is invalid or expired.'
            );
        } finally {
            setIsVerifying(false);
        }
    }, [verifyEmail]);

    // Listen for deep links
    useEffect(() => {
        // Handle deep link when app opens
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

        // Handle deep link when app is already open
        const subscription = Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
        });

        return () => subscription.remove();
    }, [handleDeepLink]);

    // Redirect countdown after success
    useEffect(() => {
        if (!showSuccessModal) return;

        const interval = setInterval(() => {
            setRedirectCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    router.replace('/(auth)/login');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showSuccessModal]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace('/(auth)/landing')}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.timerSection}>
                    {/* Ripple effect */}
                    <View style={styles.timerWrapper}>
                        <Animated.View
                            style={[
                                styles.ripple,
                                { borderColor: theme.colors.accent },
                                rippleStyle,
                            ]}
                        />
                        <View style={[styles.timerCircle, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.timerText, { color: theme.colors.accent }]}>
                                {formatTime(timeRemaining)}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.title, { color: theme.colors.text }]}>
                    Check your email
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    We've sent a verification link to your email address. Click the link to verify your account.
                </Text>

                {/* Info cards */}
                <View style={styles.infoCards}>
                    <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="mail-outline" size={22} color={theme.colors.accent} />
                        <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                            Check your spam folder if you don't see it
                        </Text>
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="time-outline" size={22} color={theme.colors.accent} />
                        <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                            Link expires when the timer runs out
                        </Text>
                    </View>
                </View>

                {/* Navigation buttons */}
                <View style={styles.actions}>
                    <Button
                        title="Back to Login"
                        onPress={() => router.replace('/(auth)/login')}
                        variant="outline"
                        fullWidth
                    />
                    <Button
                        title="Start Over"
                        onPress={() => router.replace('/(auth)/landing')}
                        variant="ghost"
                        fullWidth
                    />
                </View>
            </View>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                onClose={() => { }}
                title="Email Verified! 🎉"
                message={`Your email has been verified successfully. You'll be redirected to the login page in ${redirectCountdown} seconds.`}
                confirmText={`Continue (${redirectCountdown})`}
                onConfirm={() => router.replace('/(auth)/login')}
                showCancel={false}
            />

            {/* Loading overlay */}
            {isVerifying && (
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                            Verifying...
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -60,
    },
    timerSection: {
        marginBottom: 32,
    },
    timerWrapper: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ripple: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
    },
    timerCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
    },
    timerText: {
        fontSize: 28,
        fontFamily: 'Comfortaa_700Bold',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Comfortaa_400Regular',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    infoCards: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 14,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        padding: 24,
        borderRadius: 16,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Comfortaa_500Medium',
    },
});
