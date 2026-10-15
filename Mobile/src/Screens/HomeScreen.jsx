import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardAction, fetchWatchlistAction } from '../Services/Actions/getApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';
import CandleStickChart from '../Components/CandleStickChart';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socket, { joinUserRoom } from '../Services/socket';

const HomeScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, dashboardData, watchlistData } = useSelector(state => state.action);
    const [loading, setLoading] = useState(true);

    const dashboardDataRef = useRef(dashboardData);
    dashboardDataRef.current = dashboardData;
    const userRef = useRef(user);
    userRef.current = user;

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

    const triggerForceLogout = useCallback(async (reason = 'Account has been deleted.') => {
        try {
            await AsyncStorage.removeItem('user_session');
        } catch (e) {
            console.error('Error clearing session on force logout:', e);
        }
        dispatch({ type: 'LOGOUT_USER' });
        dispatch({ type: 'SET_USER', payload: null });
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }, [dispatch, navigation]);

    const fetchDashboardData = useCallback(async () => {
        try {
            const res = await dispatch(fetchDashboardAction(userId));
            if (res && res.is_deleted) {
                await triggerForceLogout('Your account has been deleted from the database.');
                return;
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [dispatch, userId, triggerForceLogout]);

    useEffect(() => {
        fetchDashboardData();
        dispatch(fetchWatchlistAction());
    }, [fetchDashboardData, dispatch]);

    // Periodic heartbeat sync to catch direct database user deletions
    useEffect(() => {
        const heartbeat = setInterval(() => {
            fetchDashboardData();
        }, 8000);
        return () => clearInterval(heartbeat);
    }, [fetchDashboardData]);

    // Check if Admin requested KYC
    useEffect(() => {
        const isApproved = user?.is_kyc_verified == 1 || user?.kyc_status === 'Approved';
        if (isApproved) {
            setAlertVisible(false);
            return;
        }

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
        } else {
            setAlertVisible(false);
        }
    }, [user?.kyc_requested, user?.is_kyc_verified, user?.kyc_status, navigation]);

    // Real-Time Socket Connection & Listeners
    useEffect(() => {
        if (userId) {
            joinUserRoom(userId);
        }

        const handleMarketIndex = (indexData) => {
            if (!indexData || !indexData.name) return;
            const currentDash = dashboardDataRef.current;
            if (currentDash?.market_indices) {
                const updatedIndices = currentDash.market_indices.map(idx => 
                    idx.name === indexData.name ? { ...idx, ...indexData } : idx
                );
                dispatch({
                    type: 'SET_DASHBOARD_DATA',
                    payload: { ...currentDash, market_indices: updatedIndices }
                });
            }
        };

        const handleMarketPrice = (stockData) => {
            if (!stockData || !stockData.symbol) return;
            const currentDash = dashboardDataRef.current;
            if (currentDash?.top_gainers) {
                const updatedGainers = currentDash.top_gainers.map(g => 
                    g.symbol === stockData.symbol ? { ...g, ...stockData } : g
                );
                dispatch({
                    type: 'SET_DASHBOARD_DATA',
                    payload: { ...currentDash, top_gainers: updatedGainers }
                });
            }
        };

        const handleFunds = (fundsData) => {
            if (!fundsData || fundsData.user_id == userId) {
                fetchDashboardData();
            }
        };

        const handleKyc = (kycData) => {
            if (!kycData || String(kycData.user_id) === String(userId)) {
                const isApproved = Number(kycData.is_kyc_verified) === 1 || kycData.kyc_status === 'Approved';
                const isRequested = Number(kycData.kyc_requested) === 1 && !isApproved;
                const currentUser = userRef.current;

                const updatedUser = {
                    ...currentUser,
                    is_kyc_verified: isApproved ? 1 : (kycData.is_kyc_verified !== undefined ? Number(kycData.is_kyc_verified) : currentUser?.is_kyc_verified),
                    kyc_status: kycData.kyc_status || (isApproved ? 'Approved' : currentUser?.kyc_status),
                    kyc_requested: isRequested ? 1 : 0
                };

                dispatch({
                    type: 'SET_USER',
                    payload: updatedUser
                });

                AsyncStorage.setItem('user_session', JSON.stringify(updatedUser)).catch(() => {});

                if (isApproved || !isRequested) {
                    setAlertVisible(false);
                } else if (isRequested) {
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

                fetchDashboardData();
            }
        };

        const handleOrder = (orderData) => {
            if (!orderData || orderData.user_id == userId) {
                fetchDashboardData();
            }
        };

        const handleRefresh = (data) => {
            if (!data || data.target === 'dashboard' || data.target === 'all' || data.target === 'kyc') {
                fetchDashboardData();
            }
        };

        const handleForceLogout = (data) => {
            const targetId = data?.user_id;
            const myId = userRef.current?.id || userId;
            if (!targetId || String(targetId) === String(myId)) {
                console.log('[Socket] FORCE_LOGOUT received for user:', targetId);
                triggerForceLogout(data?.message || 'Account has been deleted or deactivated.');
            }
        };

        const handleUserDeleted = (data) => {
            const targetId = data?.user_id;
            const myId = userRef.current?.id || userId;
            if (!targetId || String(targetId) === String(myId)) {
                console.log('[Socket] USER_DELETED received for user:', targetId);
                triggerForceLogout(data?.message || 'Your account was deleted by administrator.');
            }
        };

        socket.on('MARKET_INDEX_UPDATED', handleMarketIndex);
        socket.on('MARKET_PRICE_UPDATED', handleMarketPrice);
        socket.on('FUNDS_UPDATED', handleFunds);
        socket.on('KYC_STATUS_UPDATED', handleKyc);
        socket.on('ORDER_PLACED', handleOrder);
        socket.on('ORDER_UPDATED', handleOrder);
        socket.on('REFRESH_DATA', handleRefresh);
        socket.on('FORCE_LOGOUT', handleForceLogout);
        socket.on('USER_DELETED', handleUserDeleted);

        return () => {
            socket.off('MARKET_INDEX_UPDATED', handleMarketIndex);
            socket.off('MARKET_PRICE_UPDATED', handleMarketPrice);
            socket.off('FUNDS_UPDATED', handleFunds);
            socket.off('KYC_STATUS_UPDATED', handleKyc);
            socket.off('ORDER_PLACED', handleOrder);
            socket.off('ORDER_UPDATED', handleOrder);
            socket.off('REFRESH_DATA', handleRefresh);
            socket.off('FORCE_LOGOUT', handleForceLogout);
            socket.off('USER_DELETED', handleUserDeleted);
        };
    }, [userId, fetchDashboardData, dispatch, navigation, triggerForceLogout]);

    if (loading) {
        return (
            <View style={[styles.safeArea, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <Loader visible={true} text="Connecting to Exchange..." overlay={true} />
            </View>
        );
    }

    if (!dashboardData) {
        return (
            <View style={[styles.safeArea, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
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
            </View>
        );
    }

    const portfolio = dashboardData?.portfolio || {};
    const market_indices = Array.isArray(dashboardData?.market_indices) ? dashboardData.market_indices : [];
    const top_gainers = Array.isArray(dashboardData?.top_gainers) ? dashboardData.top_gainers : [];

    const totalPortfolioVal = Number(portfolio?.total_value ?? portfolio?.total_portfolio_value ?? 0);
    const dayPnl = Number(portfolio?.day_pnl ?? 0);
    const dayPnlPercent = Number(portfolio?.day_pnl_percent ?? 0);
    const investedAmount = Number(portfolio?.invested_amount ?? 0);
    const availableMargin = Number(portfolio?.available_margin ?? 0);
    const holdingsCount = portfolio?.holdings_count || 0;

    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const displayName = user?.full_name || 'Valued Trader';

    return (
        <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 8 : 0) }]}>
            
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
                        ₹{totalPortfolioVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </Text>

                    <View style={[
                        styles.pnlBadge,
                        dayPnl < 0 && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }
                    ]}>
                        <Ionicons name={dayPnl >= 0 ? "caret-up" : "caret-down"} size={16} color={dayPnl >= 0 ? "#34D399" : "#EF4444"} />
                        <Text style={[styles.pnlText, dayPnl < 0 && { color: '#EF4444' }]}>
                            {dayPnl >= 0 ? '+' : ''}₹{dayPnl.toLocaleString('en-IN')} ({dayPnlPercent}%) Today
                        </Text>
                    </View>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroMetrics}>
                        <View>
                            <Text style={styles.metricSubLabel}>Invested Amount</Text>
                            <Text style={styles.metricSubVal}>₹{investedAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.metricSubLabel}>Available Margin</Text>
                            <Text style={[styles.metricSubValGreen, availableMargin < 0 && { color: '#EF4444' }]}>₹{availableMargin.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                {/* Indices Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Market Indices</Text>
                    <Text style={styles.sectionSub}>Live Stream</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesRow}>
                    {market_indices.map((index, i) => {
                        const isMinus = String(index.change).startsWith('-') || index.is_up === false || (typeof index.day_change !== 'undefined' && Number(index.day_change) < 0);
                        return (
                            <View key={i} style={styles.indexCard}>
                                <View style={styles.indexHeader}>
                                    <Text style={styles.indexName}>{index.name}</Text>
                                    <Ionicons 
                                        name={isMinus ? "trending-down" : "trending-up"} 
                                        size={16} 
                                        color={isMinus ? "#EF4444" : "#10B981"} 
                                    />
                                </View>
                                <Text style={styles.indexPrice}>{index.value}</Text>
                                <View style={[
                                    styles.indexPill,
                                    isMinus && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }
                                ]}>
                                    <Text style={[styles.changeUp, isMinus && { color: '#EF4444' }]}>
                                        {index.change}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Interactive Candlestick & Price Trend Chart (Date & Company-wise) */}
                <CandleStickChart 
                    stockList={dashboardData?.stocks || watchlistData || []} 
                    onSelectStock={(sym) => navigation.navigate('Watchlist', { selectedSymbol: sym })} 
                />

                {/* Quick 4-Box Metrics Row - Single Line Horizontal Scroll */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.metricsHorizontalScroll}
                >
                    <View style={[styles.metricsCard, { borderColor: '#3B82F6' }]}>
                        <View style={[styles.gridIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                            <Ionicons name="pie-chart" size={18} color="#60A5FA" />
                        </View>
                        <Text style={styles.gridVal}>
                            ₹{investedAmount >= 100000 ? (investedAmount / 100000).toFixed(2) + 'L' : Number(investedAmount).toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.gridLabel}>Invested</Text>
                    </View>

                    <View style={[styles.metricsCard, { borderColor: dayPnl >= 0 ? '#10B981' : '#EF4444' }]}>
                        <View style={[styles.gridIconBox, { backgroundColor: dayPnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                            <Ionicons name="flash" size={18} color={dayPnl >= 0 ? "#34D399" : "#EF4444"} />
                        </View>
                        <Text style={[styles.gridVal, { color: dayPnl >= 0 ? '#34D399' : '#EF4444' }]}>
                            {dayPnl >= 0 ? '+' : ''}{dayPnlPercent}%
                        </Text>
                        <Text style={styles.gridLabel}>Day P&L</Text>
                    </View>

                    <View style={[styles.metricsCard, { borderColor: '#8B5CF6' }]}>
                        <View style={[styles.gridIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                            <Ionicons name="trophy" size={18} color="#A78BFA" />
                        </View>
                        <Text style={styles.gridVal}>+18.4%</Text>
                        <Text style={styles.gridLabel}>1Y Return</Text>
                    </View>

                    <View style={[styles.metricsCard, { borderColor: '#F59E0B' }]}>
                        <View style={[styles.gridIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Ionicons name="layers" size={18} color="#FBBF24" />
                        </View>
                        <Text style={styles.gridVal}>{holdingsCount}</Text>
                        <Text style={styles.gridLabel}>Holdings</Text>
                    </View>
                </ScrollView>

                {/* Top Movers Watchlist Preview */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Market Gainers</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Watchlist')}>
                        <Text style={styles.viewAllText}>See All →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    {top_gainers.map((g, idx) => {
                        const colors = ['#38BDF8', '#C084FC', '#34D399', '#FBBF24'];
                        const col = colors[idx % colors.length];
                        const isMinus = String(g.gain).startsWith('-') || String(g.change).startsWith('-') || g.is_up === false || (typeof g.day_change !== 'undefined' && Number(g.day_change) < 0);
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
                                    <Text style={[styles.stockGain, isMinus && { color: '#EF4444' }]}>{g.gain}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

            </ScrollView>
        </View>
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

    /* 4-Box Horizontal Scroll */
    metricsHorizontalScroll: {
        paddingHorizontal: 18,
        marginTop: 16,
        gap: 12,
    },
    metricsCard: {
        width: 135,
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