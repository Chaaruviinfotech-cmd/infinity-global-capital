import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFundsAction } from '../Services/Actions/getApis';
import { manageFundsAction, sendStatementAction } from '../Services/Actions/postApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const FundsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, fundsData } = useSelector(state => state.action);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [sendingStatement, setSendingStatement] = useState(false);
    
    // User typed amount
    const [amountInput, setAmountInput] = useState('');
    
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ type: 'info', title: '', message: '' });

    const showAlert = (type, title, message) => {
        setAlertConfig({ type, title, message });
        setAlertVisible(true);
    };

    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const handleEmailStatement = async () => {
        setSendingStatement(true);
        try {
            const userId = user?.id || 1;
            const targetEmail = user?.email || '';
            const res = await dispatch(sendStatementAction(userId, targetEmail));
            setSendingStatement(false);
            if (res.success) {
                showAlert('success', 'Passbook Dispatched', `Your official bank statement & transaction passbook has been sent to:\n\n${res.email || targetEmail || 'your registered email'}`);
            } else {
                showAlert('error', 'Request Failed', res.message || 'Unable to email statement.');
            }
        } catch(e) {
            setSendingStatement(false);
            showAlert('error', 'Connection Error', 'Could not dispatch statement email. Please try again.');
        }
    };

    useEffect(() => {
        fetchFunds();
    }, []);

    const fetchFunds = async () => {
        try {
            const userId = user?.id || 1;
            await dispatch(fetchFundsAction(userId));
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async (type) => {
        const numAmount = parseFloat(amountInput);

        if (isNaN(numAmount) || numAmount <= 0) {
            showAlert('warning', 'Invalid Amount', 'Please enter a valid amount greater than ₹0.');
            return;
        }

        const currentBalance = fundsData?.available_margin || 0;

        if (type === 'Withdrawal' && numAmount > currentBalance) {
            showAlert('error', 'Insufficient Funds', `You cannot withdraw more than your available margin (₹${currentBalance.toLocaleString('en-IN')}).`);
            return;
        }

        setActionLoading(true);
        try {
            const userId = user?.id || 1;
            const result = await dispatch(manageFundsAction(userId, numAmount, type));
            
            setActionLoading(false);
            if(result.success) {
                setAmountInput(''); // clear input
                showAlert('success', 'Transaction Settled', `₹${numAmount.toLocaleString('en-IN')} has been ${type === 'Deposit' ? 'credited to' : 'debited from'} your trading ledger.\n\nAn official transaction slip receipt has been sent to your registered email.`);
                fetchFunds(); // Refresh data
            } else {
                showAlert('error', 'Transaction Failed', result.message);
            }
        } catch(e) {
            setActionLoading(false);
            showAlert('error', 'Connection Error', 'Network connection failed. Please ensure XAMPP is running.');
        }
    };

    const handleQuickAdd = (addVal) => {
        const current = parseFloat(amountInput) || 0;
        setAmountInput((current + addVal).toString());
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 10 
        : Math.max(insets.top, 14);

    if (loading || !fundsData) {
        return (
            <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                <Loader visible={true} text="Accessing Banking Ledger..." overlay={true} />
            </View>
        );
    }

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            <Loader visible={actionLoading || sendingStatement} text={sendingStatement ? "Dispatching Official Statement..." : "Processing Settlement..."} overlay={true} />
            <Alert 
                visible={alertVisible} 
                type={alertConfig.type} 
                title={alertConfig.title} 
                message={alertConfig.message} 
                onClose={() => setAlertVisible(false)} 
                onConfirm={() => setAlertVisible(false)}
            />
            
            {/* Top Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Trading Funds & Ledger</Text>
                        <Text style={styles.headerSubtitle}>Bank Connected · Instant Settlement</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchFunds}>
                    <Ionicons name="refresh" size={19} color="#38BDF8" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Hero Margin Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroGlowCircle} />
                    <View style={styles.heroTopRow}>
                        <View style={styles.walletBadge}>
                            <Ionicons name="wallet-outline" size={16} color="#38BDF8" />
                            <Text style={styles.walletBadgeText}>Available Cash Margin</Text>
                        </View>
                        <View style={styles.statusLive}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>Ready to Trade</Text>
                        </View>
                    </View>

                    <Text style={styles.balanceValue}>
                        ₹{fundsData.available_margin.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </Text>
                    <Text style={styles.balanceHint}>Usable for Equity, Intraday & Option margins</Text>
                </View>

                {/* Amount Input & Actions Card */}
                <View style={styles.inputCard}>
                    <Text style={styles.inputCardTitle}>Add / Withdraw Funds</Text>
                    <Text style={styles.inputCardSub}>Type amount to credit or debit your account</Text>

                    {/* Numeric Input */}
                    <View style={styles.amountInputRow}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            value={amountInput}
                            onChangeText={setAmountInput}
                        />
                        {amountInput.length > 0 && (
                            <TouchableOpacity onPress={() => setAmountInput('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Quick Amount Suggestion Chips */}
                    <View style={styles.chipsRow}>
                        {[500, 1000, 5000, 10000].map((val) => (
                            <TouchableOpacity 
                                key={val} 
                                style={styles.chip}
                                onPress={() => handleQuickAdd(val)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.chipText}>+₹{val >= 1000 ? `${val/1000}k` : val}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionBtnRow}>
                        <TouchableOpacity 
                            style={styles.depositBtn} 
                            activeOpacity={0.85} 
                            onPress={() => handleTransaction('Deposit')}
                        >
                            <Ionicons name="arrow-down-circle" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                            <Text style={styles.depositBtnText}>ADD FUNDS (CR)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.withdrawBtn} 
                            activeOpacity={0.85} 
                            onPress={() => handleTransaction('Withdrawal')}
                        >
                            <Ionicons name="arrow-up-circle" size={18} color="#F87171" style={{marginRight: 6}} />
                            <Text style={styles.withdrawBtnText}>WITHDRAW (DR)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bank Statement Section Header */}
                <View style={styles.sectionHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Ionicons name="journal-outline" size={18} color="#38BDF8" />
                        <Text style={styles.sectionTitle}>Bank Statement & Passbook</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.emailStmtBtn} 
                        onPress={handleEmailStatement} 
                        activeOpacity={0.8}
                    >
                        <Ionicons name="mail" size={13} color="#38BDF8" style={{marginRight: 4}} />
                        <Text style={styles.emailStmtBtnText}>Email Statement</Text>
                    </TouchableOpacity>
                </View>

                {/* Bank Passbook Rows */}
                <View style={styles.passbookContainer}>
                    {fundsData.history.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="receipt-outline" size={40} color="#334155" />
                            <Text style={styles.emptyText}>No transaction records found</Text>
                            <Text style={styles.emptySubText}>Deposits and payouts will be stamped here</Text>
                        </View>
                    ) : (
                        fundsData.history.map((tx, index) => {
                            const isDeposit = (tx.type === 'Deposit');
                            const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            const refNo = tx.txn_id ? tx.txn_id : `UTR${new Date(tx.created_at).getTime().toString().slice(-8)}`;

                            return (
                                <View key={index} style={styles.passbookRow}>
                                    
                                    {/* Left: Stamp & Details */}
                                    <View style={styles.passbookLeft}>
                                        <View style={isDeposit ? styles.crBadge : styles.drBadge}>
                                            <Text style={isDeposit ? styles.crBadgeText : styles.drBadgeText}>
                                                {isDeposit ? 'CR' : 'DR'}
                                            </Text>
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.passbookTitle}>
                                                {isDeposit ? 'Bank Deposit (UPI/IMPS)' : 'Bank Payout (IMPS)'}
                                            </Text>
                                            <Text style={styles.passbookUtr}>Ref: {refNo}</Text>
                                            <Text style={styles.passbookDate}>{dateStr}</Text>
                                        </View>
                                    </View>

                                    {/* Right: Amount & Status */}
                                    <View style={styles.passbookRight}>
                                        <Text style={isDeposit ? styles.amountCr : styles.amountDr}>
                                            {isDeposit ? '+' : '-'}₹{parseFloat(tx.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </Text>
                                        <View style={styles.settledPill}>
                                            <Ionicons name="checkmark-done" size={11} color="#34D399" />
                                            <Text style={styles.settledText}>SETTLED</Text>
                                        </View>
                                    </View>

                                </View>
                            );
                        })
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

export default FundsScreen;

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
    headerSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    
    /* Hero Margin Card */
    heroCard: {
        backgroundColor: '#0F172A',
        marginHorizontal: 18,
        marginBottom: 16,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
    },
    heroGlowCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#38BDF8',
        opacity: 0.25,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        gap: 6,
    },
    walletBadgeText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    statusLive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 5,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    liveText: {
        color: '#34D399',
        fontSize: 11,
        fontWeight: '700',
    },
    balanceValue: {
        fontSize: 38,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        marginBottom: 6,
    },
    balanceHint: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },

    /* Input Card */
    inputCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        marginHorizontal: 18,
        marginBottom: 16,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 4,
    },
    inputCardTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 3,
    },
    inputCardSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 16,
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 14,
    },
    currencySymbol: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
        padding: 0,
    },
    clearBtn: {
        padding: 4,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    chip: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    chipText: {
        color: '#38BDF8',
        fontSize: 13,
        fontWeight: '800',
    },
    actionBtnRow: {
        flexDirection: 'row',
        gap: 12,
    },
    depositBtn: {
        flex: 1,
        backgroundColor: '#10B981',
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    depositBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    withdrawBtn: {
        flex: 1,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(248, 113, 113, 0.4)',
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    withdrawBtnText: {
        color: '#F87171',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },

    /* Section Header */
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },

    /* Passbook Container */
    passbookContainer: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        marginHorizontal: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 10,
    },
    emptySubText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },

    /* Passbook Row */
    passbookRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    passbookLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    crBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crBadgeText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#34D399',
    },
    drBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    drBadgeText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#F87171',
    },
    passbookTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    passbookUtr: {
        fontSize: 11,
        color: '#38BDF8',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 2,
    },
    passbookDate: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
    },
    passbookRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    amountCr: {
        fontSize: 16,
        fontWeight: '900',
        color: '#34D399',
    },
    amountDr: {
        fontSize: 16,
        fontWeight: '900',
        color: '#F87171',
    },
    settledPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    settledText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#34D399',
    },
    emailStmtBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.35)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    emailStmtBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#38BDF8',
        letterSpacing: 0.3,
    }
});
