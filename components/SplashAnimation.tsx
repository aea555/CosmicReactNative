import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashAnimationProps {
    onAnimationComplete?: () => void;
}

export function SplashAnimation({ onAnimationComplete }: SplashAnimationProps) {
    const ripple1 = useSharedValue(0);
    const ripple2 = useSharedValue(0);
    const ripple3 = useSharedValue(0);
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);

    useEffect(() => {
        // Logo fade in and scale
        logoOpacity.value = withTiming(1, { duration: 500 });
        logoScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });

        // Ripple animations with staggered delays
        ripple1.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );

        ripple2.value = withDelay(
            500,
            withRepeat(
                withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
                -1,
                false
            )
        );

        ripple3.value = withDelay(
            1000,
            withRepeat(
                withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
                -1,
                false
            )
        );

        // Complete after 2 seconds
        const timeout = setTimeout(() => {
            onAnimationComplete?.();
        }, 2000);

        return () => clearTimeout(timeout);
    }, []);

    const createRippleStyle = (progress: SharedValue<number>) =>
        useAnimatedStyle(() => ({
            transform: [
                { scale: interpolate(progress.value, [0, 1], [1, 4]) },
            ],
            opacity: interpolate(progress.value, [0, 0.2, 1], [0.6, 0.3, 0]),
        }));

    const ripple1Style = createRippleStyle(ripple1);
    const ripple2Style = createRippleStyle(ripple2);
    const ripple3Style = createRippleStyle(ripple3);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: logoOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e3a5f', '#2d1b4e', '#1a1a2e']}
                locations={[0, 0.3, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle cosmic overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(124, 58, 237, 0.1)', 'rgba(14, 165, 233, 0.05)', 'transparent']}
                locations={[0, 0.4, 0.7, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.rippleContainer}>
                {/* Ripple rings */}
                <Animated.View style={[styles.ripple, ripple1Style, { borderColor: 'rgba(124, 58, 237, 0.4)' }]} />
                <Animated.View style={[styles.ripple, ripple2Style, { borderColor: 'rgba(14, 165, 233, 0.3)' }]} />
                <Animated.View style={[styles.ripple, ripple3Style, { borderColor: 'rgba(219, 39, 119, 0.25)' }]} />

                {/* Logo */}
                <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>C</Text>
                    </View>
                </Animated.View>
            </View>

            <Animated.Text style={[styles.brandText, logoAnimatedStyle]}>
                Cosmic
            </Animated.Text>
        </View>
    );
}

const RIPPLE_SIZE = 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rippleContainer: {
        width: RIPPLE_SIZE,
        height: RIPPLE_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ripple: {
        position: 'absolute',
        width: RIPPLE_SIZE,
        height: RIPPLE_SIZE,
        borderRadius: RIPPLE_SIZE / 2,
        borderWidth: 2,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(124, 58, 237, 0.5)',
    },
    logoText: {
        fontSize: 42,
        fontFamily: 'ProstoOne_400Regular',
        color: '#fff',
        textShadowColor: 'rgba(124, 58, 237, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    brandText: {
        marginTop: 32,
        fontSize: 36,
        fontFamily: 'ProstoOne_400Regular',
        color: '#fff',
        textShadowColor: 'rgba(124, 58, 237, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
});
