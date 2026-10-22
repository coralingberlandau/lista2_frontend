import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Fraunces_600SemiBold, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ToastConfig';
import FloatingTabBar from '@/components/FloatingTabBar';
import Home from './(tabs)/Home';
import Login from './Login';
import Register from './Register';
import ListItemDetails from './ListItemDetails';
import Settings from './(tabs)/Settings';
import { RootStackParamList } from './type';
import ResetPassword from './ResetPassword';
import EditProfile from './(tabs)/EditProfile';
import ChangePassword from './ChangePassword';
import { colors, fonts } from '@/constants/theme';
import { setSessionExpiredHandler } from '@/utils/authSession';
import StartupScreen from '@/components/StartupScreen';

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

  // On the web, paint the page itself in the app's colour, so nothing white or black shows around
  // the app at the edges of a phone screen (notch area, overscroll) or before it has loaded.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;
    }
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  // True once the saved login has been looked up, so a logged-in person never sees the Login page flash by.
  const [loginChecked, setLoginChecked] = useState(false);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // When the saved login can no longer be renewed (see utils/authSession.ts), send the
  // user back to the Login screen instead of leaving them on a screen that can't load.
  useEffect(() => {
    setSessionExpiredHandler(() => setIsLoggedIn(false));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        token && setIsLoggedIn(true);
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsLoggedIn(false);
      } finally {
        setLoginChecked(true);
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

  // Until the fonts and the saved login are ready, show the three dots (never a blank screen).
  if (!fontsLoaded || !loginChecked) {
    return <StartupScreen />;
  }

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {isLoggedIn ? (
        <Tab.Navigator
          tabBar={(props) => <FloatingTabBar {...props} />}
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
      <Toast config={toastConfig} />
    </NavigationContainer>
  );
}
registerRootComponent(App);
