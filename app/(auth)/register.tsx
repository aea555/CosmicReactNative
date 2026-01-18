import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { calculatePasswordStrength } from '@/services/crypto';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const PASSWORD_REQUIREMENTS = [
    { key: 'passwordTooShort', check: (p: string) => p.length >= 12 },
    { key: 'passwordNoUppercase', check: (p: string) => /[A-Z]/.test(p) },
    { key: 'passwordNoLowercase', check: (p: string) => /[a-z]/.test(p) },
    { key: 'passwordNoNumber', check: (p: string) => /[0-9]/.test(p) },
    { key: 'passwordNoSpecial', check: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export default function RegisterPage() {
    const { theme } = useTheme();
    const { register } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordStrength = password ? calculatePasswordStrength(password) : null;

    const getStrengthColor = () => {
        if (!passwordStrength) return theme.colors.textMuted;
        const colors = {
            'weak': '#ef4444',
            'fair': '#f97316',
            'good': '#eab308',
            'strong': '#22c55e',
            'very-strong': '#10b981',
        };
        return colors[passwordStrength.label];
    };

    const getStrengthLabel = (label: string) => {
        const labelMap: Record<string, string> = {
            'weak': t('generators.strength.weak'),
            'fair': t('generators.strength.fair'),
            'good': t('generators.strength.good'),
            'strong': t('generators.strength.strong'),
            'very-strong': t('generators.strength.veryStrong'),
        };
        return labelMap[label] || label;
    };

    const handleRegister = async () => {
        if (!email || !password) {
            setError(t('auth.enterCredentials'));
            return;
        }

        if (email.length > 320) {
            setError(t('auth.emailTooLong'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDontMatch'));
            return;
        }

        if (passwordStrength && passwordStrength.feedback.length > 0) {
            const firstErrorKey = passwordStrength.feedback[0];
            setError(t(`auth.${firstErrorKey}`));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await register(email, password);
            router.push('/(auth)/waiting-area');
        } catch (err: any) {
            setError(err.message || t('errors.registrationFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: theme.colors.bg }]}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t('auth.createAccount')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        {t('auth.startSecuring')}
                    </Text>
                </View>

                {/* Warning Banner */}
                <View style={[styles.warningBanner, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                    <Ionicons name="warning" size={22} color={theme.colors.warning} />
                    <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                        {t('auth.masterPasswordWarning')}
                    </Text>
                </View>

                {/* Password Requirements List */}
                <View style={[styles.requirementsContainer, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.requirementsTitle, { color: theme.colors.text }]}>
                        {t('auth.passwordRequirementsTitle')}
                    </Text>
                    {PASSWORD_REQUIREMENTS.map((req) => {
                        const isMet = password ? req.check(password) : false;
                        return (
                            <View key={req.key} style={styles.requirementRow}>
                                <Ionicons
                                    name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={16}
                                    color={isMet ? theme.colors.success : theme.colors.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.requirementText,
                                        { color: isMet ? theme.colors.success : theme.colors.textMuted },
                                    ]}
                                >
                                    {t(`auth.${req.key}`)}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Error Message */}
                {error && (
                    <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>
                            {error}
                        </Text>
                    </View>
                )}

                {/* Form */}
                <View style={styles.form}>
                    <Input
                        label={t('auth.email')}
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        leftIcon="mail-outline"
                    />

                    <Input
                        label={t('auth.masterPassword')}
                        placeholder={t('auth.createMasterPassword')}
                        value={password}
                        onChangeText={setPassword}
                        isPassword
                        autoCapitalize="none"
                        leftIcon="lock-closed-outline"
                    />

                    {/* Password Strength Indicator */}
                    {passwordStrength && (
                        <View style={styles.strengthContainer}>
                            <View style={styles.strengthBars}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.strengthBar,
                                            {
                                                backgroundColor:
                                                    i <= passwordStrength.score
                                                        ? getStrengthColor()
                                                        : theme.colors.border,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={[styles.strengthLabel, { color: getStrengthColor() }]}>
                                {getStrengthLabel(passwordStrength.label)}
                            </Text>
                        </View>
                    )}

                    {/* Missing Requirements Feedback */}
                    {passwordStrength && passwordStrength.feedback.length > 0 && (
                        <View style={[styles.feedbackContainer, { borderColor: theme.colors.error }]}>
                            {passwordStrength.feedback.map((key) => (
                                <View key={key} style={styles.feedbackRow}>
                                    <Ionicons name="close-circle" size={14} color={theme.colors.error} />
                                    <Text style={[styles.feedbackText, { color: theme.colors.error }]}>
                                        {t(`auth.${key}`)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <Input
                        label={t('auth.confirmPassword')}
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        isPassword
                        autoCapitalize="none"
                        leftIcon="checkmark-circle-outline"
                        error={
                            confirmPassword && password !== confirmPassword
                                ? t('auth.passwordsDontMatch')
                                : undefined
                        }
                    />

                    <Button
                        title={t('auth.createAccount')}
                        onPress={handleRegister}
                        loading={isLoading}
                        disabled={isLoading}
                        fullWidth
                        size="lg"
                        style={{ marginTop: 8 }}
                    />
                </View>

                {/* Login Link */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
                        {t('auth.alreadyHaveAccount')}{' '}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text style={[styles.footerLink, { color: theme.colors.accent }]}>
                                {t('auth.signIn')}
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Resend Verification Link */}
                <View style={styles.footerLinkContainer}>
                    <Link href="/(auth)/resend-verification" asChild>
                        <TouchableOpacity>
                            <Text style={[styles.secondaryLink, { color: theme.colors.textMuted }]}>
                                {t('auth.resendVerification')}
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Comfortaa_400Regular',
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        lineHeight: 20,
    },
    requirementsContainer: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
    },
    requirementsTitle: {
        fontSize: 13,
        fontFamily: 'Comfortaa_600SemiBold',
        marginBottom: 4,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementText: {
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Comfortaa_500Medium',
    },
    form: {
        flex: 1,
    },
    strengthContainer: {
        marginTop: -8,
        marginBottom: 8,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontFamily: 'Comfortaa_500Medium',
        textTransform: 'capitalize',
        marginTop: 6,
    },
    feedbackContainer: {
        borderLeftWidth: 3,
        paddingLeft: 12,
        marginBottom: 16,
        gap: 4,
    },
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    feedbackText: {
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    footerText: {
        fontSize: 14,
        fontFamily: 'Comfortaa_400Regular',
    },
    footerLink: {
        fontSize: 14,
        fontFamily: 'Comfortaa_700Bold',
    },
    footerLinkContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    secondaryLink: {
        fontSize: 13,
        fontFamily: 'Comfortaa_500Medium',
        textDecorationLine: 'underline',
    },
});
