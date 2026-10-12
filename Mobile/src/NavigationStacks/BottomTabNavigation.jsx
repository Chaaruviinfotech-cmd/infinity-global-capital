import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../Screens/HomeScreen';
import WatchlistScreen from '../Screens/WatchlistScreen';
import PortfolioScreen from '../Screens/PortfolioScreen';
import FundsScreen from '../Screens/FundsScreen';
import KycScreen from '../Screens/KycScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
    active: '#38BDF8',   // Electric Cyan
    inactive: '#64748B', // Muted Slate
    bg: '#0F172A',       // Dark Obsidian Slate
};

const ICONS = {
    Home: ['home', 'home-outline'],
    Watchlist: ['bookmark', 'bookmark-outline'],
    Portfolio: ['briefcase', 'briefcase-outline'],
    Funds: ['wallet', 'wallet-outline'],
    KYC: ['shield-checkmark', 'shield-checkmark-outline'],
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const safePaddingBottom = Math.max(insets.bottom, 12);

    return (
        <View style={[styles.bar, { paddingBottom: safePaddingBottom }]}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel ?? options.title ?? route.name;
                const isFocused = state.index === index;
                const [activeIcon, inactiveIcon] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        activeOpacity={0.7}
                        style={styles.tab}
                    >
                        <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                            <Ionicons
                                name={isFocused ? activeIcon : inactiveIcon}
                                size={22}
                                color={isFocused ? COLORS.active : COLORS.inactive}
                            />
                        </View>
                        <Text
                            style={[
                                styles.label,
                                { color: isFocused ? COLORS.active : COLORS.inactive },
                            ]}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const BottomTabNavigation = () => {
    return (
        <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Watchlist" component={WatchlistScreen} />
            <Tab.Screen name="Portfolio" component={PortfolioScreen} />
            <Tab.Screen name="Funds" component={FundsScreen} />
            <Tab.Screen name="KYC" component={KycScreen} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigation;

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        backgroundColor: COLORS.bg,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 12,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
    },
    iconWrapperActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
        letterSpacing: 0.3,
    },
});