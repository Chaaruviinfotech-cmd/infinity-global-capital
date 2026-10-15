import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Default admin stocks fallback while network syncs
const DEFAULT_ADMIN_STOCKS = [
    { symbol: 'AJ', company_name: 'AJ Ltd', name: 'AJ Ltd', current_price: 2400.00, open_price: 2345.00, high_price: 2420.00, low_price: 2330.00, prev_close: 2300.00, day_change: 100.00, day_change_percent: 4.35, volume: '3.5M', sector: 'Banking' },
    { symbol: 'RELIANCE', company_name: 'Reliance Industries Ltd', name: 'Reliance Industries', current_price: 2942.50, open_price: 2924.00, high_price: 2955.00, low_price: 2915.00, prev_close: 2904.30, day_change: 38.20, day_change_percent: 1.31, volume: '7.2M', sector: 'Energy' },
    { symbol: 'TCS', company_name: 'Tata Consultancy Services', name: 'Tata Consultancy Services', current_price: 4215.80, open_price: 4208.00, high_price: 4235.00, low_price: 4195.00, prev_close: 4167.20, day_change: 48.60, day_change_percent: 1.17, volume: '3.4M', sector: 'IT Tech' },
    { symbol: 'HDFCBANK', company_name: 'HDFC Bank Ltd', name: 'HDFC Bank Ltd', current_price: 1682.40, open_price: 1696.00, high_price: 1702.00, low_price: 1678.00, prev_close: 1694.70, day_change: -12.30, day_change_percent: -0.73, volume: '9.1M', sector: 'Banking' },
    { symbol: 'INFY', company_name: 'Infosys Limited', name: 'Infosys Ltd', current_price: 1945.20, open_price: 1940.00, high_price: 1960.00, low_price: 1932.00, prev_close: 1918.40, day_change: 26.80, day_change_percent: 1.40, volume: '5.8M', sector: 'IT Tech' },
    { symbol: 'TATAMOTORS', company_name: 'Tata Motors Ltd', name: 'Tata Motors Ltd', current_price: 968.50, open_price: 964.00, high_price: 978.00, low_price: 956.00, prev_close: 950.30, day_change: 18.20, day_change_percent: 1.91, volume: '11.4M', sector: 'Automobile' },
    { symbol: 'ICICIBANK', company_name: 'ICICI Bank Ltd', name: 'ICICI Bank Ltd', current_price: 1245.00, open_price: 1235.00, high_price: 1260.00, low_price: 1225.00, prev_close: 1229.40, day_change: 15.60, day_change_percent: 1.27, volume: '5.1M', sector: 'Banking' }
];

// Deterministic hash to generate natural, consistent price variations for any dynamic stock
const getDeterministicFactor = (str, idx) => {
    let hash = 0;
    const combined = `${str}_${idx}`;
    for (let i = 0; i < combined.length; i++) {
        hash = (hash << 5) - hash + combined.charCodeAt(i);
        hash |= 0;
    }
    const normalized = (Math.abs(hash) % 1000) / 1000;
    return (normalized - 0.45) * 0.035;
};

// Generates 7 date-wise OHLC candles based on stock's real current_price, open, high, low, prev_close
const generateCandlesForStock = (stock, timeframe = '1W') => {
    if (!stock) return [];
    const currPrice = Number(stock.current_price || stock.price || 1000);
    const prevClose = Number(stock.prev_close || (currPrice * 0.99));
    const dayOpen = Number(stock.open_price || ((currPrice + prevClose) / 2));
    const dayHigh = Number(stock.high_price || (Math.max(dayOpen, currPrice) * 1.012));
    const dayLow = Number(stock.low_price || (Math.min(dayOpen, currPrice) * 0.988));
    const vol = stock.volume || '2.4M';
    const sym = stock.symbol || 'STOCK';

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const candleData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        if (timeframe === '1D') {
            const hours = ['09:15', '10:15', '11:15', '12:15', '13:15', '14:15', '15:30'];
            d.setHours(9 + i);
            const label = hours[6 - i];
            if (i === 0) {
                candleData.push({
                    date: label,
                    open: dayOpen,
                    high: dayHigh,
                    low: dayLow,
                    close: currPrice,
                    volume: vol,
                });
            } else {
                const factor = getDeterministicFactor(sym, i);
                const stepClose = +(currPrice * (1 + factor * (i / 6))).toFixed(2);
                const stepOpen = +(stepClose * (1 - factor * 0.5)).toFixed(2);
                const stepHigh = +(Math.max(stepOpen, stepClose) * 1.008).toFixed(2);
                const stepLow = +(Math.min(stepOpen, stepClose) * 0.992).toFixed(2);
                candleData.unshift({
                    date: label,
                    open: stepOpen,
                    high: stepHigh,
                    low: stepLow,
                    close: stepClose,
                    volume: `${(parseFloat(vol) * (0.7 + (i % 4) * 0.1)).toFixed(1)}M`,
                });
            }
        } else if (timeframe === '1M') {
            d.setDate(d.getDate() - (i * 4));
            const label = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
            if (i === 0) {
                candleData.push({
                    date: label,
                    open: dayOpen,
                    high: dayHigh,
                    low: dayLow,
                    close: currPrice,
                    volume: vol,
                });
            } else {
                const factor = getDeterministicFactor(sym, i * 2);
                const stepClose = +(currPrice * (1 + factor * (i / 4))).toFixed(2);
                const stepOpen = +(stepClose * (1 - factor * 0.6)).toFixed(2);
                const stepHigh = +(Math.max(stepOpen, stepClose) * 1.015).toFixed(2);
                const stepLow = +(Math.min(stepOpen, stepClose) * 0.985).toFixed(2);
                candleData.unshift({
                    date: label,
                    open: stepOpen,
                    high: stepHigh,
                    low: stepLow,
                    close: stepClose,
                    volume: `${(parseFloat(vol) * (0.8 + (i % 3) * 0.15)).toFixed(1)}M`,
                });
            }
        } else if (timeframe === '1Y') {
            d.setMonth(d.getMonth() - (i * 2));
            const label = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
            if (i === 0) {
                candleData.push({
                    date: label,
                    open: dayOpen,
                    high: dayHigh,
                    low: dayLow,
                    close: currPrice,
                    volume: vol,
                });
            } else {
                const factor = getDeterministicFactor(sym, i * 5);
                const stepClose = +(currPrice * (1 + factor * 2)).toFixed(2);
                const stepOpen = +(stepClose * (1 - factor * 0.8)).toFixed(2);
                const stepHigh = +(Math.max(stepOpen, stepClose) * 1.025).toFixed(2);
                const stepLow = +(Math.min(stepOpen, stepClose) * 0.975).toFixed(2);
                candleData.unshift({
                    date: label,
                    open: stepOpen,
                    high: stepHigh,
                    low: stepLow,
                    close: stepClose,
                    volume: `${(parseFloat(vol) * (1.1 + (i % 5) * 0.2)).toFixed(1)}M`,
                });
            }
        } else {
            // Default: '1W' (7 consecutive trading days)
            d.setDate(d.getDate() - i);
            const label = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
            if (i === 0) {
                candleData.push({
                    date: label,
                    open: dayOpen,
                    high: dayHigh,
                    low: dayLow,
                    close: currPrice,
                    volume: vol,
                });
            } else {
                const factor = getDeterministicFactor(sym, i);
                const stepClose = +(currPrice * (1 + factor)).toFixed(2);
                const stepOpen = +(stepClose * (1 - factor * 0.7)).toFixed(2);
                const stepHigh = +(Math.max(stepOpen, stepClose) * 1.01).toFixed(2);
                const stepLow = +(Math.min(stepOpen, stepClose) * 0.99).toFixed(2);
                candleData.unshift({
                    date: label,
                    open: stepOpen,
                    high: stepHigh,
                    low: stepLow,
                    close: stepClose,
                    volume: `${(parseFloat(vol) * (0.75 + (i % 3) * 0.15)).toFixed(1)}M`,
                });
            }
        }
    }

    return candleData;
};

const CandleStickChart = ({ onSelectStock, stockList = [] }) => {
    const stocks = useMemo(() => {
        if (Array.isArray(stockList) && stockList.length > 0) {
            return stockList;
        }
        return DEFAULT_ADMIN_STOCKS;
    }, [stockList]);

    const [selectedSymbol, setSelectedSymbol] = useState(stocks[0]?.symbol || 'AJ');
    const [timeframe, setTimeframe] = useState('1W');
    const [selectedCandleIndex, setSelectedCandleIndex] = useState(null);

    // Keep active stock in sync with selected symbol or fallback to first stock
    const activeStock = useMemo(() => {
        return stocks.find(s => s.symbol === selectedSymbol) || stocks[0] || DEFAULT_ADMIN_STOCKS[0];
    }, [stocks, selectedSymbol]);

    // Generate dynamic date-wise OHLC candles for the selected stock & timeframe
    const candles = useMemo(() => {
        return generateCandlesForStock(activeStock, timeframe);
    }, [activeStock, timeframe]);

    // Default to the last candle (latest date) if none selected
    const activeCandle = (selectedCandleIndex !== null && candles[selectedCandleIndex])
        ? candles[selectedCandleIndex]
        : (candles[candles.length - 1] || { open: 0, high: 0, low: 0, close: 0, volume: '0M', date: 'Today' });

    const candleChange = activeCandle.close - activeCandle.open;
    const candleChangePercent = activeCandle.open > 0 ? ((candleChange / activeCandle.open) * 100).toFixed(2) : '0.00';
    const isCandleUp = candleChange >= 0;

    // Calculate Dynamic Min / Max for Chart Vertical Scale
    const { minPrice, maxPrice, priceRange } = useMemo(() => {
        let min = Infinity;
        let max = -Infinity;
        candles.forEach(c => {
            if (c.low < min) min = c.low;
            if (c.high > max) max = c.high;
        });
        const padding = (max - min) * 0.1 || 10;
        return {
            minPrice: Math.floor(min - padding),
            maxPrice: Math.ceil(max + padding),
            priceRange: Math.max(1, (max + padding) - (min - padding))
        };
    }, [candles]);

    const CHART_HEIGHT = 160;

    return (
        <View style={styles.cardContainer}>

            {/* Header: Title + Timeframes */}
            <View style={styles.topRow}>
                <View style={styles.titleBox}>
                    <Ionicons name="bar-chart" size={18} color="#38BDF8" />
                    <Text style={styles.cardTitle}>Candlestick Chart (OHLC)</Text>
                </View>
                <View style={styles.timeframeRow}>
                    {['1D', '1W', '1M', '1Y'].map(tf => (
                        <TouchableOpacity
                            key={tf}
                            onPress={() => setTimeframe(tf)}
                            style={[styles.tfBtn, timeframe === tf && styles.tfBtnActive]}
                        >
                            <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>{tf}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Company Selection Horizontal Pills from Dynamic Stocks */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.companyScroll}
            >
                {stocks.map(stk => {
                    const sym = stk.symbol;
                    const isSelected = selectedSymbol === sym;
                    const price = Number(stk.current_price || stk.price || 0);
                    return (
                        <TouchableOpacity
                            key={sym}
                            onPress={() => {
                                setSelectedSymbol(sym);
                                setSelectedCandleIndex(null);
                                if (onSelectStock) onSelectStock(sym);
                            }}
                            style={[styles.companyPill, isSelected && styles.companyPillActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.companyPillSymbol, isSelected && styles.companyPillSymbolActive]}>
                                {sym}
                            </Text>
                            <Text style={[styles.companyPillPrice, isSelected && styles.companyPillPriceActive]}>
                                ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Active Candle Scrubber / HUD Details */}
            <View style={styles.hudCard}>
                <View style={styles.hudTop}>
                    <View>
                        <Text style={styles.hudCompany}>{activeStock.name || activeStock.company_name} ({activeStock.symbol})</Text>
                        <Text style={styles.hudDate}>📅 Date: {activeCandle.date} 2026</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.hudPrice}>₹{activeCandle.close.toFixed(2)}</Text>
                        <Text style={[styles.hudPnl, { color: isCandleUp ? '#10B981' : '#EF4444' }]}>
                            {isCandleUp ? '+' : ''}₹{candleChange.toFixed(2)} ({isCandleUp ? '+' : ''}{candleChangePercent}%)
                        </Text>
                    </View>
                </View>

                {/* 4 Metric Pills: Open, High, Low, Vol */}
                <View style={styles.hudMetricsRow}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Open</Text>
                        <Text style={styles.metricVal}>₹{activeCandle.open.toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>High</Text>
                        <Text style={[styles.metricVal, { color: '#10B981' }]}>₹{activeCandle.high.toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Low</Text>
                        <Text style={[styles.metricVal, { color: '#EF4444' }]}>₹{activeCandle.low.toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Volume</Text>
                        <Text style={styles.metricVal}>{activeCandle.volume}</Text>
                    </View>
                </View>
            </View>

            {/* Candlestick Graphic Area */}
            <View style={styles.chartArea}>

                {/* Horizontal Price Gridlines & Labels */}
                <View style={styles.gridLineContainer}>
                    <View style={styles.gridLine}>
                        <View style={styles.gridDash} />
                        <Text style={styles.gridPriceText}>₹{maxPrice}</Text>
                    </View>
                    <View style={styles.gridLine}>
                        <View style={styles.gridDash} />
                        <Text style={styles.gridPriceText}>₹{Math.round((maxPrice + minPrice) / 2)}</Text>
                    </View>
                    <View style={styles.gridLine}>
                        <View style={styles.gridDash} />
                        <Text style={styles.gridPriceText}>₹{minPrice}</Text>
                    </View>
                </View>

                {/* Candlestick Bars Row */}
                <View style={[styles.candlesRow, { height: CHART_HEIGHT }]}>
                    {candles.map((c, idx) => {
                        const isUp = c.close >= c.open;
                        const candleColor = isUp ? '#10B981' : '#EF4444';
                        const isSelected = (selectedCandleIndex === idx) || (selectedCandleIndex === null && idx === candles.length - 1);

                        // Position calculations relative to CHART_HEIGHT
                        const highY = ((maxPrice - c.high) / priceRange) * CHART_HEIGHT;
                        const lowY = ((maxPrice - c.low) / priceRange) * CHART_HEIGHT;
                        const wickHeight = Math.max(2, lowY - highY);

                        const bodyTopPrice = Math.max(c.open, c.close);
                        const bodyBottomPrice = Math.min(c.open, c.close);
                        const bodyTopY = ((maxPrice - bodyTopPrice) / priceRange) * CHART_HEIGHT;
                        const bodyBottomY = ((maxPrice - bodyBottomPrice) / priceRange) * CHART_HEIGHT;
                        const bodyHeight = Math.max(4, bodyBottomY - bodyTopY);

                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.8}
                                onPress={() => setSelectedCandleIndex(idx)}
                                style={styles.candleColumn}
                            >
                                {/* Upper and Lower Wick Line */}
                                <View
                                    style={[
                                        styles.wickLine,
                                        {
                                            top: highY,
                                            height: wickHeight,
                                            backgroundColor: candleColor
                                        }
                                    ]}
                                />

                                {/* Candle Body Rectangle */}
                                <View
                                    style={[
                                        styles.candleBody,
                                        {
                                            top: bodyTopY,
                                            height: bodyHeight,
                                            backgroundColor: candleColor,
                                            borderColor: isSelected ? '#38BDF8' : candleColor,
                                            borderWidth: isSelected ? 1.5 : 0,
                                            shadowColor: isSelected ? '#38BDF8' : candleColor,
                                            shadowOpacity: isSelected ? 0.8 : 0.2,
                                            shadowRadius: isSelected ? 6 : 2,
                                            elevation: isSelected ? 4 : 1
                                        }
                                    ]}
                                />

                                {/* Date Label Under Candle */}
                                <View style={styles.dateLabelBox}>
                                    <Text style={[styles.dateLabelText, isSelected && styles.dateLabelActive]}>
                                        {c.date}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Footer Hint */}
            <View style={styles.footerRow}>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                <Text style={styles.footerText}>
                    Tap any candle above to inspect detailed Open, High, Low, Close & Volume.
                </Text>
            </View>

        </View>
    );
};

export default React.memo(CandleStickChart);

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#0F172A',
        borderRadius: 18,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 20,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    topRow: {
        gap: 12,
        marginBottom: 12,
    },
    titleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    timeframeRow: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 2,
    },
    tfBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tfBtnActive: {
        backgroundColor: '#38BDF8',
    },
    tfText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
    },
    tfTextActive: {
        color: '#0F172A',
        fontWeight: '900',
    },
    companyScroll: {
        gap: 8,
        paddingBottom: 10,
    },
    companyPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    companyPillActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38BDF8',
    },
    companyPillSymbol: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
    },
    companyPillSymbolActive: {
        color: '#38BDF8',
    },
    companyPillPrice: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
    },
    companyPillPriceActive: {
        color: '#FFFFFF',
    },
    hudCard: {
        backgroundColor: '#162032',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    hudTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    hudCompany: {
        fontSize: 13,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    hudDate: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    hudPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    hudPnl: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 2,
    },
    hudMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    metricVal: {
        fontSize: 11,
        fontWeight: '800',
        color: '#CBD5E1',
        marginTop: 2,
    },
    chartArea: {
        position: 'relative',
        height: 195,
        backgroundColor: '#0B1120',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    gridLineContainer: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        height: 160,
        justifyContent: 'space-between',
        pointerEvents: 'none',
    },
    gridLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    gridDash: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginRight: 6,
    },
    gridPriceText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#475569',
    },
    candlesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        position: 'relative',
    },
    candleColumn: {
        flex: 1,
        height: 160,
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
    },
    wickLine: {
        position: 'absolute',
        width: 1.5,
        borderRadius: 1,
    },
    candleBody: {
        position: 'absolute',
        width: 14,
        borderRadius: 3,
    },
    dateLabelBox: {
        position: 'absolute',
        bottom: -25,
        alignItems: 'center',
    },
    dateLabelText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
    },
    dateLabelActive: {
        color: '#38BDF8',
        fontWeight: '900',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    footerText: {
        fontSize: 10,
        color: '#64748B',
        flex: 1,
        lineHeight: 14,
    },
});
