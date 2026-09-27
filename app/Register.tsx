import React, { Dispatch, SetStateAction, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, useWindowDimensions } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '@/components/Input';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import { JwtPayload, RootStackParamList } from './type';
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts, radii } from '@/constants/theme';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;


const Register: React.FC<{ setIsLoggedIn: Dispatch<SetStateAction<boolean | null>> }> = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { width } = useWindowDimensions();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const SERVER = "https://lista-backend-n3la.onrender.com"


  const allFieldsFilled: boolean =
    username.trim() !== '' &&
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '';

  const isValidEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };


  const handleRegister = async () => {
    setError(null);
    setEmailError(null);

    if (!allFieldsFilled) {
      setError('All fields must be filled in to complete the registration.');
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError('The email is invalid. Please enter a valid email address.');
      return;
    }

    if (username && firstName && lastName && email && password) {
      setLoading(true);
      try {
        const response = await axios.post(`${SERVER}/register/`, {
          username,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        });

        if (response.status === 201) {
          const accessToken = response.data.access;

          const decodedToken: JwtPayload = jwtDecode(accessToken);

          const userId = decodedToken.user_id;

          if (userId === undefined) {
            throw new Error("User ID is undefined");
          }

          await AsyncStorage.setItem('token', accessToken);
          await AsyncStorage.setItem('userId', userId.toString());
          await AsyncStorage.setItem('userName', username);

          Alert.alert('Registration Successful', 'You can now log in.');
          Toast.show({
            type: 'success',
            text1: 'The user has been saved successfully!',
          });

          setIsLoggedIn(true);

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        }
      } catch (error) {
        console.log('Error caught:', error);

        if (axios.isAxiosError(error)) {
          console.log('Error caught:', error);
          console.log('Response data:', error.response?.data);

          if (error.response) {
            if (error.response.status === 400) {
              setError(error.response.data.error);
            } else {
              setError('Error 500 - Something went wrong. Please try again.');
            }
          } else {
            setError('Unexpected error occurred. Please try again later.');
          }
        } else {
          setError('Unexpected error occurred. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/lista.png')} style={[styles.logo, { width: width * 0.22, height: width * 0.22 }]} />
        </View>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.tagline}>Join Lista and start organizing together</Text>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.placeholder} style={styles.icon} />
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.placeholder} style={styles.icon} />
            <Input
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.placeholder} style={styles.icon} />
            <Input
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.placeholder} style={styles.icon} />
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} style={styles.icon} />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </View>

          <PrimaryButton title="Register" onPress={handleRegister} loading={loading} style={styles.button} />

          {(error || emailError) && (
            <Text style={styles.errorText}>
              {error || emailError}
            </Text>
          )}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 40,
  },
  title: {
    fontFamily: fonts.displayItalic,
    fontSize: 28,
    color: colors.text,
    marginTop: 12,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  cardContent: {
    padding: 24,
  },
  loginContainer: {
    marginTop: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  loginText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  loginLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    borderRadius: radii.md,
  },
});

export default Register;
