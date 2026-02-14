import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
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

export default function LoginPage() {
    const { theme } = useTheme();
    const { login } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password) {
            setError(t('auth.enterCredentials'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await login(email, password);
            router.replace('/(main)/vault');
        } catch (err: any) {
            setError(err.message || t('errors.loginFailed'));
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
                    <View style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.logoText, { color: theme.colors.accent }]}>C</Text>
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t('auth.welcomeBack')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        {t('auth.signInToVault')}
                    </Text>
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
                        placeholder={t('auth.passwordPlaceholder')}
                        value={password}
                        onChangeText={setPassword}
                        isPassword
                        autoCapitalize="none"
                        leftIcon="lock-closed-outline"
                    />

                    <Button
                        title={t('auth.signIn')}
                        onPress={handleLogin}
                        loading={isLoading}
                        disabled={isLoading}
                        fullWidth
                        size="lg"
                        style={{ marginTop: 8 }}
                    />
                </View>

                {/* Register Link */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
                        {t('auth.dontHaveAccount')}{' '}
                    </Text>
                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity>
                            <Text style={[styles.footerLink, { color: theme.colors.accent }]}>
                                {t('auth.createAccount')}
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
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(124, 58, 237, 0.3)',
        marginBottom: 20,
    },
    logoText: {
        fontSize: 36,
        fontFamily: 'ProstoOne_400Regular',
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
