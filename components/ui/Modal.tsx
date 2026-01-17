import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import {
    Dimensions,
    Modal as RNModal,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { Button } from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    variant?: 'default' | 'danger';
    children?: React.ReactNode;
    showCancel?: boolean;
}

export function Modal({
    visible,
    onClose,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    variant = 'default',
    children,
    showCancel = true,
}: ModalProps) {
    const { theme } = useTheme();
    const scale = useSharedValue(0.9);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = withTiming(0.9, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }
    }, [visible]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const animatedBackdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value * 0.5,
    }));

    return (
        <RNModal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    <Animated.View
                        style={[
                            styles.backdropOverlay,
                            { backgroundColor: '#000' },
                            animatedBackdropStyle,
                        ]}
                    />
                </View>
            </TouchableWithoutFeedback>

            <View style={styles.centeredView} pointerEvents="box-none">
                <TouchableWithoutFeedback>
                    <Animated.View
                        style={[
                            styles.modalView,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                            animatedContainerStyle,
                        ]}
                    >
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: variant === 'danger' ? theme.colors.error : theme.colors.text,
                                    fontFamily: 'Comfortaa_700Bold',
                                },
                            ]}
                        >
                            {title}
                        </Text>

                        {message && (
                            <Text
                                style={[
                                    styles.message,
                                    {
                                        color: theme.colors.textMuted,
                                        fontFamily: 'Comfortaa_400Regular',
                                    },
                                ]}
                            >
                                {message}
                            </Text>
                        )}

                        {children}

                        <View style={styles.buttonContainer}>
                            {showCancel && (
                                <Button
                                    title={cancelText}
                                    onPress={onClose}
                                    variant="ghost"
                                    style={styles.button}
                                />
                            )}
                            <Button
                                title={confirmText}
                                onPress={onConfirm || onClose}
                                variant={variant === 'danger' ? 'danger' : 'primary'}
                                style={styles.button}
                            />
                        </View>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </View>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalView: {
        width: Math.min(SCREEN_WIDTH - 48, 400),
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    button: {
        flex: 1,
    },
});
