// Multi Terminal — Expo App Entry
// Langsung bisa test di HP via Expo Go

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { DeviceListScreen, AddDeviceScreen } from './src/screens/DeviceScreens';
import { TerminalScreen, WebTerminalScreen } from './src/screens/TerminalScreens';
import { MikroTikScreen } from './src/screens/MikroTikScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Theme Catppuccin Mocha
const AppTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#74c7ec',
    background: '#1e1e2e',
    card: '#181825',
    text: '#cdd6f4',
    border: '#313244',
    notification: '#f38ba8',
  },
};

const DevicesStack = createNativeStackNavigator();
const ScannerStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#181825' },
  headerTintColor: '#cdd6f4',
  headerTitleStyle: { fontWeight: '600' as const },
};

function DevicesNavigator() {
  return (
    <DevicesStack.Navigator screenOptions={headerStyle}>
      <DevicesStack.Screen name="DeviceList" component={DeviceListScreen} options={{ title: 'Perangkat' }} />
      <DevicesStack.Screen name="AddDevice" component={AddDeviceScreen} options={{ title: 'Tambah Perangkat', presentation: 'modal' }} />
      <DevicesStack.Screen name="EditDevice" component={AddDeviceScreen} options={{ title: 'Edit Perangkat', presentation: 'modal' }} />
      <DevicesStack.Screen name="Terminal" component={TerminalScreen} options={{ headerShown: false }} />
      <DevicesStack.Screen name="WebTerminal" component={WebTerminalScreen} options={{ headerShown: false }} />
      <DevicesStack.Screen name="MikroTik" component={MikroTikScreen} options={{ headerShown: false }} />
    </DevicesStack.Navigator>
  );
}

function ScannerNavigator() {
  return (
    <ScannerStack.Navigator screenOptions={headerStyle}>
      <ScannerStack.Screen name="ScannerHome" component={ScannerScreen} options={{ title: 'Scanner' }} />
    </ScannerStack.Navigator>
  );
}

const TAB_ICONS: Record<string, string> = {
  DevicesTab: '📱',
  ScannerTab: '📡',
  SettingsTab: '⚙',
};

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#181825',
            borderTopColor: '#313244',
            borderTopWidth: 1,
            height: 85,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#74c7ec',
          tabBarInactiveTintColor: '#6c7086',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.5 }}>
              {TAB_ICONS[route.name] || '●'}
            </Text>
          ),
        })}
      >
        <Tab.Screen name="DevicesTab" component={DevicesNavigator} options={{ title: 'Perangkat' }} />
        <Tab.Screen name="ScannerTab" component={ScannerNavigator} options={{ title: 'Scanner' }} />
        <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
