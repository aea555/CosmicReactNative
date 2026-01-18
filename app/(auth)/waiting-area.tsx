import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function WaitingAreaPage() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { verifyEmail } = useAuth();
    const router = useRouter();

    const [isVerifying, setIsVerifying] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);

    // Resend states
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendMessage, setResendMessage] = useState('');
    const [userEmail, setUserEmail] = useState('');

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
        transform: [{ scale: interpolate(ripple.value, [0, 1], [1, 2.5]) }],
        opacity: interpolate(ripple.value, [0, 0.3, 1], [0.4, 0.2, 0]),
    }));

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

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
                t('waitingArea.verificationFailed'),
                error.message || t('waitingArea.invalidLink')
            );
        } finally {
            setIsVerifying(false);
        }
    }, [verifyEmail, t]);

    // Listen for deep links
    useEffect(() => {
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

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
    }, [showSuccessModal, router]);

    // Resend verification email
    const handleResend = async () => {
        if (resendCooldown > 0 || isResending || !userEmail) {
            if (!userEmail) {
                Alert.alert('Email Required', 'Please enter your email to resend verification.');
                return;
            }
            return;
        }

        setIsResending(true);
        setResendMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await response.json();

            if (response.ok) {
                setResendMessage(t('waitingArea.verificationSent') || 'Verification email sent!');
                setResendCooldown(60);
            } else if (data.code === 'VERIFICATION_PENDING') {
                const match = data.error?.match(/(\d+) seconds/);
                const seconds = match ? parseInt(match[1]) : 60;
                setResendCooldown(seconds);
                setResendMessage(`Please wait ${seconds}s before resending`);
            } else if (data.code === 'EMAIL_ALREADY_VERIFIED') {
                setResendMessage('Email is already verified. You can log in.');
                setTimeout(() => router.replace('/(auth)/login'), 2000);
            } else {
                setResendMessage(data.error || 'Failed to resend');
            }
        } catch (error) {
            setResendMessage('Network error. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
                        {/* Email icon with ripple */}
                        <View style={styles.iconSection}>
                            <View style={styles.iconWrapper}>
                                <Animated.View
                                    style={[
                                        styles.ripple,
                                        { borderColor: theme.colors.accent },
                                        rippleStyle,
                                    ]}
                                />
                                <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface }]}>
                                    <Ionicons name="mail-outline" size={40} color={theme.colors.accent} />
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {t('waitingArea.checkEmail')}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                            {t('waitingArea.verificationSent')}
                        </Text>

                        {/* Info cards */}
                        <View style={styles.infoCards}>
                            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                                <Ionicons name="time-outline" size={22} color={theme.colors.accent} />
                                <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                                    Your verification link is valid for 24 hours
                                </Text>
                            </View>

                            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
                                <Ionicons name="mail-outline" size={22} color={theme.colors.accent} />
                                <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                                    {t('waitingArea.checkSpam')}
                                </Text>
                            </View>
                        </View>

                        {/* Resend section */}
                        <View style={[styles.resendSection, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.resendLabel, { color: theme.colors.textMuted }]}>
                                Didn't receive the email?
                            </Text>

                            <View style={styles.resendInputRow}>
                                <View style={[styles.emailInput, { backgroundColor: theme.colors.bg }]}>
                                    <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />
                                    <TextInput
                                        style={[styles.emailInputField, { color: theme.colors.text }]}
                                        value={userEmail}
                                        onChangeText={setUserEmail}
                                        placeholder="Enter your email"
                                        placeholderTextColor={theme.colors.textMuted}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.resendButton,
                                    {
                                        backgroundColor: resendCooldown > 0 ? theme.colors.surfaceElevated : theme.colors.accent,
                                        opacity: resendCooldown > 0 || isResending ? 0.6 : 1,
                                    },
                                ]}
                                onPress={handleResend}
                                disabled={resendCooldown > 0 || isResending}
                            >
                                <Text style={[styles.resendButtonText, { color: resendCooldown > 0 ? theme.colors.textMuted : '#fff' }]}>
                                    {isResending
                                        ? 'Sending...'
                                        : resendCooldown > 0
                                            ? `Resend in ${resendCooldown}s`
                                            : 'Resend Verification Email'}
                                </Text>
                            </TouchableOpacity>

                            {resendMessage && (
                                <Text style={[styles.resendMessage, { color: theme.colors.accent }]}>
                                    {resendMessage}
                                </Text>
                            )}
                        </View>

                        {/* Navigation buttons */}
                        <View style={styles.actions}>
                            <Button
                                title={t('waitingArea.backToLogin')}
                                onPress={() => router.replace('/(auth)/login')}
                                variant="outline"
                                fullWidth
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                onClose={() => { }}
                title={t('waitingArea.emailVerified')}
                message={t('waitingArea.verifiedMessage', { seconds: redirectCountdown })}
                confirmText={`${t('common.continue')} (${redirectCountdown})`}
                onConfirm={() => router.replace('/(auth)/login')}
                showCancel={false}
            />

            {/* Loading overlay */}
            {isVerifying && (
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                            {t('waitingArea.verifying')}
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
        paddingTop: 40,
    },
    iconSection: {
        marginBottom: 24,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ripple: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
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
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    infoCards: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
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
    resendSection: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    resendLabel: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
        marginBottom: 12,
        textAlign: 'center',
    },
    resendInputRow: {
        marginBottom: 12,
    },
    emailInput: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        gap: 10,
    },
    emailInputField: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    resendButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    resendButtonText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    resendMessage: {
        fontSize: 13,
        fontFamily: 'Comfortaa_400Regular',
        textAlign: 'center',
        marginTop: 12,
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
