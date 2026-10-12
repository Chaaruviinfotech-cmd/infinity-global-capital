import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { loginUserAction } from '../Services/Actions/postApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const LoginScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ 
        type: 'info', 
        title: '', 
        message: '',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null 
    });

    const showAlert = (type, title, message, confirmText = 'OK', onConfirm = null, cancelText = null) => {
        setAlertConfig({ type, title, message, confirmText, onConfirm, cancelText });
        setAlertVisible(true);
    };

    const handleLogin = async () => {
        if(mobile.length < 10) {
            showAlert('error', 'Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
            return;
        }

        if(!email || !email.includes('@')) {
            showAlert('error', 'Invalid Email', 'Please enter your registered email address.');
            return;
        }

        setLoading(true);
        try {
            const result = await dispatch(loginUserAction(mobile, email));
            console.log("Login result:", result);
            
            setLoading(false);
            if (result && result.success) {
                // DIRECT LOGIN: No OTP, navigate straight to Main Dashboard!
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                });
            } else if (result && result.not_registered) {
                // NOT MATCHED: Prompt user to register and navigate to Signup screen
                showAlert(
                    'warning',
                    'Account Not Found',
                    result.message || 'No account found matching this Mobile and Email. Please register your account to continue.',
                    'Register Now',
                    () => navigation.navigate('Signup', { prefillMobile: mobile, prefillEmail: email }),
                    'Cancel'
                );
            } else {
                showAlert('error', 'Login Failed', result?.message || 'Invalid mobile number or email.');
            }
        } catch (error) {
            setLoading(false);
            showAlert('error', 'Connection Error', error?.message || 'Network error. Please check your connection.');
            console.error("Login error:", error);
        }
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 12 
        : Math.max(insets.top, 16);

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />
            
            <Loader visible={loading} text="Verifying Account..." overlay={true} />
            <Alert 
                visible={alertVisible} 
                type={alertConfig.type} 
                title={alertConfig.title} 
                message={alertConfig.message} 
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                onConfirm={alertConfig.onConfirm}
                onCancel={() => setAlertVisible(false)}
                onClose={() => setAlertVisible(false)} 
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.contentWrapper}>
                
                {/* Market Live Pill */}
                <View style={styles.marketPill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.marketPillText}>Live Exchange · NSE & BSE Connected</Text>
                </View>

                {/* Brand Header */}
                <View style={styles.topSection}>
                    <View style={styles.brandRow}>
                        <View style={styles.logoBadge}>
                            <Text style={styles.logoInfinity}>∞</Text>
                        </View>
                        <View>
                            <Text style={styles.brandTitle}>INFINITY</Text>
                            <Text style={styles.brandSubtitle}>GLOBAL CAPITAL</Text>
                        </View>
                    </View>

                    <Text style={styles.welcomeText}>Welcome Back</Text>
                    <Text style={styles.subWelcomeText}>Sign in with your registered mobile & email.</Text>
                </View>

                {/* Input Card */}
                <View style={styles.inputCard}>
                    
                    {/* 1. Mobile Input */}
                    <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                    <View style={styles.inputRow}>
                        <View style={styles.countryCodeBox}>
                            <Text style={styles.flag}>🇮🇳</Text>
                            <Text style={styles.countryCode}>+91</Text>
                        </View>
                        
                        <TextInput
                            style={styles.textInput}
                            placeholder="10 digit mobile"
                            placeholderTextColor="#64748B"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={mobile}
                            onChangeText={setMobile}
                        />

                        {mobile.length === 10 && (
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{marginRight: 12}} />
                        )}
                    </View>

                    {/* 2. Email Input */}
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>EMAIL ADDRESS</Text>
                    <View style={styles.inputRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="mail" size={18} color="#94A3B8" />
                        </View>
                        
                        <TextInput
                            style={styles.textInput}
                            placeholder="name@example.com"
                            placeholderTextColor="#64748B"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />

                        {email.includes('@') && (
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{marginRight: 12}} />
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={styles.loginBtn} 
                        onPress={handleLogin} 
                        activeOpacity={0.85} 
                        disabled={loading}
                    >
                        <Text style={styles.loginBtnText}>Sign In to Account</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.signupLinkBox} onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
                        <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupTextBold}>Register</Text></Text>
                    </TouchableOpacity>
                </View>

                {/* Trust Badges */}
                <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                        <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                        <Text style={styles.trustText}>256-Bit SSL</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <Ionicons name="flash" size={14} color="#F59E0B" />
                        <Text style={styles.trustText}>Instant Access</Text>
                    </View>
                    <View style={styles.trustDivider} />
                    <View style={styles.trustItem}>
                        <Ionicons name="checkmark-done" size={14} color="#10B981" />
                        <Text style={styles.trustText}>SEBI Compliant</Text>
                    </View>
                </View>

            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
    },
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 22,
        justifyContent: 'center',
    },
    marketPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.35)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 20,
        gap: 6,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#34D399',
    },
    marketPillText: {
        color: '#6EE7B7',
        fontSize: 12,
        fontWeight: '700',
    },
    topSection: {
        marginBottom: 24,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    logoBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#1E293B',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoInfinity: {
        fontSize: 26,
        fontWeight: '900',
        color: '#38BDF8',
    },
    brandTitle: {
        fontSize: 21,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    brandSubtitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#38BDF8',
        letterSpacing: 1.5,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    subWelcomeText: {
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: 20,
    },

    /* Input Card */
    inputCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 6,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.3)',
        overflow: 'hidden',
    },
    countryCodeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: '#334155',
        gap: 6,
    },
    iconBox: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: '#334155',
    },
    flag: {
        fontSize: 15,
    },
    countryCode: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    textInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loginBtn: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginTop: 20,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    loginBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    signupLinkBox: {
        alignItems: 'center',
        marginTop: 16,
    },
    signupText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    signupTextBold: {
        color: '#38BDF8',
        fontWeight: '800',
    },

    /* Trust Row */
    trustRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 26,
        gap: 14,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    trustText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    trustDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#334155',
    }
});
