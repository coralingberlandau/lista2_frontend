import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const SERVER = "https://lista-backend-n3la.onrender.com"
  const checkPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(checkPulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(checkPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [checkPulse]);

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

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Lista</Text>
          <Animated.View style={[styles.checkBadge, { transform: [{ scale: checkPulse }] }]}>
            <Ionicons name="checkmark" size={13} color={colors.white} />
          </Animated.View>
        </View>
        <Text style={styles.tagline}>A quiet place to keep what matters.</Text>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
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
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.placeholder}
              />
            </TouchableOpacity>
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
  titleWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.loraWordmark,
    fontSize: 56,
    color: colors.text,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -38,
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.blobTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.blobTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  tagline: {
    fontFamily: fonts.loraTagline,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 10,
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
    paddingRight: 14,
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
