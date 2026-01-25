import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OTPModal } from '@/components/ui/OTPModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { exportService } from '@/services/export';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdvancedSettingsPage() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const router = useRouter();
    const { getRefreshToken, userEmail } = useAuth();

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false); // For specific button spinners

    // Modals
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<'csv'>('csv');

    // Error/Success Modal
    const [feedbackModal, setFeedbackModal] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null);

    // Change Email
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailOtpVisible, setEmailOtpVisible] = useState(false);

    // Delete Account
    const [deleteWarningVisible, setDeleteWarningVisible] = useState(false);
    const [deleteOtpVisible, setDeleteOtpVisible] = useState(false);

    // Fetch all data for export
    const { data: secrets } = useQuery({ queryKey: ['secrets'], queryFn: () => api.getSecrets(), enabled: false });
    const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes(), enabled: false });

    const performExport = async () => {
        setExportModalVisible(false);
        setLoading(true);
        try {
            // Force fetch fresh data
            const allSecrets = await api.getSecrets();
            const allNotes = await api.getNotes();

            // Currently only CSV is supported/enabled
            await exportService.exportToCSV(allSecrets, allNotes);

            setFeedbackModal({
                visible: true,
                title: t('common.success'),
                message: t('settings.exportSuccess'),
                type: 'success'
            });
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const initiateChangeEmail = async () => {
        if (!newEmail.includes('@')) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: t('errors.invalidEmail'),
                type: 'error'
            });
            return;
        }
        setActionLoading(true);
        try {
            await api.changeEmailRequest(newEmail, getRefreshToken() || '');
            setShowEmailInput(false);
            setEmailOtpVisible(true);
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const confirmChangeEmail = async (otp: string) => {
        setLoading(true);
        try {
            await api.changeEmailConfirm(otp, getRefreshToken() || '');
            setEmailOtpVisible(false);
            setFeedbackModal({
                visible: true,
                title: t('common.success'),
                message: t('auth.emailChanged'),
                type: 'success'
            });
            // Navigate after modal is closed
            setTimeout(() => router.replace('/(auth)/login'), 1500);
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const initiateDeleteAccount = async () => {
        setDeleteWarningVisible(false);
        setLoading(true);
        try {
            await api.deleteAccountRequest(getRefreshToken() || '');
            setDeleteOtpVisible(true);
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteAccount = async (otp: string) => {
        setLoading(true);
        try {
            await api.deleteAccountConfirm(otp, getRefreshToken() || '');
            setDeleteOtpVisible(false);
            // Logout and redirect
            router.replace('/(auth)/login');
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                title: t('common.error'),
                message: error.message || t('errors.default'),
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {t('settings.advanced')}
                </Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Data Management Section */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>{t('settings.dataManagement')}</Text>

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setExportModalVisible(true)}
                        disabled={loading}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name="download-outline" size={22} color={theme.colors.accent} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t('settings.exportData')}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.textMuted }]}>{t('settings.exportDataDesc')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Account Actions Section */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error, borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>{t('settings.dangerZone')}</Text>

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setShowEmailInput(true)}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.warning + '20' }]}>
                            <Ionicons name="mail-outline" size={22} color={theme.colors.warning} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t('auth.changeEmail')}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.textMuted }]}>{t('auth.changeEmailDesc')}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => setDeleteWarningVisible(true)}
                    >
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.error + '20' }]}>
                            <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.error }]}>{t('auth.deleteAccount')}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.textMuted }]}>{t('auth.deleteAccountDesc')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Export Format Modal */}
            <Modal
                visible={exportModalVisible}
                onClose={() => setExportModalVisible(false)}
                title={t('settings.exportFormat')}
                cancelText={t('common.cancel')}
                showCancel
                confirmText={t('settings.exportData')}
                onConfirm={performExport}
            >
                <View style={{ gap: 12, width: '100%' }}>
                    <Button
                        title={t('settings.exportFormatCSV')}
                        onPress={() => setSelectedFormat('csv')}
                        variant={selectedFormat === 'csv' ? 'primary' : 'outline'}
                        icon={<Ionicons name="grid-outline" size={18} color={selectedFormat === 'csv' ? '#fff' : theme.colors.accent} />}
                    />
                    <Text style={{ fontSize: 12, color: theme.colors.error, textAlign: 'center', marginTop: 16, marginBottom: 20 }}>
                        {t('settings.exportWarning')}
                    </Text>
                </View>
            </Modal>

            {/* Change Email Input Modal */}
            <Modal
                visible={showEmailInput}
                onClose={() => setShowEmailInput(false)}
                title={t('auth.changeEmail')}
                confirmText={t('common.next')}
                onConfirm={initiateChangeEmail}
                cancelText={t('common.cancel')}
                showCancel
                loading={actionLoading}
            >
                <View style={{ width: '100%' }}>
                    <Input
                        label={t('auth.newEmail')}
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder="new@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
            </Modal>

            {/* Delete Account Warning Modal */}
            <Modal
                visible={deleteWarningVisible}
                onClose={() => setDeleteWarningVisible(false)}
                title={t('auth.deleteAccount')}
                message={t('settings.deleteAccountWarning')}
                confirmText={t('common.delete')}
                onConfirm={initiateDeleteAccount}
                cancelText={t('common.cancel')}
                showCancel
                variant="danger"
                loading={loading}
            />

            {/* OTP Modals */}
            <OTPModal
                visible={emailOtpVisible}
                onClose={() => setEmailOtpVisible(false)}
                onConfirm={confirmChangeEmail}
                email={newEmail}
                loading={loading}
            />

            <OTPModal
                visible={deleteOtpVisible}
                onClose={() => setDeleteOtpVisible(false)}
                onConfirm={confirmDeleteAccount}
                email={userEmail || t('auth.emailPlaceholder')}
                loading={loading}
            />

            {loading && (
                <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
            )}

            {/* Feedback Modal for errors/success */}
            <Modal
                visible={!!feedbackModal?.visible}
                onClose={() => setFeedbackModal(null)}
                title={feedbackModal?.title || ''}
                message={feedbackModal?.message || ''}
                confirmText={t('common.ok')}
                onConfirm={() => setFeedbackModal(null)}
                variant={feedbackModal?.type === 'error' ? 'danger' : 'default'}
                showCancel={false}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Comfortaa_700Bold',
    },
    content: {
        padding: 20,
        gap: 20,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Comfortaa_700Bold',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontFamily: 'Comfortaa_500Medium',
        marginBottom: 2,
    },
    rowSubtitle: {
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
    },
    divider: {
        height: 1,
        marginVertical: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
