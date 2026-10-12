import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardAction } from '../Services/Actions/getApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';

const HomeScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user, dashboardData } = useSelector(state => state.action);
    const [loading, setLoading] = useState(true);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        type: 'warning',
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
    });

    const userId = user?.id || 1;
    const isKycVerified = user?.is_kyc_verified == 1 || user?.kyc_status === 'Approved';

    const showAlert = (type, title, message, confirmText = 'OK', onConfirm = null, cancelText = null) => {
        setAlertConfig({ type, title, message, confirmText, onConfirm, cancelText });
        setAlertVisible(true);
    };

    const fetchDashboardData = useCallback(async () => {
        try {
            await dispatch(fetchDashboardAction(userId));
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [dispatch, userId]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Check if Admin requested KYC
    useEffect(() => {
        if (user?.kyc_requested == 1) {
            showAlert(
                'warning',
                'Complete Your KYC',
                'Admin has requested your KYC verification. Please upload your PAN card and Bank details to activate institutional trading and wallet services.',
                'Complete KYC Now',
                () => {
                    setAlertVisible(false);
                    navigation.navigate('KYC');
                },
                'Later'
            );
        }
    }, [user?.kyc_requested, navigation]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
                <Loader visible={true} text="Connecting to Exchange..." overlay={true} />
            </SafeAreaView>
        );
    }

    if (!dashboardData) {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Ionicons name="cloud-offline-outline" size={48} color="#F87171" />
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 16 }}>Unable to Load Dashboard</Text>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
                    Server error occurred while loading dashboard. Please check server or retry.
                </Text>
                <TouchableOpacity 
                    onPress={() => { setLoading(true); fetchDashboardData(); }}
                    style={{ backgroundColor: '#0284C7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const { portfolio, market_indices } = dashboardData;

    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const displayName = user?.full_name || 'Valued Trader';

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* Ambient Background Glows */}
            <View style={styles.ambientGlow} />

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

            {/* Vibrant Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.avatarText}>
                            {getInitials(displayName)}
                        </Text>
                    </TouchableOpacity>
                    <View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                            <Text style={styles.headerTitle}>Infinity Capital</Text>
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                        </View>
                        <Text style={styles.headerSub}>{displayName} · Premium Demat</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Watchlist')}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="notifications-outline" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Market Status Ticker */}
                <View style={styles.marketStatusRow}>
                    <View style={styles.marketStatusPill}>
                        <View style={styles.greenPulseDot} />
                        <Text style={styles.marketStatusText}>MARKETS OPEN · NSE & BSE LIVE</Text>
                    </View>
                </View>

                {/* KYC Warning Banner if Not Verified */}
                {!isKycVerified && (
                    <TouchableOpacity 
                        style={styles.kycBanner} 
                        onPress={() => navigation.navigate('KYC')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.kycBannerLeft}>
                            <View style={styles.kycBannerIconBox}>
                                <Ionicons name="warning" size={18} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.kycBannerTitle}>
                                    {user?.kyc_requested == 1 ? 'Action Required: Complete Your KYC' : 'KYC Verification Pending'}
                                </Text>
                                <Text style={styles.kycBannerSub}>
                                    Wallet & Stock Trading locked until KYC approved.
                                </Text>
                            </View>
                        </View>
                        <View style={styles.kycBannerBtn}>
                            <Text style={styles.kycBannerBtnText}>Complete &rarr;</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Vibrant Hero Portfolio Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroGlowCircle} />
                    
                    <View style={styles.heroTopRow}>
                        <Text style={styles.heroLabel}>Total Portfolio Value</Text>
                        <TouchableOpacity 
                            style={styles.addFundsBtn} 
                            onPress={() => {
                                if (!isKycVerified) {
                                    showAlert(
                                        'warning',
                                        'KYC Verification Required',
                                        'Wallet deposits and margin additions are locked until Demat KYC is approved. Please complete your KYC to activate wallet features.',
                                        'Complete KYC Now',
                                        () => {
                                            setAlertVisible(false);
                                            navigation.navigate('KYC');
                                        },
                                        'Cancel'
                                    );
                                    return;
                                }
                                navigation.navigate('Funds');
                            }}
                        >
                            <Ionicons name="add-circle" size={16} color="#38BDF8" />
                            <Text style={styles.addFundsText}>+ Add Funds</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.heroAmount}>
                        ₹{portfolio.total_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </Text>

                    <View style={styles.pnlBadge}>
                        <Ionicons name="caret-up" size={16} color="#34D399" />
                        <Text style={styles.pnlText}>
                            +₹{portfolio.day_pnl.toLocaleString('en-IN')} ({portfolio.day_pnl_percent}%) Today
                        </Text>
                    </View>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroMetrics}>
                        <View>
                            <Text style={styles.metricSubLabel}>Invested Amount</Text>
                            <Text style={styles.metricSubVal}>₹{portfolio.invested_amount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.metricSubLabel}>Available Margin</Text>
                            <Text style={styles.metricSubValGreen}>₹{portfolio.available_margin.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                {/* Indices Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Market Indices</Text>
                    <Text style={styles.sectionSub}>Live Stream</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesRow}>
                    {market_indices.map((index, i) => (
                        <View key={i} style={styles.indexCard}>
                            <View style={styles.indexHeader}>
                                <Text style={styles.indexName}>{index.name}</Text>
                                <Ionicons name="trending-up" size={16} color="#10B981" />
                            </View>
                            <Text style={styles.indexPrice}>{index.value}</Text>
                            <View style={styles.indexPill}>
                                <Text style={styles.changeUp}>{index.change}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Quick 4-Grid Colorful Badges */}
                <View style={styles.gridRow}>
                    <View style={[styles.gridCard, {borderColor: '#3B82F6'}]}>
                        <View style={[styles.gridIconBox, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
                            <Ionicons name="pie-chart" size={18} color="#60A5FA" />
                        </View>
                        <Text style={styles.gridVal}>₹{(portfolio.invested_amount / 100000).toFixed(2)}L</Text>
                        <Text style={styles.gridLabel}>Invested</Text>
                    </View>

                    <View style={[styles.gridCard, {borderColor: '#10B981'}]}>
                        <View style={[styles.gridIconBox, {backgroundColor: 'rgba(16, 185, 129, 0.15)'}]}>
                            <Ionicons name="flash" size={18} color="#34D399" />
                        </View>
                        <Text style={[styles.gridVal, {color: '#34D399'}]}>+{portfolio.day_pnl_percent}%</Text>
                        <Text style={styles.gridLabel}>Day P&L</Text>
                    </View>

                    <View style={[styles.gridCard, {borderColor: '#8B5CF6'}]}>
                        <View style={[styles.gridIconBox, {backgroundColor: 'rgba(139, 92, 246, 0.15)'}]}>
                            <Ionicons name="trophy" size={18} color="#A78BFA" />
                        </View>
                        <Text style={styles.gridVal}>+18.4%</Text>
                        <Text style={styles.gridLabel}>1Y Return</Text>
                    </View>

                    <View style={[styles.gridCard, {borderColor: '#F59E0B'}]}>
                        <View style={[styles.gridIconBox, {backgroundColor: 'rgba(245, 158, 11, 0.15)'}]}>
                            <Ionicons name="layers" size={18} color="#FBBF24" />
                        </View>
                        <Text style={styles.gridVal}>{portfolio.holdings_count || 16}</Text>
                        <Text style={styles.gridLabel}>Holdings</Text>
                    </View>
                </View>

                {/* Top Movers Watchlist Preview */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Market Gainers</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Watchlist')}>
                        <Text style={styles.viewAllText}>See All →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    {(dashboardData.top_gainers || []).map((g, idx) => {
                        const colors = ['#38BDF8', '#C084FC', '#34D399', '#FBBF24'];
                        const col = colors[idx % colors.length];
                        return (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.stockRow}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('Watchlist', { selectedSymbol: g.symbol })}
                            >
                                <View style={styles.stockLeft}>
                                    <View style={[styles.stockAvatar, {backgroundColor: col + '25'}]}>
                                        <Text style={[styles.stockAvatarText, {color: col}]}>
                                            {g.symbol.substring(0, 2)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.stockSymbol}>{g.symbol}</Text>
                                        <Text style={styles.stockSub}>{g.sector || g.name}</Text>
                                    </View>
                                </View>
                                <View style={styles.stockRight}>
                                    <Text style={styles.stockPrice}>₹{g.price}</Text>
                                    <Text style={styles.stockGain}>{g.gain}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
    },
    ambientGlow: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: '#2563EB',
        opacity: 0.18,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 10 : 16,
        paddingBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 42,
        height: 42,
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
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    proBadge: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    proBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    headerSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 1,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
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

    marketStatusRow: {
        paddingHorizontal: 18,
        marginBottom: 14,
    },
    marketStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    kycBanner: {
        marginHorizontal: 18,
        marginBottom: 14,
        padding: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.35)',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    kycBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    kycBannerIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    kycBannerTitle: {
        color: '#FCD34D',
        fontSize: 13,
        fontWeight: 'bold',
    },
    kycBannerSub: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 1,
    },
    kycBannerBtn: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    kycBannerBtnText: {
        color: '#090E1A',
        fontSize: 11,
        fontWeight: '900',
    },
    greenPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    marketStatusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6EE7B7',
        letterSpacing: 0.5,
    },

    /* Hero Portfolio Card */
    heroCard: {
        backgroundColor: '#0F172A',
        marginHorizontal: 18,
        borderRadius: 20,
        padding: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
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
        marginBottom: 8,
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: '#94A3B8',
    },
    addFundsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    addFundsText: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '800',
    },
    heroAmount: {
        fontSize: 38,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
        marginBottom: 8,
    },
    pnlBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.35)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        gap: 4,
        marginBottom: 18,
    },
    pnlText: {
        color: '#34D399',
        fontSize: 13,
        fontWeight: '800',
    },
    heroDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 14,
    },
    heroMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricSubLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metricSubVal: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    metricSubValGreen: {
        fontSize: 17,
        fontWeight: '800',
        color: '#34D399',
    },

    /* Section Headers */
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        marginTop: 22,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    sectionSub: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '700',
    },
    viewAllText: {
        color: '#38BDF8',
        fontSize: 13,
        fontWeight: '800',
    },

    /* Indices */
    indicesRow: {
        paddingHorizontal: 18,
        gap: 12,
    },
    indexCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 14,
        width: 140,
    },
    indexHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    indexName: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
    },
    indexPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    indexPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    changeUp: {
        fontSize: 11,
        fontWeight: '800',
        color: '#34D399',
    },

    /* 4-Grid */
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 18,
        marginTop: 18,
        gap: 10,
    },
    gridCard: {
        flex: 1,
        minWidth: '46%',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
    },
    gridIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    gridVal: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    gridLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginTop: 2,
    },

    /* List Container */
    listContainer: {
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        marginHorizontal: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
    },
    stockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    stockLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stockAvatar: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockAvatarText: {
        fontSize: 14,
        fontWeight: '900',
    },
    stockSymbol: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    stockSub: {
        fontSize: 12,
        color: '#64748B',
    },
    stockRight: {
        alignItems: 'flex-end',
    },
    stockPrice: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    stockGain: {
        fontSize: 12,
        fontWeight: '800',
        color: '#34D399',
    }
});