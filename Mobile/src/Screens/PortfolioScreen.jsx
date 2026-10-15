import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPortfolioAction } from '../Services/Actions/getApis';
import Loader from '../Components/Loader';
import socket from '../Services/socket';

const PortfolioScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, portfolioData } = useSelector(state => state.action);
    const [loading, setLoading] = useState(true);

    const userRef = useRef(user);
    userRef.current = user;

    const fetchPortfolio = useCallback(async () => {
        try {
            const userId = userRef.current?.id || 1;
            await dispatch(fetchPortfolioAction(userId));
        } catch(e) {
            console.error('Error fetching portfolio:', e);
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    useEffect(() => {
        fetchPortfolio();

        const handleUpdate = () => {
            fetchPortfolio();
        };

        socket.on('ORDER_PLACED', handleUpdate);
        socket.on('ORDER_UPDATED', handleUpdate);
        socket.on('FUNDS_UPDATED', handleUpdate);
        socket.on('MARKET_PRICE_UPDATED', handleUpdate);
        socket.on('REFRESH_DATA', handleUpdate);

        return () => {
            socket.off('ORDER_PLACED', handleUpdate);
            socket.off('ORDER_UPDATED', handleUpdate);
            socket.off('FUNDS_UPDATED', handleUpdate);
            socket.off('MARKET_PRICE_UPDATED', handleUpdate);
            socket.off('REFRESH_DATA', handleUpdate);
        };
    }, [fetchPortfolio]);

    if (loading || !portfolioData) {
        return (
            <View style={[styles.safeArea, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <Loader visible={true} text="Calculating Portfolio P&L..." overlay={true} />
            </View>
        );
    }

    const { summary, holdings } = portfolioData;

    const getInitials = (name) => {
        if (!name) return 'IG';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 8 : 0) }]}>
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Holdings & Portfolio</Text>
                        <Text style={styles.headerSub}>{holdings.length} Active Positions</Text>
                    </View>
                </View>

                {/* Real-time WebSocket sync badge */}
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>SYNCED</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Summary Banner Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryGlow} />

                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.summaryLabel}>Total Invested</Text>
                            <Text style={styles.summaryValue}>₹{summary.invested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.summaryLabel}>Current Valuation</Text>
                            <Text style={styles.summaryValue}>₹{summary.current_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />

                    <View style={styles.pnlRow}>
                        <View>
                            <Text style={styles.pnlLabel}>Total Net Profit / Loss</Text>
                            <Text style={summary.total_pnl >= 0 ? styles.pnlValUp : styles.pnlValDown}>
                                {summary.total_pnl >= 0 ? '+' : ''}₹{summary.total_pnl.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </Text>
                        </View>
                        <View style={[styles.pnlBadge, {backgroundColor: summary.total_pnl >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}]}>
                            <Ionicons 
                                name={summary.total_pnl >= 0 ? "trending-up" : "trending-down"} 
                                size={14} 
                                color={summary.total_pnl >= 0 ? "#34D399" : "#F87171"} 
                            />
                            <Text style={[styles.pnlBadgeText, {color: summary.total_pnl >= 0 ? "#34D399" : "#F87171"}]}>
                                {summary.total_pnl >= 0 ? '+' : ''}{summary.pnl_percent.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Stocks</Text>
                    <View style={styles.sortPill}>
                        <Ionicons name="funnel-outline" size={12} color="#38BDF8" />
                        <Text style={styles.sortText}>P&L High to Low</Text>
                    </View>
                </View>

                {/* Holdings List */}
                <View style={styles.listContainer}>
                    {holdings.map((stock, index) => (
                        <TouchableOpacity key={index} style={styles.stockRow} activeOpacity={0.8}>
                            <View style={styles.rowTop}>
                                <View style={styles.stockNameRow}>
                                    <View style={styles.qtyBadge}>
                                        <Text style={styles.qtyText}>{stock.quantity} Qty</Text>
                                    </View>
                                    <Text style={styles.stockSymbol}>{stock.stock_symbol}</Text>
                                </View>
                                <Text style={styles.currentPrice}>₹{stock.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                            </View>

                            <View style={styles.rowBottom}>
                                <Text style={styles.avgPrice}>
                                    Avg. ₹{parseFloat(stock.avg_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                </Text>
                                <View style={[styles.stockPnlPill, {backgroundColor: stock.pnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}]}>
                                    <Text style={[styles.stockPnlText, {color: stock.pnl >= 0 ? '#34D399' : '#F87171'}]}>
                                        {stock.pnl >= 0 ? '+' : ''}₹{stock.pnl.toLocaleString('en-IN', {minimumFractionDigits: 2})} ({stock.pnl >= 0 ? '+' : ''}{stock.pnl_percent.toFixed(2)}%)
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
};

export default PortfolioScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
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
        fontSize: 12,
        color: '#94A3B8',
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

    /* Summary Card */
    summaryCard: {
        backgroundColor: '#0F172A',
        marginHorizontal: 18,
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
    summaryGlow: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#8B5CF6',
        opacity: 0.25,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 16,
    },
    pnlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pnlLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    pnlValUp: {
        fontSize: 26,
        fontWeight: '900',
        color: '#34D399',
    },
    pnlValDown: {
        fontSize: 26,
        fontWeight: '900',
        color: '#F87171',
    },
    pnlBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    pnlBadgeText: {
        fontSize: 13,
        fontWeight: '800',
    },

    /* Section Header */
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
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        gap: 5,
    },
    sortText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#38BDF8',
    },

    /* List */
    listContainer: {
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        marginHorizontal: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
    },
    stockRow: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stockNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyBadge: {
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    qtyText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
    },
    stockSymbol: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    currentPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    rowBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    avgPrice: {
        fontSize: 12,
        color: '#64748B',
    },
    stockPnlPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    stockPnlText: {
        fontSize: 12,
        fontWeight: '800',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    liveText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});
