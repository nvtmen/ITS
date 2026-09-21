import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProductProvider } from './src/context/ProductContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { AddProductScreen } from './src/screens/AddProductScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { Product } from './src/types/product';
import { checkForAppUpdates } from './src/services/updateService';

export type RootTabParamList = {
  Home: undefined;
  AddProduct: { productToEdit?: Product } | undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  React.useEffect(() => {
    // Canlı APK sürümünde açılışta güncellemeleri arka planda kontrol et
    checkForAppUpdates(false);
  }, []);

  return (
    <SafeAreaProvider>
      <ProductProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: '#0284C7',
              tabBarInactiveTintColor: '#94A3B8',
              tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopColor: '#E2E8F0',
                borderTopWidth: 1,
                paddingBottom: 6,
                paddingTop: 6,
                height: 60,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '700',
              },
              tabBarIcon: ({ color, size, focused }) => {
                let iconName: any = 'medkit';
                if (route.name === 'Home') {
                  iconName = focused ? 'medkit' : 'medkit-outline';
                } else if (route.name === 'AddProduct') {
                  iconName = focused ? 'add-circle' : 'add-circle-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarLabel: 'Ecza Dolabım',
              }}
            />
            <Tab.Screen
              name="AddProduct"
              component={AddProductScreen}
              options={{
                tabBarLabel: 'İlaç Ekle',
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: 'Ayarlar',
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </ProductProvider>
    </SafeAreaProvider>
  );
}
