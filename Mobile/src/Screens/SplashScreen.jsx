import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

const SplashScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        // Parallel fade in & scale
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 0.9,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.4,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ),
        ]).start();

        const checkSessionAndNavigate = async () => {
            try {
                const sessionStr = await AsyncStorage.getItem('user_session');
                if (sessionStr) {
                    const userData = JSON.parse(sessionStr);
                    if (userData && (userData.id || userData.mobile)) {
                        dispatch({ type: 'SET_USER', payload: userData });
                        navigation.replace('Main');
                        return;
                    }
                }
            } catch (err) {
                console.error('Error restoring session:', err);
            }
            navigation.replace('Login');
        };

        const timer = setTimeout(() => {
            checkSessionAndNavigate();
        }, 2200);

        return () => clearTimeout(timer);
    }, [dispatch, navigation]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />
            
            {/* Ambient Lighting Orbs */}
            <View style={styles.ambientGlow1} />
            <View style={styles.ambientGlow2} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                
                {/* Glowing Infinity Badge */}
                <View style={styles.logoWrapper}>
                    <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
                    <Text style={styles.logoInfinity}>∞</Text>
                </View>

                {/* Brand Typography */}
                <Text style={styles.brandTitle}>INFINITY</Text>
                <Text style={styles.brandSubtitle}>GLOBAL CAPITAL</Text>

                <View style={styles.taglinePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.taglineText}>Institutional Trading & Wealth</Text>
                </View>
            </Animated.View>

            {/* Bottom Security Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>NSE · BSE · MCX Connected</Text>
                <Text style={styles.footerSub}>SEBI Regulated & Encrypted</Text>
            </View>
        </View>
    );
};

export default SplashScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    ambientGlow1: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#2563EB',
        opacity: 0.22,
    },
    ambientGlow2: {
        position: 'absolute',
        bottom: -60,
        right: -60,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#8B5CF6',
        opacity: 0.18,
    },
    content: {
        alignItems: 'center',
    },
    logoWrapper: {
        width: 110,
        height: 110,
        borderRadius: 36,
        backgroundColor: '#1E293B',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 26,
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    logoGlow: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 36,
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
    },
    logoInfinity: {
        fontSize: 68,
        fontWeight: '900',
        color: '#38BDF8',
        lineHeight: 74,
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 3,
        marginBottom: 4,
    },
    brandSubtitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#38BDF8',
        letterSpacing: 4,
        marginBottom: 20,
    },
    taglinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        gap: 8,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#10B981',
    },
    taglineText: {
        fontSize: 12,
        color: '#CBD5E1',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 44 : 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    footerSub: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    }
});
