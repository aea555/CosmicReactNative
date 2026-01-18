import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function ResendVerificationPage() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    if (!email) {
      setMessage({ type: 'error', text: t('auth.enterEmail') });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: t('waitingArea.emailSent') });
      } else if (data.code === 'VERIFICATION_PENDING') {
        const match = data.error?.match(/(\d+) seconds/);
        const seconds = match ? parseInt(match[1]) : 60;
        setMessage({ type: 'error', text: t('waitingArea.pleaseWait', { seconds }) });
      } else if (data.code === 'EMAIL_ALREADY_VERIFIED') {
        setMessage({ type: 'success', text: t('waitingArea.alreadyVerified') });
      } else {
        setMessage({ type: 'error', text: data.error || t('errors.default') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('auth.networkError') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('auth.resendVerificationTitle')}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            {t('auth.resendVerificationDesc')}
          </Text>

          <Input
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {message && (
            <View style={[
              styles.messageBox,
              { backgroundColor: message.type === 'success' ? theme.colors.success + '20' : theme.colors.error + '20' }
            ]}>
              <Text style={[
                styles.messageText,
                { color: message.type === 'success' ? theme.colors.success : theme.colors.error }
              ]}>
                {message.text}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? t('waitingArea.sending') : t('waitingArea.resendButton')}
              onPress={handleResend}
              loading={isLoading}
              fullWidth
            />
          </View>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Comfortaa_700Bold',
    flexShrink: 1,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Comfortaa_400Regular',
    marginBottom: 24,
    lineHeight: 22,
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Comfortaa_500Medium',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 24,
  },
});
