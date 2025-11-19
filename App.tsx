/**
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Home as HomeIcon, BarChart3, List, Package } from 'lucide-react-native';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="AddCashSale" component={AddCashSaleScreen} />
      <Stack.Screen name="Settings" component={SettingsStack} />
    </Stack.Navigator>
  );
}

// New Transactions stack
function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AllTransactionsMain" component={AllTransactionsScreen} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    </Stack.Navigator>
  );
}

// NEW: Inventory Stack
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

    </Stack.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            height: 75, // Increased from 65
            paddingTop: -2, // Increased from 8
            paddingBottom: 12, // Increased from 8
            backgroundColor: '#FFFFFF',
            elevation: 8, // Added shadow for Android
            shadowColor: '#000', // Added shadow for iOS
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarItemStyle: {
            flex: 1,
            paddingVertical: 8, // Increased from 6
          },
          tabBarLabelStyle: {
            fontSize: 13, // Increased from 11
            fontWeight: '700', // Increased from 600
            marginTop: 4, // Increased from 2
            marginBottom: 2,
          },
          tabBarIconStyle: {
            marginTop: 4, // Increased from 2
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <HomeIcon color={color} size={26} strokeWidth={2.5} />, // Increased from 22
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color }) => <BarChart3 color={color} size={26} strokeWidth={2.5} />, // Increased from 22
          }}
        />
        <Tab.Screen
          name="Inventory"
          component={InventoryStack}
          options={{
            tabBarLabel: 'Inventory',
            tabBarIcon: ({ color }) => <Package color={color} size={26} strokeWidth={2.5} />, // Increased from 22
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsStack}
          options={{
            tabBarLabel: 'Transactions',
            tabBarIcon: ({ color }) => <List color={color} size={26} strokeWidth={2.5} />, // Increased from 22
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
