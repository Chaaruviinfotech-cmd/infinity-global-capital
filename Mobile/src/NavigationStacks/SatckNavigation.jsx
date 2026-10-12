import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const SatckNavigation = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#0F172A' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen name="Splash" getComponent={() => require('../Screens/SplashScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="Login" getComponent={() => require('../Screens/LoginScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" getComponent={() => require('../Screens/SignupScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="OtpVerify" getComponent={() => require('../Screens/OtpVerifyScreen').default} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" getComponent={() => require('../Screens/ProfileScreen').default} options={{ title: 'Profile / Settings' }} />
            <Stack.Screen name="Main" getComponent={() => require('./BottomTabNavigation').default} options={{ headerShown: false }} />
            <Stack.Screen name="Docs" getComponent={() => require('../Screens/DocsScreen').default} options={{ title: 'Documentation' }} />
          
        </Stack.Navigator>
    );
};

export default SatckNavigation;


