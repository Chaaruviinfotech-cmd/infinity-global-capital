import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';

const ProfileScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, fundsData } = useSelector(state => state.action);

    const [isHindi, setIsHindi] = useState(false);
    const [twoFactorAuth, setTwoFactorAuth] = useState(true);

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('user_session');
        } catch (e) {
            console.error('Error clearing session on logout:', e);
        }
        dispatch({ type: 'SET_USER', payload: null });
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 10 
        : Math.max(insets.top, 14);

    const mobileNum = user?.mobile || 'Not Available';
    const emailAddr = user?.email || 'No Email Registered';
    const margin = fundsData?.available_margin !== undefined ? fundsData.available_margin : 0;
    const displayName = user?.full_name || 'Valued Investor';

    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const isApproved = user?.kyc_status === 'Approved' || user?.is_kyc_verified == 1;
    const isPending = user?.kyc_status === 'Pending';
    const isRejected = user?.kyc_status === 'Rejected';

    const bankTitle = user?.ifsc_code ? `${user.ifsc_code.substring(0, 4)} Bank` : 'Settlement Bank';
    const bankSubtitle = user?.account_no 
        ? `${bankTitle} •••• ${String(user.account_no).slice(-4)}`
        : 'Not Linked (Submit in KYC)';

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Profile Card Header */}
                <View style={styles.profileHeaderCard}>
                    <View style={styles.avatarBorder}>
                        <View style={styles.avatarInside}>
                            <Text style={styles.avatarText}>
                                {getInitials(displayName)}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.userName}>{displayName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
                        <Text style={styles.uidBadge}>
                            #UID-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                        </Text>
                    </View>
                    <Text style={styles.userPhone}>+91 {mobileNum}</Text>
                    <Text style={styles.userEmail}>{emailAddr}</Text>

                    <View style={[
                        styles.kycStatusBadge,
                        { borderColor: isApproved ? 'rgba(52, 211, 153, 0.4)' : isPending ? 'rgba(251, 191, 36, 0.4)' : 'rgba(248, 113, 113, 0.4)' }
                    ]}>
                        <Ionicons 
                            name={isApproved ? "shield-checkmark" : isPending ? "time" : "alert-circle"} 
                            size={14} 
                            color={isApproved ? "#34D399" : isPending ? "#FBBF24" : "#F87171"} 
                        />
                        <Text style={[
                            styles.kycStatusText,
                            { color: isApproved ? "#34D399" : isPending ? "#FBBF24" : "#F87171" }
                        ]}>
                            {isApproved 
                                ? 'KYC VERIFIED · DEMAT ACTIVE' 
                                : isPending 
                                ? 'KYC UNDER REVIEW · PENDING' 
                                : isRejected 
                                ? 'KYC REJECTED · RESUBMIT' 
                                : 'KYC NOT SUBMITTED'}
                        </Text>
                    </View>
                </View>

                {/* Account Mini Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>USER ID</Text>
                        <Text style={styles.statVal}>
                            UID-{user?.id ? String(user.id).padStart(4, '0') : '0001'}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>TRADING MARGIN</Text>
                        <Text style={styles.statValGreen}>₹{Number(margin).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>SEGMENT</Text>
                        <Text style={styles.statValBlue}>NSE / BSE</Text>
                    </View>
                </View>

                {/* Section 1: Account Settings */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeaderTitle}>Account & Banking</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                                <Ionicons name="person-circle" size={20} color="#38BDF8" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>Account Type</Text>
                                <Text style={styles.rowSub}>Resident Individual Demat</Text>
                            </View>
                        </View>
                        <Text style={styles.rowValueHighlight}>PREMIUM</Text>
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                <Ionicons name="card" size={20} color="#34D399" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>Linked Bank Account</Text>
                                <Text style={styles.rowSub}>{bankSubtitle}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748B" />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                                <Ionicons name="document-text" size={20} color="#38BDF8" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>PAN Card</Text>
                                <Text style={styles.rowSub}>{user?.pan_number ? user.pan_number : 'Not Linked'}</Text>
                            </View>
                        </View>
                        <Text style={[styles.rowValueHighlight, { color: user?.pan_number ? '#34D399' : '#FBBF24' }]}>
                            {user?.pan_number ? 'VERIFIED' : 'PENDING'}
                        </Text>
                    </View>

                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                                <Ionicons name="finger-print" size={20} color="#A78BFA" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>2-Factor Authentication</Text>
                                <Text style={styles.rowSub}>Biometric / OTP Verification</Text>
                            </View>
                        </View>
                        <Switch
                            value={twoFactorAuth}
                            onValueChange={setTwoFactorAuth}
                            trackColor={{ false: '#334155', true: '#2563EB' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Section 2: Preferences */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeaderTitle}>Preferences & System</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                <Ionicons name="language" size={20} color="#FBBF24" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>App Language</Text>
                                <Text style={styles.rowSub}>{isHindi ? 'हिंदी सक्रिय है' : 'English (India)'}</Text>
                            </View>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                            <Text style={styles.langText}>{isHindi ? 'हिंदी' : 'EN'}</Text>
                            <Switch
                                value={isHindi}
                                onValueChange={setIsHindi}
                                trackColor={{ false: '#334155', true: '#10B981' }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    </View>

                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                                <Ionicons name="document-text" size={20} color="#F472B6" />
                            </View>
                            <View>
                                <Text style={styles.rowTitle}>Terms & Policies</Text>
                                <Text style={styles.rowSub}>SEBI Rules & Privacy Policy</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748B" />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Ionicons name="log-out" size={20} color="#F87171" />
                    <Text style={styles.logoutBtnText}>{isHindi ? 'सुरक्षित लॉग आउट' : 'Sign Out Securely'}</Text>
                </TouchableOpacity>

                <View style={styles.appVersionBox}>
                    <Text style={styles.versionText}>Infinity Global Capital v2.4.0</Text>
                    <Text style={styles.versionSub}>Encrypted Session • NSE/BSE Registered</Text>
                </View>

            </ScrollView>
        </View>
    );
};

export default ProfileScreen;

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
        paddingBottom: 14,
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
        fontSize: 17,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    scrollContent: {
        paddingBottom: 40,
    },

    /* Profile Header Card */
    profileHeaderCard: {
        backgroundColor: '#0F172A',
        marginHorizontal: 18,
        borderRadius: 22,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
    },
    avatarBorder: {
        width: 80,
        height: 80,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#38BDF8',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    avatarInside: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#38BDF8',
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    uidBadge: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '800',
        color: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.35)',
        overflow: 'hidden',
    },
    userPhone: {
        fontSize: 14,
        color: '#CBD5E1',
        fontWeight: '700',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 14,
    },
    kycStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.35)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    kycStatusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#34D399',
        letterSpacing: 0.5,
    },

    /* Mini Stats Card */
    statsCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        marginHorizontal: 18,
        marginTop: 14,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    statVal: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    statValGreen: {
        fontSize: 14,
        fontWeight: '900',
        color: '#34D399',
    },
    statValBlue: {
        fontSize: 14,
        fontWeight: '900',
        color: '#38BDF8',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignSelf: 'center',
    },

    /* Settings Sections */
    sectionCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        marginHorizontal: 18,
        marginTop: 16,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    sectionHeaderTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    rowSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 1,
    },
    rowValueHighlight: {
        fontSize: 11,
        fontWeight: '900',
        color: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    langText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#34D399',
    },

    /* Logout */
    logoutBtn: {
        flexDirection: 'row',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(248, 113, 113, 0.35)',
        marginHorizontal: 18,
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    logoutBtnText: {
        color: '#F87171',
        fontSize: 15,
        fontWeight: '800',
    },
    appVersionBox: {
        alignItems: 'center',
        marginTop: 22,
    },
    versionText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
    },
    versionSub: {
        fontSize: 11,
        color: '#475569',
        marginTop: 2,
    }
});
