import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OTPModal } from '@/components/ui/OTPModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { exportService } from '@/services/export';
import { DEBOUNCE_STEP_MS, MAX_DEBOUNCE_MS, MIN_DEBOUNCE_MS, usePreferencesStore } from '@/stores/preferences';
import { Ionicons } from '@expo/vector-icons';
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
    const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('json');
    const autoSaveDebounceMs = usePreferencesStore((state) => state.autoSaveDebounceMs);
    const historyDebounceMs = usePreferencesStore((state) => state.historyDebounceMs);
    const setAutoSaveDebounceMs = usePreferencesStore((state) => state.setAutoSaveDebounceMs);
    const setHistoryDebounceMs = usePreferencesStore((state) => state.setHistoryDebounceMs);

    // Error/Success Modal
    const [feedbackModal, setFeedbackModal] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success' | 'info' } | null>(null);

    // Change Email
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailOtpVisible, setEmailOtpVisible] = useState(false);

    // Delete Account
    const [deleteWarningVisible, setDeleteWarningVisible] = useState(false);
    const [deleteOtpVisible, setDeleteOtpVisible] = useState(false);

    const performExport = async () => {
        setExportModalVisible(false);
        setLoading(true);
        try {
            // Force fetch fresh data
            const allSecrets = await api.getSecrets();
            const allNotes = await api.getNotes();

            if (selectedFormat === 'json') {
                await exportService.exportToJSON(allSecrets, allNotes);
            } else {
                await exportService.exportToCSV(allSecrets, allNotes);
            }

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

    const updateDebounce = (
        current: number,
        delta: number,
        setter: (value: number) => void
    ) => {
        const next = Math.min(MAX_DEBOUNCE_MS, Math.max(MIN_DEBOUNCE_MS, current + delta));
        setter(next);
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

                {/* Editor Settings Section */}
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>{t('settings.editorBehavior')}</Text>

                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name="save-outline" size={22} color={theme.colors.accent} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t('settings.autoSaveDebounce')}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.textMuted }]}>
                                {`${autoSaveDebounceMs} ${t('settings.millisecondsShort')}`}
                            </Text>
                        </View>
                        <View style={styles.stepperControls}>
                            <TouchableOpacity
                                style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceElevated }]}
                                onPress={() => updateDebounce(autoSaveDebounceMs, -DEBOUNCE_STEP_MS, setAutoSaveDebounceMs)}
                                disabled={autoSaveDebounceMs <= MIN_DEBOUNCE_MS}
                            >
                                <Ionicons name="remove" size={18} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceElevated }]}
                                onPress={() => updateDebounce(autoSaveDebounceMs, DEBOUNCE_STEP_MS, setAutoSaveDebounceMs)}
                                disabled={autoSaveDebounceMs >= MAX_DEBOUNCE_MS}
                            >
                                <Ionicons name="add" size={18} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.accent + '20' }]}>
                            <Ionicons name="arrow-undo-outline" size={22} color={theme.colors.accent} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{t('settings.undoRedoDebounce')}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.textMuted }]}>
                                {`${historyDebounceMs} ${t('settings.millisecondsShort')}`}
                            </Text>
                        </View>
                        <View style={styles.stepperControls}>
                            <TouchableOpacity
                                style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceElevated }]}
                                onPress={() => updateDebounce(historyDebounceMs, -DEBOUNCE_STEP_MS, setHistoryDebounceMs)}
                                disabled={historyDebounceMs <= MIN_DEBOUNCE_MS}
                            >
                                <Ionicons name="remove" size={18} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceElevated }]}
                                onPress={() => updateDebounce(historyDebounceMs, DEBOUNCE_STEP_MS, setHistoryDebounceMs)}
                                disabled={historyDebounceMs >= MAX_DEBOUNCE_MS}
                            >
                                <Ionicons name="add" size={18} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
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
                        title={t('settings.exportFormatJSON')}
                        onPress={() => setSelectedFormat('json')}
                        variant={selectedFormat === 'json' ? 'primary' : 'outline'}
                        icon={<Ionicons name="code-outline" size={18} color={selectedFormat === 'json' ? '#fff' : theme.colors.accent} />}
                    />
                    <Button
                        title={t('settings.exportFormatCSV')}
                        onPress={() => setSelectedFormat('csv')}
                        variant={selectedFormat === 'csv' ? 'primary' : 'outline'}
                        icon={<Ionicons name="grid-outline" size={18} color={selectedFormat === 'csv' ? '#fff' : theme.colors.accent} />}
                    />
                    <Text style={{ fontSize: 12, color: selectedFormat === 'csv' ? theme.colors.error : theme.colors.textMuted, textAlign: 'center', marginTop: 16, marginBottom: 20 }}>
                        {selectedFormat === 'csv' ? t('settings.exportWarning') : t('settings.exportJSONInfo')}
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
            >
                <View style={{ gap: 16, marginTop: 12, marginBottom: 24, width: '100%' }}>
                    <View style={{ backgroundColor: theme.colors.warning + '15', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: theme.colors.warning }}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
                            <Text style={{ fontSize: 14, fontFamily: 'Comfortaa_700Bold', color: theme.colors.warning }}>{t('common.important')}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontFamily: 'Comfortaa_500Medium', color: theme.colors.text, lineHeight: 18 }}>
                            {t('settings.exportBeforeDelete')}
                        </Text>
                    </View>

                    <Button
                        title={t('settings.exportButtonShort')}
                        onPress={performExport}
                        variant="primary"
                        icon={<Ionicons name="download-outline" size={18} color="#fff" />}
                    />
                </View>
            </Modal>

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
    stepperControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepperButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
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
