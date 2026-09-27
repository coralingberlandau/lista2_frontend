import React, { Dispatch, SetStateAction, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '@/components/Input';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { JwtPayload, RootStackParamList } from './type';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts, radii } from '@/constants/theme';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const Login: React.FC<{ setIsLoggedIn: Dispatch<SetStateAction<boolean | null>> }> = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const SERVER = "https://lista-backend-n3la.onrender.com"

  const handleLogin = async () => {
    setErrorText('');

    if (!username || !password) {
      setErrorText('Please enter both username and password.');
      return;
    }

    if (username && password) {
      setLoading(true);
      try {
        const response = await axios.post(`${SERVER}/login/`, {
          username,
          password,
        });

        const accessToken = response.data.access;
        const decodedToken: JwtPayload = jwtDecode(accessToken);
        const userId = decodedToken.user_id;

        if (userId === undefined) {
          throw new Error("User ID is undefined");
        }

        const customizations = await axios.get(`${SERVER}/customizations/get_user_customization/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (customizations.status === 200) {
          await AsyncStorage.setItem('customizations', customizations.data.data.background_image_id);
        }

        await AsyncStorage.setItem('token', accessToken);
        await AsyncStorage.setItem('userId', userId.toString());
        await AsyncStorage.setItem('userName', username);

        setIsLoggedIn(true);
      } catch (error: any) {
        console.error(error);
        if (error.response && error.response.status === 401) {
          setErrorText('Incorrect username or password. Please try again.');
        } else {
          setErrorText('Something went wrong. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
  }

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToResetPassword = () => {
    navigation.navigate('ResetPassword');
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.eyebrow}>WELCOME TO</Text>
        <Text style={styles.title}>Lista</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>A quiet place to keep what matters.</Text>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Log in to keep your lists in sync</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.placeholder}
              style={styles.icon}
            />
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.placeholder}
              style={styles.icon}
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <PrimaryButton title="Log In" onPress={handleLogin} loading={loading} style={styles.button} />
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Not registered?</Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.linkTo}>Sign up</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={navigateToResetPassword}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.textMuted,
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.loraWordmark,
    fontSize: 42,
    color: colors.text,
    marginTop: 6,
  },
  divider: {
    width: 44,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: 18,
  },
  tagline: {
    fontFamily: fonts.loraTagline,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 18,
    marginBottom: 30,
    textAlign: 'center',
    maxWidth: 250,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  cardContent: {
    padding: 24,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 22,
  },
  registerContainer: {
    marginTop: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  registerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  linkTo: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  forgotLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.placeholder,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 14,
  },
  inputContainer: {
    marginBottom: 12,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    paddingLeft: 8,
    paddingVertical: 10,
  },
  icon: {},
  button: {
    marginTop: 8,
  },
});

export default Login;
