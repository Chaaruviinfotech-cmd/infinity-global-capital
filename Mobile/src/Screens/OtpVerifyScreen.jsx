import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { verifyOtpAction, registerUserAction } from '../Services/Actions/postApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const OtpVerifyScreen = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const mobile = route.params?.mobile || '';
    const email = route.params?.email || '';
    
    const [otp, setOtp] = useState('');
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

    const handleVerifyOtp = async () => {
        if(otp.length < 4) {
            showAlert('error', 'Invalid OTP', 'Please enter the 4-digit code sent to your registered email.');
            return;
        }

        setLoading(true);
        try {
            const result = await dispatch(verifyOtpAction(mobile, otp, email));
            console.log("Verify OTP result:", result);

            setLoading(false);
            if (result && result.success) {
                showAlert(
                    'success',
                    'Registration Completed! ✓',
                    'Your email and mobile number have been verified successfully. Please log in with your credentials to enter your account.',
                    'Go to Login',
                    () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                );
            } else {
                showAlert('error', 'Verification Failed', result?.message || 'Invalid or expired OTP code.');
            }
        } catch (error) {
            setLoading(false);
            showAlert('error', 'Connection Error', error?.message || 'Network error. Please check your internet connection.');
            console.error("Verify OTP error:", error);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const res = await dispatch(registerUserAction(mobile, email));
            setLoading(false);
            if (res && res.success) {
                showAlert('success', 'OTP Dispatched', res.message || `A fresh OTP code has been dispatched to your email.`);
            } else {
                showAlert('error', 'Resend Failed', res?.message || 'Could not resend OTP. Please try again.');
            }
        } catch (err) {
            setLoading(false);
            showAlert('error', 'Connection Error', 'Failed to resend OTP. Please check your network connection.');
        }
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 12 
        : Math.max(insets.top, 16);

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />
            
            <Loader visible={loading} text="Authorizing Account..." overlay={true} />
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

            {/* Back Button */}
            <View style={styles.topNav}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Security Verification</Text>
                <View style={{width: 38}} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.contentWrapper}>
                
                {/* Security Shield Badge */}
                <View style={styles.shieldWrapper}>
                    <View style={styles.shieldCircle}>
                        <Ionicons name="shield-checkmark" size={32} color="#38BDF8" />
                    </View>
                </View>

                <Text style={styles.title}>Enter OTP Code</Text>
                <Text style={styles.subtitle}>
                    We've sent a 4-digit authentication code to{'\n'}
                    {email ? <Text style={styles.boldTarget}>{email}</Text> : <Text style={styles.boldTarget}>+91 {mobile}</Text>}
                </Text>

                {/* Input Card */}
                <View style={styles.card}>
                    <Text style={styles.inputLabel}>4-DIGIT VERIFICATION CODE</Text>
                    
                    <View style={styles.otpInputBox}>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="• • • •"
                            placeholderTextColor="#64748B"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={otp}
                            onChangeText={setOtp}
                            autoFocus
                        />
                    </View>

                    {/* Email Delivery Hint */}
                    <View style={styles.demoPill}>
                        <Ionicons name="mail-unread" size={15} color="#38BDF8" />
                        <Text style={styles.demoText}>Check your Email inbox or spam folder for your 4-digit code</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.verifyBtn} 
                        onPress={handleVerifyOtp} 
                        activeOpacity={0.85} 
                        disabled={loading}
                    >
                        <Text style={styles.verifyBtnText}>Verify & Proceed</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resendBtn} activeOpacity={0.7} onPress={handleResendOtp} disabled={loading}>
                        <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendTextBold}>Resend OTP</Text></Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </View>
    );
};

export default OtpVerifyScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 10,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 22,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    shieldWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    shieldCircle: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: '#1E293B',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 26,
    },
    boldTarget: {
        color: '#38BDF8',
        fontWeight: '800',
    },

    /* Card */
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 6,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.8,
        textAlign: 'center',
        marginBottom: 14,
    },
    otpInputBox: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#2563EB',
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    otpInput: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 16,
        width: '100%',
    },
    demoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.35)',
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
        marginBottom: 22,
    },
    demoText: {
        fontSize: 12,
        color: '#6EE7B7',
        fontWeight: '600',
    },
    verifyBtn: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    verifyBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    resendBtn: {
        alignItems: 'center',
        marginTop: 18,
    },
    resendText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    resendTextBold: {
        color: '#38BDF8',
        fontWeight: '800',
    }
});
