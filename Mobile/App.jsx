import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import store, { persistor } from './src/Services/store';
import SatckNavigation from './src/NavigationStacks/SatckNavigation';
import socket from './src/Services/socket';

export const navigationRef = createNavigationContainerRef();

const Loader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#14367E" />
  </View>
);

const AppContent = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.action);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const handleGlobalLogout = async (data) => {
      const targetId = data?.user_id;
      const myId = userRef.current?.id;
      if (!targetId || !myId || String(targetId) === String(myId)) {
        console.log('[Global Socket] Triggering instant auto-logout for user:', targetId);
        try {
          await AsyncStorage.removeItem('user_session');
        } catch (e) {
          console.error('Error clearing user session:', e);
        }
        dispatch({ type: 'LOGOUT_USER' });
        dispatch({ type: 'SET_USER', payload: null });
        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }
    };

    socket.on('FORCE_LOGOUT', handleGlobalLogout);
    socket.on('USER_DELETED', handleGlobalLogout);

    return () => {
      socket.off('FORCE_LOGOUT', handleGlobalLogout);
      socket.off('USER_DELETED', handleGlobalLogout);
    };
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" translucent={false} />
      <NavigationContainer ref={navigationRef}>
        <SatckNavigation />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;