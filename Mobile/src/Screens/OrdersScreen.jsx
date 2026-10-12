import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, StatusBar, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdersAction } from '../Services/Actions/getApis';

const OrdersScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, ordersData } = useSelector(state => state.action);

    const [filter, setFilter] = useState('ALL');
    const [refreshing, setRefreshing] = useState(false);

    const userId = user?.id || 1;

    useEffect(() => {
        loadOrders();
    }, [userId]);

    const loadOrders = async () => {
        try {
            await dispatch(fetchOrdersAction(userId));
        } catch (e) {
            console.error('Error loading orders:', e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const ordersList = Array.isArray(ordersData) && ordersData.length > 0 ? ordersData : [];

    const filteredOrders = filter === 'ALL' 
        ? ordersList 
        : ordersList.filter(o => o.status === filter);

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 8 
        : Math.max(insets.top, 14);

    const renderItem = ({ item }) => {
        const isBuy = item.type === 'BUY';
        const isExecuted = item.status === 'EXECUTED';
        const isPending = item.status === 'PENDING';

        return (
            <View style={styles.orderCard}>
                <View style={styles.topRow}>
                    <View style={styles.symbolRow}>
                        <View style={[
                            styles.typeBadge, 
                            { 
                                backgroundColor: isBuy ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                                borderColor: isBuy ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)' 
                            }
                        ]}>
                            <Text style={[styles.typeText, { color: isBuy ? '#34D399' : '#F87171' }]}>
                                {item.type}
                            </Text>
                        </View>
                        <Text style={styles.symbolText}>{item.symbol}</Text>
                        <View style={styles.exchangeBadge}>
                            <Text style={styles.exchangeText}>NSE</Text>
                        </View>
                    </View>

                    <View style={[
                        styles.statusBadge,
                        {
                            backgroundColor: isExecuted 
                                ? 'rgba(16, 185, 129, 0.15)' 
                                : isPending 
                                ? 'rgba(245, 158, 11, 0.15)' 
                                : 'rgba(148, 163, 184, 0.15)',
                            borderColor: isExecuted 
                                ? 'rgba(52, 211, 153, 0.35)' 
                                : isPending 
                                ? 'rgba(251, 191, 36, 0.35)' 
                                : 'rgba(148, 163, 184, 0.3)'
                        }
                    ]}>
                        <Ionicons 
                            name={isExecuted ? "checkmark-circle" : isPending ? "time" : "close-circle"} 
                            size={12} 
                            color={isExecuted ? "#34D399" : isPending ? "#FBBF24" : "#94A3B8"} 
                        />
                        <Text style={[
                            styles.statusText,
                            { color: isExecuted ? "#34D399" : isPending ? "#FBBF24" : "#94A3B8" }
                        ]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.bottomRow}>
                    <View>
                        <Text style={styles.detailLabel}>EXECUTION PRICE</Text>
                        <Text style={styles.priceVal}>₹{item.price}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.detailLabel}>QUANTITY</Text>
                        <Text style={styles.qtyVal}>{item.qty} Qty</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.detailLabel}>TIMESTAMP</Text>
                        <Text style={styles.timeVal}>{item.time}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.brandRow}>
                    <View style={styles.brandBadge}>
                        <Ionicons name="swap-horizontal" size={20} color="#38BDF8" />
                    </View>
                    <View>
                        <Text style={styles.brandTitle}>Trade Book</Text>
                        <Text style={styles.brandSub}>Live Order Executions · Demat</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.iconCircle} onPress={loadOrders} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={18} color="#38BDF8" />
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {['ALL', 'EXECUTED', 'PENDING'].map(f => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                        onPress={() => setFilter(f)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Orders List */}
            <FlatList
                data={filteredOrders}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={["#38BDF8"]} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={44} color="#64748B" />
                        <Text style={styles.emptyTitle}>No Orders Found</Text>
                        <Text style={styles.emptySub}>No trade orders placed under this category yet.</Text>
                    </View>
                }
            />
        </View>
    );
};

export default OrdersScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A', // Dark Obsidian
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 14,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        borderWidth: 1.5,
        borderColor: 'rgba(56, 189, 248, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    brandSub: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 18,
        paddingBottom: 14,
        gap: 10,
    },
    filterBtn: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    filterBtnActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38BDF8',
    },
    filterText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    filterTextActive: {
        color: '#38BDF8',
    },
    listContent: {
        paddingHorizontal: 18,
        paddingBottom: 24,
    },
    orderCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    symbolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '900',
    },
    symbolText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    exchangeBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    exchangeText: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginVertical: 12,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    priceVal: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    qtyVal: {
        color: '#38BDF8',
        fontSize: 14,
        fontWeight: '700',
    },
    timeVal: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 14,
    },
    emptySub: {
        color: '#64748B',
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
});
