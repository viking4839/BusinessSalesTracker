/**
 * Track Biz App with Integrated Security
 * @format
 */
import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState, View, ActivityIndicator } from 'react-native';
import { Home as HomeIcon, BarChart3, List, Package } from 'lucide-react-native';
import SecureStorage from './src/security/SecureStorage';
import { Colors } from './src/styles/Theme';
import NotificationService from './src/services/NotificationService';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AllTransactionsScreen from './src/screens/AllTransactionsScreen';
import TransactionDetailsScreen from './src/screens/TransactionDetailsScreen';
import AddCashSaleScreen from './src/screens/AddCashSaleScreen';
import BusinessProfileScreen from './src/screens/BusinessProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SalesTargetScreen from './src/screens/SalesTargetScreen';
import BusinessHoursScreen from './src/screens/BusinessHoursScreen';
import CurrencySettingsScreen from './src/screens/CurrencySettingsScreen';
import DebugScreen from './src/screens/DebugScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import EditInventoryItemScreen from './src/screens/EditInventoryItemScreen';
import CreditManagerScreen from './src/screens/CreditManagerScreen';
import ProfitMarginReportScreen from './src/screens/ProfitMarginReportScreen';
import PrivacyPolicy from './src/screens/PrivacyPolicy';
import RateApp from './src/screens/RateApp';
import SecurityScreen from './src/screens/SecurityScreen';
import PinSetupScreen from './src/screens/PinSetupScreen';
import PinUnlockScreen from './src/screens/PinUnlockScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="AddCashSale" component={AddCashSaleScreen} />
      <Stack.Screen name="CreditManager" component={CreditManagerScreen} />
      <Stack.Screen name="ProfitMarginReport" component={ProfitMarginReportScreen} />
      <Stack.Screen name="Settings" component={SettingsStack} />
    </Stack.Navigator>
  );
}

// Transactions stack
function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AllTransactionsMain" component={AllTransactionsScreen} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    </Stack.Navigator>
  );
}

// Inventory Stack
function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryMain" component={InventoryScreen} />
      <Stack.Screen name="AddInventoryItem" component={InventoryScreen} />
      <Stack.Screen name="EditInventoryItem" component={EditInventoryItemScreen} />
    </Stack.Navigator>
  );
}

// Settings Stack
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="SalesTarget" component={SalesTargetScreen} />
      <Stack.Screen name="BusinessHours" component={BusinessHoursScreen} />
      <Stack.Screen name="CurrencySettings" component={CurrencySettingsScreen} />
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <Stack.Screen name="RateApp" component={RateApp} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }}/>
    </Stack.Navigator>
  );
}

// Main App Tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          height: 75,
          paddingTop: -2,
          paddingBottom: 12,
          backgroundColor: '#FFFFFF',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          marginTop: 4,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} size={26} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color }) => <BarChart3 color={color} size={26} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color }) => <Package color={color} size={26} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color }) => <List color={color} size={26} strokeWidth={2.5} />,
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    checkSecurityStatus();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        checkIfLocked();
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  useEffect(() => {
    // Initialize notifications on app startup
    const initNotifications = async () => {
      await NotificationService.initialize();
      await NotificationService.checkAllAlerts();
    };
    initNotifications();
  }, []);

  const checkSecurityStatus = async () => {
    try {
      const pinSet = await SecureStorage.isPinSet();

      if (pinSet) {
        setPinRequired(true);
        setIsAuthenticated(false);
      } else {
        setPinRequired(false);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Security check error:', error);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfLocked = async () => {
    const isLocked = SecureStorage.isLocked();
    if (isLocked && pinRequired) {
      setIsAuthenticated(false);
    }
  };

  const handleUnlock = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && pinRequired ? (
          // Show unlock screen
          <RootStack.Screen name="PinUnlock">
            {props => <PinUnlockScreen {...props} onUnlock={handleUnlock} />}
          </RootStack.Screen>
        ) : !pinRequired ? (
          // First time setup - offer PIN setup
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="PinSetup" component={PinSetupScreen} />
          </>
        ) : (
          // Authenticated - show main app
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="PinSetup" component={PinSetupScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default App;