import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { ScrollView } from 'react-native-gesture-handler';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from 'react-native-toast-message';
import { colors, fonts, radii } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { describeError } from '@/utils/describeError';

type NavigationProps = StackNavigationProp<RootStackParamList>;
type RootStackParamList = {
  // `email` and `token` both come from the link in the password-reset email.
  ChangePassword: { email: string; token?: string };
  Login: undefined;
};

type ChangePasswordRouteProp = RouteProp<RootStackParamList, 'ChangePassword'>;

const ChangePassword: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  // Show/hide toggles, one per field (same eye icon as the Login and Register screens).
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<ChangePasswordRouteProp>();
  const { email, token } = route.params;
  const SERVER = API_URL;


  const validatePasswords = (): boolean => {
    if (password !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    setErrorText('');

    // The reset link in the email carries a single-use token; without it the server
    // would refuse the change, so say so up front.
    if (!token) {
      setErrorText('This reset link is incomplete. Please request a new one.');
      return;
    }

    if (!password || !confirmPassword) {
      setErrorText('Please fill in both fields.');
      return;
    }

    if (!validatePasswords()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${SERVER}/reset_password/`, {
        email,
        token,
        password,
      });
      setMessage('Password changed. Log in with your new one.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error: any) {
      console.error('Error:', error);
      Toast.show({
        type: 'error',
        text1: "Couldn't change your password",
        // For 400/404 the server explains what is wrong (e.g. the link expired).
        text2: ([400, 404].includes(error.response?.status) && error.response?.data?.error) ||
          describeError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Change Password</Text>
        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.placeholder}
              style={styles.icon} />
            <TextInput
              {...({ dataSet: { listaField: 'true' } } as any)}
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.placeholder} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.placeholder}
              style={styles.icon} />
            <TextInput
              {...({ dataSet: { listaField: 'true' } } as any)}
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} hitSlop={8}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.placeholder} />
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title={loading ? 'Changing Password…' : 'Change Password'}
            onPress={handleChangePassword}
            loading={loading} />

          {message || errorText ? (
            <Text style={message ? styles.message : styles.errorText}>
              {message || errorText}
            </Text>
          ) : null}
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
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    marginBottom: 22,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  cardContent: {
    padding: 24,
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
    fontSize: 16,
    color: colors.text,
    paddingLeft: 8,
    paddingVertical: 10,
  },
  icon: {},
});

export default ChangePassword;
