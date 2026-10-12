import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { registerUserAction } from '../Services/Actions/postApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const SignupScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const [mobile, setMobile] = useState(route?.params?.prefillMobile || '');
    const [email, setEmail] = useState(route?.params?.prefillEmail || '');
    const [loading, setLoading] = useState(false);
    
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

    const handleSignup = async () => {
        if(mobile.length < 10) {
            showAlert('error', 'Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
            return;
        }
        if(!email.includes('@')) {
            showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const result = await dispatch(registerUserAction(mobile, email));

            setLoading(false);
            if (result && result.success) {
                navigation.navigate('OtpVerify', { mobile: mobile, email: email, fromRegister: true });
            } else if (result && result.already_registered) {
                showAlert(
                    'info', 
                    'Already Registered', 
                    result.message || 'An account is already registered with this mobile/email. Please login directly.',
                    'Go to Login',
                    () => navigation.navigate('Login'),
                    'Cancel'
                );
            } else {
                showAlert('error', 'Registration Failed', result?.message || 'Unable to register account.');
            }
        } catch (error) {
            setLoading(false);
            showAlert('error', 'Connection Error', 'Network error. Please check your connection.');
            console.error(error);
        }
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 12 
        : Math.max(insets.top, 16);

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            <Loader visible={loading} text="Opening Trading Demat Account..." overlay={true} />
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
                
                {/* Header */}
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

                    <Text style={styles.welcomeText}>Open Free Demat</Text>
                    <Text style={styles.subWelcomeText}>Join thousands of smart investors in global markets.</Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    
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
                    </View>

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
                    </View>

                    <TouchableOpacity 
                        style={styles.signupBtn} 
                        onPress={handleSignup} 
                        activeOpacity={0.85} 
                        disabled={loading}
                    >
                        <Text style={styles.signupBtnText}>Proceed to OTP Verification</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginLinkBox} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                        <Text style={styles.loginText}>Already registered? <Text style={styles.loginTextBold}>Sign In</Text></Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </View>
    );
};

export default SignupScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A',
    },
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 22,
        justifyContent: 'center',
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
    card: {
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
    signupBtn: {
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
    signupBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    loginLinkBox: {
        alignItems: 'center',
        marginTop: 16,
    },
    loginText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    loginTextBold: {
        color: '#38BDF8',
        fontWeight: '800',
    }
});
