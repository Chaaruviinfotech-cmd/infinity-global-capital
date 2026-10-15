import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { submitKycAction } from '../Services/Actions/postApis';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const KycScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.action);
    const [formData, setFormData] = useState({ 
        full_name: user?.full_name || '', 
        pan_number: user?.pan_number || '', 
        dob: user?.dob || '', 
        account_no: user?.account_no || '', 
        ifsc_code: user?.ifsc_code || '' 
    });
    const [loading, setLoading] = useState(false);
    
    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };
    
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ type: 'info', title: '', message: '' });

    const showAlert = (type, title, message) => {
        setAlertConfig({ type, title, message });
        setAlertVisible(true);
    };

    const handleSubmit = async () => {
        if(!formData.full_name || !formData.pan_number || !formData.account_no) {
            showAlert('error', 'Incomplete', 'Please fill all mandatory fields.');
            return;
        }

        setLoading(true);
        try {
            const dataObj = {
                user_id: user?.id || 1,
                full_name: formData.full_name,
                pan_number: formData.pan_number,
                dob: formData.dob,
                account_no: formData.account_no,
                ifsc_code: formData.ifsc_code
            };

            const result = await dispatch(submitKycAction(dataObj));

            setLoading(false);
            if(result.success) {
                const updatedUser = {
                    ...user,
                    kyc_requested: 0,
                    kyc_status: 'Pending',
                    full_name: formData.full_name,
                    pan_number: formData.pan_number,
                    dob: formData.dob,
                    account_no: formData.account_no,
                    ifsc_code: formData.ifsc_code
                };
                dispatch({ type: 'SET_USER', payload: updatedUser });
                AsyncStorage.setItem('user_session', JSON.stringify(updatedUser)).catch(() => {});
                showAlert('success', 'Submitted', 'Your KYC details have been submitted for admin approval.');
            } else {
                showAlert('error', 'Failed', result.message);
            }
        } catch(e) {
            setLoading(false);
            showAlert('error', 'Error', 'Network connection failed. Please verify XAMPP is running.');
        }
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 10 
        : Math.max(insets.top, 14);

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            <Loader visible={loading} text="Transmitting Encrypted KYC..." overlay={true} />
            <Alert 
                visible={alertVisible} 
                type={alertConfig.type} 
                title={alertConfig.title} 
                message={alertConfig.message} 
                onClose={() => setAlertVisible(false)} 
                onConfirm={() => setAlertVisible(false)}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>KYC & Identity Verification</Text>
                        <Text style={styles.headerSub}>SEBI & PMLA Regulatory Compliance</Text>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
                
                {/* Security Compliance Banner */}
                <View style={styles.complianceBox}>
                    <Ionicons name="shield-checkmark" size={24} color="#38BDF8" />
                    <View style={{flex: 1, marginLeft: 12}}>
                        <Text style={styles.complianceTitle}>Mandatory Trading Verification</Text>
                        <Text style={styles.complianceText}>
                            Government regulation requires PAN & Bank account verification before equity orders can be placed.
                        </Text>
                    </View>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    <Text style={styles.cardHeader}>Personal & Tax Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>FULL NAME (AS PER PAN CARD) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. BIKRAM SAHU"
                            placeholderTextColor="#64748B"
                            value={formData.full_name}
                            onChangeText={(text) => setFormData({...formData, full_name: text})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PAN NUMBER *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ABCDE1234F"
                            placeholderTextColor="#64748B"
                            autoCapitalize="characters"
                            maxLength={10}
                            value={formData.pan_number}
                            onChangeText={(text) => setFormData({...formData, pan_number: text.toUpperCase()})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1995-08-15"
                            placeholderTextColor="#64748B"
                            value={formData.dob}
                            onChangeText={(text) => setFormData({...formData, dob: text})}
                        />
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.cardHeader}>Bank Settlement Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>BANK ACCOUNT NUMBER *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter bank account number"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            value={formData.account_no}
                            onChangeText={(text) => setFormData({...formData, account_no: text})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>BANK IFSC CODE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="HDFC0000123"
                            placeholderTextColor="#64748B"
                            autoCapitalize="characters"
                            maxLength={11}
                            value={formData.ifsc_code}
                            onChangeText={(text) => setFormData({...formData, ifsc_code: text.toUpperCase()})}
                        />
                    </View>

                    <TouchableOpacity 
                        style={styles.submitBtn} 
                        onPress={handleSubmit} 
                        activeOpacity={0.85}
                    >
                        <Ionicons name="lock-closed" size={17} color="#FFFFFF" style={{marginRight: 6}} />
                        <Text style={styles.submitBtnText}>Submit KYC for Approval</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
};

export default KycScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#1E293B',
        borderWidth: 1.5,
        borderColor: '#38BDF8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#38BDF8',
        fontWeight: '900',
        fontSize: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    headerSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
    },
    contentContainer: {
        paddingHorizontal: 18,
        paddingBottom: 40,
    },
    complianceBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    complianceTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#38BDF8',
        marginBottom: 2,
    },
    complianceText: {
        fontSize: 12,
        color: '#94A3B8',
        lineHeight: 17,
    },
    formCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 14,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 18,
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '800',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#FFFFFF',
        backgroundColor: '#0F172A',
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    }
});
