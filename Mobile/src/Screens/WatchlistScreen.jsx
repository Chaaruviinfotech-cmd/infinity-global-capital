import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    Platform, 
    StatusBar, 
    RefreshControl, 
    Modal, 
    ActivityIndicator, 
    TouchableWithoutFeedback,
    KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchWatchlistAction, 
    fetchFundsAction, 
    fetchPortfolioAction, 
    fetchOrdersAction 
} from '../Services/Actions/getApis';
import { placeOrderAction } from '../Services/Actions/postApis';
import Alert from '../Components/Alert';

const CATEGORIES = ['All', 'Banking', 'IT Tech', 'Automobile', 'Energy', 'Pharma'];

const getStockColor = (symbol, sector) => {
    if (sector?.includes('Bank')) return '#10B981';
    if (sector?.includes('IT')) return '#8B5CF6';
    if (sector?.includes('Auto')) return '#F59E0B';
    if (sector?.includes('Energy')) return '#2563EB';
    if (sector?.includes('Pharma')) return '#EC4899';
    return '#38BDF8';
};

const WatchlistScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, fundsData, watchlistData } = useSelector(state => state.action);

    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Trade / Buy Modal State
    const [tradeModalVisible, setTradeModalVisible] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [orderQty, setOrderQty] = useState('10');
    const [orderLoading, setOrderLoading] = useState(false);

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
        setAlertConfig({
            type,
            title,
            message,
            confirmText,
            onConfirm,
            cancelText
        });
        setAlertVisible(true);
    };

    const userId = user?.id || 1;

    const loadWatchlist = useCallback(async () => {
        try {
            await dispatch(fetchWatchlistAction(selectedCategory, searchQuery));
        } catch (e) {
            console.error('Error loading watchlist:', e);
        }
    }, [dispatch, selectedCategory, searchQuery]);

    const loadFunds = useCallback(async () => {
        try {
            await dispatch(fetchFundsAction(userId));
        } catch (e) {
            console.error('Error loading funds:', e);
        }
    }, [dispatch, userId]);

    useEffect(() => {
        loadWatchlist();
        loadFunds();
    }, [loadWatchlist, loadFunds]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadWatchlist(), loadFunds()]);
        setRefreshing(false);
    };

    const stockList = useMemo(() => {
        return Array.isArray(watchlistData) && watchlistData.length > 0 ? watchlistData : [];
    }, [watchlistData]);

    // Check if routed with a pre-selected stock symbol
    useEffect(() => {
        if (route?.params?.selectedSymbol && stockList.length > 0) {
            const found = stockList.find(s => s.symbol?.toUpperCase() === route.params.selectedSymbol.toUpperCase());
            if (found) {
                openTradeModal(found);
            }
        }
    }, [route?.params?.selectedSymbol, stockList]);

    const filteredStocks = stockList.filter(stock => {
        const matchesSearch = !searchQuery || 
            stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (stock.company_name && stock.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
    });

    const isKycVerified = user?.is_kyc_verified == 1 || user?.kyc_status === 'Approved';

    const openTradeModal = (stk) => {
        if (!isKycVerified) {
            showAlert(
                'warning',
                'KYC Verification Required',
                'Under SEBI / Exchange regulations, Demat KYC approval is mandatory before buying stocks or trading. Please complete your KYC verification.',
                'Complete KYC Now',
                () => navigation.navigate('KYC'),
                'Cancel'
            );
            return;
        }
        setSelectedStock(stk);
        setOrderQty('10');
        setTradeModalVisible(true);
    };

    const handleQtyChange = (delta) => {
        const current = parseInt(orderQty, 10) || 0;
        const next = Math.max(1, current + delta);
        setOrderQty(next.toString());
    };

    const handleQuickAdd = (add) => {
        const current = parseInt(orderQty, 10) || 0;
        const next = Math.max(1, current + add);
        setOrderQty(next.toString());
    };

    // Numerical Calculations
    const availableMargin = Number(fundsData?.available_margin || 0);
    const stockPrice = selectedStock 
        ? Number(selectedStock.current_price || (typeof selectedStock.price === 'string' ? selectedStock.price.replace(/,/g, '') : selectedStock.price) || 0)
        : 0;
    const numQty = parseInt(orderQty, 10) || 0;
    const totalCost = Number((numQty * stockPrice).toFixed(2));
    const isMarginSufficient = availableMargin >= totalCost;
    const marginShortfall = isMarginSufficient ? 0 : Number((totalCost - availableMargin).toFixed(2));

    const handlePlaceOrder = async () => {
        if (!selectedStock) return;

        if (!isKycVerified) {
            showAlert(
                'warning',
                'KYC Verification Required',
                'You cannot buy stocks without KYC approval. Please complete your KYC verification.',
                'Complete KYC',
                () => {
                    setTradeModalVisible(false);
                    navigation.navigate('KYC');
                },
                'Cancel'
            );
            return;
        }

        if (numQty <= 0) {
            showAlert('warning', 'Invalid Quantity', 'Please enter at least 1 share to execute.');
            return;
        }

        if (!isMarginSufficient) {
            showAlert(
                'error', 
                'Insufficient Margin', 
                `Margin required is ₹${totalCost.toLocaleString('en-IN')}, but your available balance is ₹${availableMargin.toLocaleString('en-IN')}.\n\nYou are short by ₹${marginShortfall.toLocaleString('en-IN')}.\n\nDeposit funds to complete this order.`,
                'Add Funds',
                () => {
                    setTradeModalVisible(false);
                    navigation.navigate('Funds');
                },
                'Cancel'
            );
            return;
        }

        setOrderLoading(true);
        try {
            const orderPayload = {
                user_id: userId,
                stock_symbol: selectedStock.symbol,
                quantity: numQty,
                order_type: 'BUY',
                price: stockPrice
            };

            const res = await dispatch(placeOrderAction(orderPayload));
            setOrderLoading(false);

            if (res && res.success) {
                setTradeModalVisible(false);
                // Refresh data across the app
                dispatch(fetchFundsAction(userId));
                dispatch(fetchPortfolioAction(userId));
                dispatch(fetchOrdersAction(userId));
                loadWatchlist();

                showAlert(
                    'success',
                    'Order Executed',
                    `Successfully purchased ${numQty} shares of ${selectedStock.symbol} at ₹${stockPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}.\n\nTotal ₹${totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2})} debited from your trading ledger.`,
                    'View Orders',
                    () => navigation.navigate('Orders'),
                    'Done'
                );
            } else {
                showAlert('error', 'Order Failed', res?.message || 'Could not place order. Please try again.');
            }
        } catch (err) {
            setOrderLoading(false);
            console.error('Place order error:', err);
            showAlert('error', 'Execution Error', 'Server error or network failure while processing order.');
        }
    };

    const safeTopPadding = Platform.OS === 'android' 
        ? Math.max(StatusBar.currentHeight || 24, insets.top) + 8 
        : Math.max(insets.top, 14);

    return (
        <View style={[styles.mainContainer, { paddingTop: safeTopPadding }]}>
            <StatusBar barStyle="light-content" backgroundColor="#090E1A" translucent />

            {/* Top Bar with Brand + Live Status */}
            <View style={styles.topBar}>
                <View style={styles.brandRow}>
                    <View style={styles.brandBadge}>
                        <Text style={styles.brandInfinity}>∞</Text>
                    </View>
                    <View>
                        <Text style={styles.brandTitle}>Markets Watchlist</Text>
                        <Text style={styles.brandSub}>NSE · BSE Live Streaming</Text>
                    </View>
                </View>

                <View style={styles.topActions}>
                    <TouchableOpacity 
                        style={styles.fundsQuickBadge}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Funds')}
                    >
                        <Ionicons name="wallet-outline" size={15} color="#38BDF8" style={styles.fundsIcon} />
                        <Text style={styles.fundsQuickText}>₹{availableMargin.toLocaleString('en-IN', {maximumFractionDigits: 0})}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Live Indices Strip */}
            <View style={styles.indicesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicesScroll}>
                    <View style={styles.indexPill}>
                        <View style={styles.liveGreenDot} />
                        <Text style={styles.indexTitle}>NIFTY 50</Text>
                        <Text style={styles.indexPrice}>25,420.35</Text>
                        <View style={styles.pillBadgeGreen}>
                            <Text style={styles.pillTextGreen}>+0.82%</Text>
                        </View>
                    </View>

                    <View style={styles.indexPill}>
                        <View style={styles.liveGreenDot} />
                        <Text style={styles.indexTitle}>SENSEX</Text>
                        <Text style={styles.indexPrice}>83,210.44</Text>
                        <View style={styles.pillBadgeGreen}>
                            <Text style={styles.pillTextGreen}>+0.71%</Text>
                        </View>
                    </View>

                    <View style={styles.indexPill}>
                        <View style={styles.liveGreenDot} />
                        <Text style={styles.indexTitle}>BANK NIFTY</Text>
                        <Text style={styles.indexPrice}>52,180.10</Text>
                        <View style={styles.pillBadgeGreen}>
                            <Text style={styles.pillTextGreen}>+1.15%</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search stocks, sectors, indices..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Category Chips */}
            <View style={styles.chipsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                            onPress={() => setSelectedCategory(cat)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Stock Cards List */}
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.stocksList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={["#38BDF8"]} />}
            >
                {filteredStocks.map((s, idx) => {
                    const stockColor = getStockColor(s.symbol, s.sector);
                    return (
                    <TouchableOpacity 
                        key={s.id || idx} 
                        style={styles.stockCard} 
                        activeOpacity={0.8}
                        onPress={() => openTradeModal(s)}
                    >
                        {/* Left Info */}
                        <View style={styles.stockLeft}>
                            <View style={[styles.stockAvatar, { backgroundColor: stockColor + '25', borderColor: stockColor + '60' }]}>
                                <Text style={[styles.stockAvatarText, { color: stockColor }]}>
                                    {s.symbol.substring(0, 2)}
                                </Text>
                            </View>
                            <View style={styles.stockDetails}>
                                <View style={styles.symbolRow}>
                                    <Text style={styles.stockSymbol}>{s.symbol}</Text>
                                    <View style={styles.sectorBadge}>
                                        <Text style={styles.sectorText}>{s.sector}</Text>
                                    </View>
                                </View>
                                <Text style={styles.stockName} numberOfLines={1}>{s.name || s.company_name}</Text>
                            </View>
                        </View>

                        {/* Right Price & Buy Button */}
                        <View style={styles.stockRight}>
                            <Text style={styles.stockPrice}>₹{s.price}</Text>
                            <View style={[
                                styles.changePill, 
                                { backgroundColor: s.isUp ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                                  borderColor: s.isUp ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)' }
                            ]}>
                                <Ionicons 
                                    name={s.isUp ? "caret-up" : "caret-down"} 
                                    size={12} 
                                    color={s.isUp ? "#34D399" : "#F87171"} 
                                />
                                <Text style={[styles.changePercent, { color: s.isUp ? "#34D399" : "#F87171" }]}>
                                    {s.changePercent}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.quickBuyPill}
                                activeOpacity={0.8}
                                onPress={() => openTradeModal(s)}
                            >
                                <Ionicons name="cart-outline" size={12} color="#FFFFFF" style={styles.buyPillIcon} />
                                <Text style={styles.quickBuyText}>BUY</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                    );
                })}

                {filteredStocks.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={48} color="#475569" />
                        <Text style={styles.emptyTitle}>No stocks found</Text>
                        <Text style={styles.emptySub}>Try searching for another symbol or check another category.</Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom-Sheet Trade / Buy Modal */}
            <Modal
                visible={tradeModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => !orderLoading && setTradeModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={() => !orderLoading && setTradeModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    {selectedStock && (
                        <View style={styles.modalSheet}>
                            {/* Handle Bar */}
                            <View style={styles.sheetHandle} />

                            {/* Modal Header */}
                            <View style={styles.sheetHeader}>
                                <View style={styles.sheetHeaderLeft}>
                                    <View style={[styles.sheetAvatar, { 
                                        backgroundColor: getStockColor(selectedStock.symbol, selectedStock.sector) + '25',
                                        borderColor: getStockColor(selectedStock.symbol, selectedStock.sector) + '60'
                                    }]}>
                                        <Text style={[styles.sheetAvatarText, { color: getStockColor(selectedStock.symbol, selectedStock.sector) }]}>
                                            {selectedStock.symbol.substring(0, 2)}
                                        </Text>
                                    </View>
                                    <View>
                                        <View style={styles.symbolRow}>
                                            <Text style={styles.sheetSymbol}>{selectedStock.symbol}</Text>
                                            <View style={styles.sheetSectorBadge}>
                                                <Text style={styles.sheetSectorText}>{selectedStock.sector}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.sheetCompanyName} numberOfLines={1}>
                                            {selectedStock.name || selectedStock.company_name}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.closeBtn}
                                    onPress={() => !orderLoading && setTradeModalVisible(false)}
                                    disabled={orderLoading}
                                >
                                    <Ionicons name="close" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Price Strip */}
                            <View style={styles.priceStripCard}>
                                <View>
                                    <Text style={styles.priceLabel}>Current Market Price (LTP)</Text>
                                    <Text style={styles.sheetLtp}>₹{selectedStock.price || selectedStock.current_price}</Text>
                                </View>
                                <View style={[
                                    styles.sheetChangeBadge,
                                    { backgroundColor: selectedStock.isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                      borderColor: selectedStock.isUp ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)' }
                                ]}>
                                    <Ionicons 
                                        name={selectedStock.isUp ? "caret-up" : "caret-down"} 
                                        size={14} 
                                        color={selectedStock.isUp ? "#34D399" : "#F87171"} 
                                    />
                                    <Text style={[styles.sheetChangeText, { color: selectedStock.isUp ? "#34D399" : "#F87171" }]}>
                                        {selectedStock.changePercent || '+0.00%'}
                                    </Text>
                                </View>
                            </View>

                            {/* Available Margin & Status */}
                            <View style={[
                                styles.marginStatusCard,
                                isMarginSufficient ? styles.marginOkBorder : styles.marginWarnBorder
                            ]}>
                                <View style={styles.marginRow}>
                                    <View>
                                        <Text style={styles.marginSubLabel}>Available Margin</Text>
                                        <Text style={styles.marginAvailableVal}>
                                            ₹{availableMargin.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </Text>
                                    </View>
                                    <View style={styles.alignEnd}>
                                        <Text style={styles.marginSubLabel}>Required Margin</Text>
                                        <Text style={[styles.marginReqVal, !isMarginSufficient && styles.marginShortVal]}>
                                            ₹{totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.statusDivider} />

                                <View style={styles.marginIndicatorRow}>
                                    {isMarginSufficient ? (
                                        <View style={styles.sufficientBadge}>
                                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                            <Text style={styles.sufficientText}>Sufficient Margin Available</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.insufficientBadge}>
                                            <Ionicons name="alert-circle" size={14} color="#F87171" />
                                            <Text style={styles.insufficientText}>
                                                Short by ₹{marginShortfall.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={styles.orderProductType}>Delivery · Cash (CNC)</Text>
                                </View>
                            </View>

                            {/* Quantity Controls */}
                            <View style={styles.qtySection}>
                                <View style={styles.qtyHeaderRow}>
                                    <Text style={styles.qtyLabel}>Quantity (Shares)</Text>
                                    <Text style={styles.lotInfo}>NSE Lot size: 1</Text>
                                </View>

                                <View style={styles.stepperContainer}>
                                    <TouchableOpacity 
                                        style={styles.stepBtn}
                                        onPress={() => handleQtyChange(-5)}
                                        disabled={orderLoading}
                                    >
                                        <Ionicons name="remove" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <TextInput
                                        style={styles.qtyInput}
                                        keyboardType="numeric"
                                        value={orderQty}
                                        onChangeText={setOrderQty}
                                        editable={!orderLoading}
                                        selectTextOnFocus
                                    />

                                    <TouchableOpacity 
                                        style={styles.stepBtn}
                                        onPress={() => handleQtyChange(5)}
                                        disabled={orderLoading}
                                    >
                                        <Ionicons name="add" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>

                                {/* Quick Presets */}
                                <View style={styles.presetRow}>
                                    {[10, 25, 50, 100].map(val => (
                                        <TouchableOpacity 
                                            key={val} 
                                            style={styles.presetChip}
                                            onPress={() => handleQuickAdd(val)}
                                            disabled={orderLoading}
                                        >
                                            <Text style={styles.presetText}>+{val}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Summary & Place Order Action */}
                            <View style={styles.orderFooter}>
                                <View style={styles.summaryRow}>
                                    <View>
                                        <Text style={styles.estLabel}>Total Investment</Text>
                                        <Text style={styles.estAmount}>
                                            ₹{totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </Text>
                                    </View>
                                    <View style={styles.alignEnd}>
                                        <Text style={styles.estLabel}>Brokerage & Taxes</Text>
                                        <Text style={styles.brokerageZero}>₹0.00 (Zero Fee)</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.placeOrderBtn,
                                        !isMarginSufficient && styles.placeOrderWarnBtn,
                                        orderLoading && styles.placeOrderBtnDisabled
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={handlePlaceOrder}
                                    disabled={orderLoading}
                                >
                                    {orderLoading ? (
                                        <View style={styles.btnLoadingRow}>
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                            <Text style={styles.placeOrderBtnText}>EXECUTING BUY ORDER...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.btnNormalRow}>
                                            <Ionicons name="flash" size={18} color="#FFFFFF" />
                                            <Text style={styles.placeOrderBtnText}>
                                                {isMarginSufficient 
                                                    ? `BUY ${selectedStock.symbol} (${numQty} SHARES)` 
                                                    : `ADD FUNDS & BUY (${selectedStock.symbol})`
                                                }
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                        </View>
                    )}
                </KeyboardAvoidingView>
            </Modal>

            {/* In-App Alert */}
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

        </View>
    );
};

export default WatchlistScreen;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#090E1A', // Rich Dark Obsidian
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 12,
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
        borderColor: 'rgba(56, 189, 248, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandInfinity: {
        fontSize: 24,
        fontWeight: '900',
        color: '#38BDF8',
    },
    brandTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    brandSub: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    topActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fundsQuickBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.35)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    fundsIcon: {
        marginRight: 5,
    },
    fundsQuickText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#38BDF8',
    },

    /* Live Indices Scroll */
    indicesContainer: {
        marginBottom: 8,
    },
    indicesScroll: {
        paddingHorizontal: 18,
        paddingVertical: 6,
        gap: 10,
    },
    indexPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 24,
        gap: 8,
    },
    liveGreenDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#10B981',
    },
    indexTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#CBD5E1',
    },
    indexPrice: {
        fontSize: 13,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    pillBadgeGreen: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    pillTextGreen: {
        fontSize: 11,
        fontWeight: '800',
        color: '#34D399',
    },

    /* Search Bar */
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 14,
        marginHorizontal: 18,
        marginTop: 6,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
        padding: 0,
    },

    /* Chips */
    chipsWrapper: {
        marginBottom: 10,
    },
    chipsScroll: {
        paddingHorizontal: 18,
        paddingVertical: 4,
        gap: 8,
    },
    filterChip: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#38BDF8',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
    },
    filterChipTextActive: {
        color: '#FFFFFF',
    },

    /* Stock List */
    stocksList: {
        paddingHorizontal: 18,
        paddingBottom: 40,
        gap: 12,
    },
    stockCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stockLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    stockAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockAvatarText: {
        fontSize: 16,
        fontWeight: '900',
    },
    stockDetails: {
        flex: 1,
    },
    symbolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stockSymbol: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    sectorBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    sectorText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
    },
    stockName: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    stockRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    stockPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    changePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 10,
        borderWidth: 1,
        gap: 2,
    },
    changePercent: {
        fontSize: 11,
        fontWeight: '800',
    },
    quickBuyPill: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    buyPillIcon: {
        marginRight: 3,
    },
    quickBuyText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#CBD5E1',
        marginTop: 14,
    },
    emptySub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 32,
    },

    /* Bottom Sheet Modal */
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },
    modalSheet: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    sheetHandle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#475569',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sheetHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    sheetAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetAvatarText: {
        fontSize: 17,
        fontWeight: '900',
    },
    sheetSymbol: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    sheetSectorBadge: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    sheetSectorText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#38BDF8',
    },
    sheetCompanyName: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },

    /* Price Strip */
    priceStripCard: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    priceLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    sheetLtp: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 2,
    },
    sheetChangeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
    },
    sheetChangeText: {
        fontSize: 12,
        fontWeight: '800',
    },

    /* Margin Status Card */
    marginStatusCard: {
        backgroundColor: '#131D31',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
    },
    marginOkBorder: {
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    marginWarnBorder: {
        borderColor: 'rgba(239, 68, 68, 0.45)',
    },
    marginRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    marginSubLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    marginAvailableVal: {
        fontSize: 15,
        fontWeight: '800',
        color: '#38BDF8',
        marginTop: 2,
    },
    marginReqVal: {
        fontSize: 15,
        fontWeight: '900',
        color: '#10B981',
        marginTop: 2,
    },
    marginShortVal: {
        color: '#F87171',
    },
    alignEnd: {
        alignItems: 'flex-end',
    },
    statusDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 10,
    },
    marginIndicatorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sufficientBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sufficientText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#34D399',
    },
    insufficientBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    insufficientText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F87171',
    },
    orderProductType: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },

    /* Quantity Controls */
    qtySection: {
        marginBottom: 16,
    },
    qtyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    qtyLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#E2E8F0',
    },
    lotInfo: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stepBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#38BDF8',
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    presetChip: {
        flex: 1,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
    },

    /* Footer & CTA */
    orderFooter: {
        paddingTop: 10,
        gap: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    estLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    estAmount: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 2,
    },
    brokerageZero: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 2,
    },
    placeOrderBtn: {
        backgroundColor: '#10B981',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    placeOrderWarnBtn: {
        backgroundColor: '#D97706',
    },
    placeOrderBtnDisabled: {
        opacity: 0.65,
    },
    btnNormalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    btnLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    placeOrderBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
