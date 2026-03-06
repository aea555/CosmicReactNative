import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UnlockScreen() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { unlockVault, logout } = useAuth();

    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async () => {
        if (!password.trim()) return;

        Keyboard.dismiss();
        setIsLoading(true);
        setError(null);

        try {
            await unlockVault(password);
            // Navigation will be handled by NavigationGuard when authState changes to AUTHENTICATED
        } catch (err: any) {
            if (__DEV__) {
                console.warn('Unlock failed', err);
            }
            setError(err?.message || t('errors.invalidPassword') || 'Invalid password');
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="lock-closed" size={32} color={theme.colors.accent} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {t('auth.unlockVault') || 'Unlock Vault'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                            {t('auth.enterMasterPassword') || 'Please enter your master password to continue'}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label={t('auth.masterPassword')}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setError(null);
                            }}
                            placeholder={t('auth.enterMasterPasswordPlaceholder') || 'Enter master password'}
                            isPassword={true}
                            autoCapitalize="none"
                            error={error || undefined}
                            onSubmitEditing={handleUnlock}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: theme.colors.accent },
                                (isLoading || !password) && styles.buttonDisabled
                            ]}
                            onPress={handleUnlock}
                            disabled={isLoading || !password}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t('auth.unlock') || 'Unlock'}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={logout}
                        >
                            <Text style={[styles.logoutText, { color: theme.colors.textMuted }]}>
                                {t('auth.switchAccount') || 'Switch Account / Create New'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        width: '100%',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontFamily: 'ProstoOne_400Regular',
        fontSize: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Comfortaa_500Medium',
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
    },
    form: {
        width: '100%',
        gap: 16,
        maxWidth: 400,
    },
    button: {
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'Comfortaa_700Bold',
        fontSize: 16,
    },
    logoutButton: {
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    logoutText: {
        fontFamily: 'Comfortaa_700Bold',
        fontSize: 14,
    }
});
