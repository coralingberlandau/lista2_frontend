import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import Toast from 'react-native-toast-message';
import Home from './(tabs)/Home';
import Login from './Login';
import Register from './Register';
import ListItemDetails from './ListItemDetails';
import Settings from './(tabs)/Settings';
import { RootStackParamList } from './type';
import ResetPassword from './ResetPassword';
import EditProfile from './(tabs)/EditProfile';
import ChangePassword from './ChangePassword';
import Welcome from './Welcome';
import { colors, fonts } from '@/constants/theme';

const Tab = createBottomTabNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.background,
  },
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        token && setIsLoggedIn(true);
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsLoggedIn(false);
      }
    };

    checkLogin();
  }, []);

  const linking = {
    prefixes: ['https://lista-project.netlify.app/'],
    config: {
      screens: {
        ChangePassword: 'change-password',
      },
    },
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {isLoggedIn ? (
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.placeholder,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.glassBorder,
            },
            tabBarLabelStyle: {
              fontFamily: fonts.bodyMedium,
              fontSize: 11,
            },
          }}
        >
          <Tab.Screen
            name="Home"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
              ),
              headerShown: false,
            }}>
            {(props) => <Home {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Tab.Screen>
          <Tab.Screen name="ListItemDetails" component={ListItemDetails}
            options={{ tabBarButton: () => null, headerShown: false, title: 'List Item Details' }} />
          <Tab.Screen
            name="Settings"
            children={(props) => <Settings {...props} setIsLoggedIn={setIsLoggedIn} />}
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
              ), headerShown: false,
            }} />
          <Tab.Screen
            name="EditProfile"
            options={{
              tabBarButton: () => null, headerShown: false, title: 'Edit Profile',
            }} >
            {(props) => <EditProfile {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Tab.Screen>
        </Tab.Navigator>
      ) : (
        <Tab.Navigator>
          <Tab.Screen
            name="Welcome"
            options={{
              headerShown: false,
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          >
            {(props) => <Welcome {...props} />}
          </Tab.Screen>
          <Tab.Screen
            name="Login"
            options={{
              headerShown: false,
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          >
            {(props) => <Login {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Tab.Screen>
          <Tab.Screen
            name="Register"
            options={{
              headerShown: false,
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          >
            {(props) => <Register {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Tab.Screen>

          <Tab.Screen
            name="ResetPassword"
            component={ResetPassword}
            options={{
              headerShown: false,
              title: 'Reset Password',
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tab.Screen
            name="ChangePassword"
            component={ChangePassword}
            options={{
              headerShown: false,
              title: 'Change Password',
              tabBarButton: () => null,
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tab.Navigator>
      )}
      <Toast/>
    </NavigationContainer>
  );
}
registerRootComponent(App);
