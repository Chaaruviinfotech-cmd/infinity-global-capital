import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Platform,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPortfolioAction, fetchFundsAction } from '../Services/Actions/getApis';
import { placeOrderAction } from '../Services/Actions/postApis';
import Loader from '../Components/Loader';
import Alert from '../Components/Alert';
import socket from '../Services/socket';

const PortfolioScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user, portfolioData } = useSelector(state => state.action);
    const [loading, setLoading] = useState(true);

    // Sell / Square-off Modal State
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [sellQty, setSellQty] = useState('1');
    const [sellLoading, setSellLoading] = useState(false);
    const sellInFlightRef = useRef(false);

    // Custom In-App Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        type: 'success',
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: null
    });

    const showAlert = (type, title, message, confirmText = 'OK', onConfirm = null, cancelText = '') => {
        setAlertConfig({
            type,
            title,
            message,
            confirmText,
            cancelText,
            onConfirm: onConfirm || (() => setAlertVisible(false))
        });
        setAlertVisible(true);
    };

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

    const openSellModal = (h) => {
        setSelectedHolding(h);
        setSellQty(String(h.quantity || 1));
        setSellModalVisible(true);
    };

    const handleSellQtyChange = (delta) => {
        if (!selectedHolding) return;
        const maxQty = selectedHolding.quantity || 1;
        const current = parseInt(sellQty, 10) || 0;
        const next = Math.min(maxQty, Math.max(1, current + delta));
        setSellQty(next.toString());
    };

    const handleQuickSellPercent = (pct) => {
        if (!selectedHolding) return;
        const maxQty = selectedHolding.quantity || 1;
        if (pct === 100) {
            setSellQty(maxQty.toString());
        } else {
            const calc = Math.max(1, Math.floor((maxQty * pct) / 100));
            setSellQty(calc.toString());
        }
    };

    const handleExecuteSell = async () => {
        if (sellInFlightRef.current || sellLoading) return;
        if (!selectedHolding) return;

        const numQty = parseInt(sellQty, 10) || 0;
        const maxQty = selectedHolding.quantity || 0;

        if (numQty <= 0) {
            showAlert('warning', 'Invalid Quantity', 'Please select at least 1 share to sell.');
            return;
        }
        if (numQty > maxQty) {
            showAlert('warning', 'Exceeds Holding', `You only hold ${maxQty} shares of ${selectedHolding.stock_symbol}.`);
            return;
        }

        sellInFlightRef.current = true;
        setSellLoading(true);

        try {
            const userId = userRef.current?.id || 1;
            const currentPrice = Number(selectedHolding.current_price || 0);
            const expectedProceeds = Number((numQty * currentPrice).toFixed(2));

            const res = await dispatch(placeOrderAction({
                user_id: userId,
                stock_symbol: selectedHolding.stock_symbol,
                quantity: numQty,
                order_type: 'SELL',
                price: currentPrice
            }));

            setSellLoading(false);
            sellInFlightRef.current = false;

            if (res && res.success) {
                setSellModalVisible(false);
                await Promise.all([
                    fetchPortfolio(),
                    dispatch(fetchFundsAction(userId))
                ]);

                showAlert(
                    'success',
                    'Position Squared Off!',
                    `Sold ${numQty} shares of ${selectedHolding.stock_symbol} at ₹${currentPrice.toFixed(2)}.\n\n₹${expectedProceeds.toLocaleString('en-IN', {minimumFractionDigits: 2})} has been credited to your Trading Margin cash!\n\nYou can trade again or withdraw this money from the Funds screen.`,
                    'Go to Funds (Withdraw)',
                    () => {
                        setAlertVisible(false);
                        navigation.navigate('Funds');
                    },
                    'Done'
                );
            } else {
                showAlert('error', 'Sell Failed', res?.message || 'Could not complete sell order.');
            }
        } catch (err) {
            setSellLoading(false);
            sellInFlightRef.current = false;
            showAlert('error', 'Error', 'Failed to execute sell order. Please retry.');
        }
    };

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

    // Numerical Calculations for the Sell Modal
    const currentSellPrice = selectedHolding ? Number(selectedHolding.current_price || 0) : 0;
    const avgBuyPrice = selectedHolding ? Number(selectedHolding.avg_price || 0) : 0;
    const numSellQty = parseInt(sellQty, 10) || 0;
    const totalReturnCash = Number((numSellQty * currentSellPrice).toFixed(2));
    const costBasis = Number((numSellQty * avgBuyPrice).toFixed(2));
    const bookedPnl = Number((totalReturnCash - costBasis).toFixed(2));
    const bookedPnlPercent = costBasis > 0 ? ((bookedPnl / costBasis) * 100).toFixed(2) : '0.00';
    const isProfit = bookedPnl >= 0;

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
                                color={summary.total_pnl >= 0 ? "#34D399" : "#EF4444"} 
                            />
                            <Text style={[styles.pnlBadgeText, {color: summary.total_pnl >= 0 ? "#34D399" : "#EF4444"}]}>
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
                                
                                <View style={styles.rowActions}>
                                    {/* PnL Pill */}
                                    <View style={[styles.stockPnlPill, {backgroundColor: stock.pnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}]}>
                                        <Text style={[styles.stockPnlText, {color: stock.pnl >= 0 ? '#34D399' : '#EF4444'}]}>
                                            {stock.pnl >= 0 ? '+' : ''}₹{stock.pnl.toLocaleString('en-IN', {minimumFractionDigits: 2})} ({stock.pnl >= 0 ? '+' : ''}{stock.pnl_percent.toFixed(2)}%)
                                        </Text>
                                    </View>

                                    {/* SELL / Square Off Button */}
                                    <TouchableOpacity 
                                        style={styles.sellBtnPill} 
                                        activeOpacity={0.8}
                                        onPress={() => openSellModal(stock)}
                                    >
                                        <Ionicons name="arrow-up-circle-outline" size={13} color="#FFFFFF" style={{marginRight: 4}} />
                                        <Text style={styles.sellBtnText}>SELL</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {holdings.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="briefcase-outline" size={48} color="#475569" />
                            <Text style={styles.emptyTitle}>No Active Stock Positions</Text>
                            <Text style={styles.emptySub}>You don't hold any stocks right now or all positions have been squared off.</Text>
                            <TouchableOpacity 
                                style={styles.exploreBtn} 
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('Watchlist')}
                            >
                                <Ionicons name="trending-up" size={16} color="#0F172A" style={{marginRight: 6}} />
                                <Text style={styles.exploreBtnText}>Explore Market Stocks &rarr;</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* Bottom-Sheet Sell / Square Off Modal */}
            <Modal
                visible={sellModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => !sellLoading && setSellModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={() => !sellLoading && setSellModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    {selectedHolding && (
                        <View style={styles.modalSheet}>
                            {/* Handle Bar */}
                            <View style={styles.sheetHandle} />

                            {/* Modal Header */}
                            <View style={styles.sheetHeader}>
                                <View style={styles.sheetHeaderLeft}>
                                    <View style={styles.sellAvatar}>
                                        <Text style={styles.sellAvatarText}>
                                            {selectedHolding.stock_symbol.substring(0, 2)}
                                        </Text>
                                    </View>
                                    <View>
                                        <View style={styles.symbolRow}>
                                            <Text style={styles.sheetSymbol}>{selectedHolding.stock_symbol}</Text>
                                            <View style={styles.sellTypeBadge}>
                                                <Text style={styles.sellTypeText}>SELL POSITION</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.sheetCompanyName} numberOfLines={1}>
                                            {selectedHolding.company_name || selectedHolding.stock_symbol}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.closeBtn}
                                    onPress={() => !sellLoading && setSellModalVisible(false)}
                                    disabled={sellLoading}
                                >
                                    <Ionicons name="close" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Price Strip */}
                            <View style={styles.priceStripCard}>
                                <View>
                                    <Text style={styles.priceLabel}>Current Market Price (LTP)</Text>
                                    <Text style={styles.sheetLtp}>₹{currentSellPrice.toFixed(2)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.priceLabel}>Avg Buy Price</Text>
                                    <Text style={styles.sheetAvgBuy}>₹{avgBuyPrice.toFixed(2)}</Text>
                                </View>
                            </View>

                            {/* Quantity Controls */}
                            <View style={styles.qtySection}>
                                <View style={styles.qtyHeaderRow}>
                                    <Text style={styles.qtyLabel}>Shares to Sell (Holdings: {selectedHolding.quantity})</Text>
                                    <Text style={styles.lotInfo}>NSE Lot size: 1</Text>
                                </View>

                                <View style={styles.stepperContainer}>
                                    <TouchableOpacity 
                                        style={styles.stepBtn}
                                        onPress={() => handleSellQtyChange(-1)}
                                        disabled={sellLoading}
                                    >
                                        <Ionicons name="remove" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <TextInput
                                        style={styles.qtyInput}
                                        keyboardType="numeric"
                                        value={sellQty}
                                        onChangeText={setSellQty}
                                        editable={!sellLoading}
                                        selectTextOnFocus
                                    />

                                    <TouchableOpacity 
                                        style={styles.stepBtn}
                                        onPress={() => handleSellQtyChange(1)}
                                        disabled={sellLoading}
                                    >
                                        <Ionicons name="add" size={20} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>

                                {/* Quick Percentage Chips */}
                                <View style={styles.presetRow}>
                                    {[25, 50, 75, 100].map(pct => (
                                        <TouchableOpacity 
                                            key={pct} 
                                            style={styles.presetChip}
                                            onPress={() => handleQuickSellPercent(pct)}
                                            disabled={sellLoading}
                                        >
                                            <Text style={styles.presetText}>{pct === 100 ? 'SELL ALL' : `${pct}%`}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Financial Summary Breakdown */}
                            <View style={styles.returnSummaryCard}>
                                <View style={styles.summaryItemRow}>
                                    <Text style={styles.returnLabel}>Cash Returning to Wallet</Text>
                                    <Text style={styles.returnAmount}>+₹{totalReturnCash.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                                </View>
                                <View style={styles.summaryItemRow}>
                                    <Text style={styles.returnSubLabel}>Booked Realized P&L</Text>
                                    <Text style={[styles.pnlHighlight, { color: isProfit ? '#34D399' : '#EF4444' }]}>
                                        {isProfit ? '+' : ''}₹{bookedPnl.toLocaleString('en-IN', {minimumFractionDigits: 2})} ({isProfit ? '+' : ''}{bookedPnlPercent}%)
                                    </Text>
                                </View>
                                <View style={styles.summaryItemRow}>
                                    <Text style={styles.returnSubLabel}>Exchange Brokerage</Text>
                                    <Text style={styles.zeroBrokerage}>₹0.00 (Zero Fee)</Text>
                                </View>
                            </View>

                            {/* Confirm Sell CTA */}
                            <TouchableOpacity
                                style={[
                                    styles.confirmSellBtn,
                                    (sellLoading || sellInFlightRef.current) && styles.btnDisabled
                                ]}
                                activeOpacity={0.85}
                                onPress={handleExecuteSell}
                                disabled={sellLoading || sellInFlightRef.current}
                            >
                                {sellLoading ? (
                                    <View style={styles.btnRow}>
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                        <Text style={styles.confirmSellBtnText}>EXECUTING SELL & CREDIT...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.btnRow}>
                                        <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                                        <Text style={styles.confirmSellBtnText}>
                                            CONFIRM SELL & CREDIT ₹{totalReturnCash.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                        </View>
                    )}
                </KeyboardAvoidingView>
            </Modal>

            {/* Custom In-App Alert */}
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
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 6,
    },
    summaryGlow: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#38BDF8',
        opacity: 0.15,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 18,
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
        color: '#EF4444',
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
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stockPnlPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    stockPnlText: {
        fontSize: 12,
        fontWeight: '800',
    },
    sellBtnPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
    },
    sellBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },

    /* Empty State */
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 14,
    },
    emptySub: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 18,
        lineHeight: 18,
    },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#38BDF8',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    exploreBtnText: {
        color: '#0F172A',
        fontWeight: '900',
        fontSize: 13,
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
    },

    /* Bottom-Sheet Modal Styles */
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    modalSheet: {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    sheetHandle: {
        width: 44,
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sheetHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    sellAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sellAvatarText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '900',
    },
    symbolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sheetSymbol: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
    },
    sellTypeBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sellTypeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#EF4444',
    },
    sheetCompanyName: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceStripCard: {
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    priceLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sheetLtp: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 2,
    },
    sheetAvgBuy: {
        fontSize: 17,
        fontWeight: '800',
        color: '#CBD5E1',
        marginTop: 2,
    },

    /* Qty Stepper */
    qtySection: {
        marginBottom: 16,
    },
    qtyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    qtyLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    lotInfo: {
        fontSize: 11,
        color: '#64748B',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        paddingVertical: 8,
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    presetChip: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#38BDF8',
    },

    /* Return Summary Card */
    returnSummaryCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 10,
    },
    summaryItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    returnLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    returnAmount: {
        fontSize: 18,
        fontWeight: '900',
        color: '#34D399',
    },
    returnSubLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    },
    pnlHighlight: {
        fontSize: 13,
        fontWeight: '800',
    },
    zeroBrokerage: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '700',
    },

    /* Action Button */
    confirmSellBtn: {
        backgroundColor: '#EF4444',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: {
        opacity: 0.7,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    confirmSellBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
