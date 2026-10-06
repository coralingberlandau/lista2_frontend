import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import axios from 'axios';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './type';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from 'react-native-toast-message';
import { colors, fonts, radii } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { describeError } from '@/utils/describeError';

type NavigationProps = StackNavigationProp<RootStackParamList>;

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const navigation = useNavigation<NavigationProps>();
  const SERVER = API_URL;


  const isValidEmail = (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return regex.test(email);
  };

  const handleRequestResetLink = async () => {
    setErrorText('');

    if (!email) {
      setErrorText('Please enter your email.');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorText('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${SERVER}/reset_password_request/`, {
        email,
      });

      console.log(response);

      setMessage('A reset link has been sent to your email.');
    } catch (error: any) {
      console.error('Error:', error);
      Toast.show({
        type: 'error',
        text1: "Couldn't send the reset link",
        // For 400/404 the server explains what is wrong (e.g. no account with this email).
        text2: ([400, 404].includes(error.response?.status) && error.response?.data?.error) ||
          describeError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>We'll send a secure link to your email.</Text>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.placeholder}
              style={styles.icon}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputText}
            />
          </View>

          <PrimaryButton
            title={loading ? 'Sending Reset Link…' : 'Send Reset Link'}
            onPress={handleRequestResetLink}
            loading={loading}
            style={styles.button} />

          {message || errorText ? (
            <Text style={message ? styles.message : styles.errorText}>
              {message || errorText}
            </Text>
          ) : null}

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Already have a password?</Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.linkTo}>Log in</Text>
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
    fontFamily: fonts.loraWordmark,
    fontSize: 40,
    color: colors.text,
    textAlign: 'center',
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
    maxWidth: 270,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  cardContent: {
    padding: 26,
  },
  message: {
    marginTop: 16,
    color: colors.success,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
  linkTo: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 50,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    paddingLeft: 10,
  },
  icon: {},
  button: {
    marginTop: 4,
  },
});

export default ResetPassword;
