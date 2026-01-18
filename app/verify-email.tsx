import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function VerifyEmailPage() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { verifyEmail } = useAuth();
    const router = useRouter();
    const { token } = useLocalSearchParams<{ token: string }>();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage(t('waitingArea.invalidLink'));
            return;
        }

        const verify = async () => {
            try {
                await verifyEmail(token);
                setStatus('success');
            } catch (error: any) {
                setStatus('error');
                setErrorMessage(error.message || t('waitingArea.verificationFailed'));
            }
        };

        verify();
    }, [token, verifyEmail]);

    const handleContinue = () => {
        router.replace('/(auth)/login');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
                {status === 'verifying' && (
                    <>
                        <ActivityIndicator size="large" color={theme.colors.accent} style={styles.icon} />
                        <Text style={[styles.title, { color: theme.colors.text }]}>{t('waitingArea.verifying')}</Text>
                        <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                            {t('waitingArea.verifyingDescription')}
                        </Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.success + '20' }]}>
                            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{t('waitingArea.emailVerified')}</Text>
                        <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                            {t('waitingArea.verifiedDescription')}
                        </Text>
                        <Button
                            title={t('common.continue')}
                            onPress={handleContinue}
                            fullWidth
                            style={styles.button}
                        />
                    </>
                )}

                {status === 'error' && (
                    <>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.error + '20' }]}>
                            <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{t('waitingArea.verificationFailed')}</Text>
                        <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                            {errorMessage}
                        </Text>
                        <Button
                            title={t('waitingArea.backToLogin')}
                            onPress={() => router.replace('/(auth)/login')}
                            variant="outline"
                            fullWidth
                            style={styles.button}
                        />
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    icon: {
        marginBottom: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'Comfortaa_400Regular',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    button: {
        marginTop: 8,
    },
});
