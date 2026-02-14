import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

interface OTPModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (otp: string) => void;
    email: string;
    loading?: boolean;
}

export function OTPModal({ visible, onClose, onConfirm, email, loading }: OTPModalProps) {
    const { t } = useTranslation();
    const [otp, setOtp] = useState('');

    const handleConfirm = () => {
        if (otp.length === 6) {
            onConfirm(otp);
            setOtp(''); // Clear on confirm
        }
    };

    return (
        <Modal
            visible={visible}
            onClose={onClose}
            title={t('auth.enterOTP')}
            message={t('auth.otpSentTo', { email })}
            confirmText={t('common.verify')}
            cancelText={t('common.cancel')}
            onConfirm={handleConfirm}
            showCancel
            variant="default"
            loading={loading}
        >
            <View style={{ width: '100%' }}>
                <Input
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    inputStyle={{ textAlign: 'center', letterSpacing: 8, fontSize: 24, fontFamily: 'Comfortaa_700Bold' }}
                />
            </View>
        </Modal>
    );
}
