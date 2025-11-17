/**
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Home as HomeIcon, BarChart3, List } from 'lucide-react-native';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      <Stack.Screen name="AddCashSale" component={AddCashSaleScreen} />
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
            paddingTop: 4,
            paddingBottom: 6,
            height: 60,
            backgroundColor: '#FFFFFF'
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 2
          }
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon color={color} size={size ?? 24} strokeWidth={2} />
            ),
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <BarChart3 color={color} size={size ?? 24} strokeWidth={2} />
            ),
          }}
        />
        <Tab.Screen
          name="AllTransactions"
          component={AllTransactionsScreen}
          options={{
            tabBarLabel: 'Transactions',
            tabBarIcon: ({ color, size }) => (
              <List color={color} size={size ?? 24} strokeWidth={2} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
