import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LandingPage() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const glowOpacity = useSharedValue(0.3);

    React.useEffect(() => {
        glowOpacity.value = withRepeat(
            withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Cosmic background effect */}
            <LinearGradient
                colors={[
                    'rgba(124, 58, 237, 0.15)',
                    'transparent',
                    'rgba(14, 165, 233, 0.1)',
                ]}
                locations={[0, 0.5, 1]}
                style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
            />

            <View style={styles.content}>
                {/* Logo Section */}
                <View style={styles.logoSection}>
                    <View style={styles.logoWrapper}>
                        <Animated.View style={[styles.logoGlow, glowStyle]} />
                        <View style={[styles.logoCircle, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.logoText, { color: theme.colors.accent }]}>C</Text>
                        </View>
                    </View>
                    <Text style={[styles.brandName, { color: theme.colors.text }]}>
                        {t('landing.brandName')}
                    </Text>
                    <Text style={[styles.tagline, { color: theme.colors.textMuted }]}>
                        {t('landing.tagline')}
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    {[
                        { icon: '🔐', text: t('landing.feature1') },
                        { icon: '🔑', text: t('landing.feature2') },
                        { icon: '📝', text: t('landing.feature3') },
                    ].map((feature, index) => (
                        <View key={index} style={[styles.featureItem, { backgroundColor: theme.colors.surface }]}>
                            <Text style={styles.featureIcon}>{feature.icon}</Text>
                            <Text style={[styles.featureText, { color: theme.colors.textMuted }]}>
                                {feature.text}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Link href="/(auth)/login" asChild>
                        <Button
                            title={t('auth.signIn')}
                            onPress={() => { }}
                            variant="primary"
                            size="lg"
                            fullWidth
                        />
                    </Link>

                    <Link href="/(auth)/register" asChild>
                        <Button
                            title={t('auth.createAccount')}
                            onPress={() => { }}
                            variant="outline"
                            size="lg"
                            fullWidth
                            style={{ marginTop: 12 }}
                        />
                    </Link>
                </View>
            </View>

            {/* Footer */}
            <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
                {t('landing.footer')}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoWrapper: {
        position: 'relative',
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#7c3aed',
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(124, 58, 237, 0.5)',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    logoText: {
        fontSize: 52,
        fontFamily: 'ProstoOne_400Regular',
    },
    brandName: {
        fontSize: 42,
        fontFamily: 'ProstoOne_400Regular',
        marginTop: 20,
    },
    tagline: {
        fontSize: 16,
        fontFamily: 'Comfortaa_400Regular',
        marginTop: 8,
    },
    features: {
        gap: 12,
        marginBottom: 48,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 14,
    },
    featureIcon: {
        fontSize: 24,
    },
    featureText: {
        fontSize: 15,
        fontFamily: 'Comfortaa_500Medium',
    },
    actions: {
        marginBottom: 24,
    },
    footer: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Comfortaa_400Regular',
    },
});
