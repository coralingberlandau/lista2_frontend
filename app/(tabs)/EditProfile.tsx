import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '@/components/Input';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts, radii } from '@/constants/theme';
import { API_URL } from '@/constants/config';

type EditProfileProps = {
    setIsLoggedIn: Dispatch<SetStateAction<boolean | null>>;
};

const EditProfile: React.FC<EditProfileProps> = ({ setIsLoggedIn }) => {
    const [username, setUsername] = useState<string>('');
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const navigation = useNavigation();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState(false);
    const SERVER = API_URL;



    useEffect(() => {
        const loadUserData = async () => {
            const storedUserId = await AsyncStorage.getItem('userId');
            if (storedUserId) setUserId(storedUserId);

            const storedUsername = await AsyncStorage.getItem('userName');
            if (storedUsername) setUsername(storedUsername);

            if (userId) {
                try {
                    // The profile is private: the backend only answers a logged-in user
                    // asking for their own profile, so the login token is required.
                    const token = await AsyncStorage.getItem('token');
                    const response = await axios.get(`${SERVER}/user/${userId}/`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setFirstName(response.data.first_name);
                    setLastName(response.data.last_name);
                    setEmail(response.data.email);
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            }
        };

        loadUserData();
    }, [userId]);

    const allFieldsFilled = username && firstName && lastName && email;

    useEffect(() => {
        if (firstName && lastName && email) {
            setIsLoading(false);
        }
    }, [firstName, lastName, email]);

    const isValidEmail = (email: string): boolean => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    };

    const handleSaveChanges = async () => {
        setError(null);
        setEmailError(null);

        if (!allFieldsFilled) {
            setError('All fields must be filled to update your profile.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('The email is invalid. Please enter a valid email address.');
            return;
        }

        if (userId) {
            setSaving(true);
            try {
                const token = await AsyncStorage.getItem('token');
                const response = await axios.patch(`${SERVER}/user/${userId}/`, {
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.status === 200) {
                    await AsyncStorage.setItem('userName', username);
                    Toast.show({
                        type: 'success',
                        text1: 'Your profile was updated.',
                    });
                    setIsLoggedIn(true);
                    navigation.goBack();
                }
            } catch (error) {
                console.log('Error updating profile:', error);
                if (axios.isAxiosError(error) && error.response?.status === 400) {
                    const errorMsg = error.response.data.error;
                    if (errorMsg.includes('Username already exists')) {
                        setError('The username is already in use. Please choose a different one.');
                    } else if (errorMsg.includes('Email already in use')) {
                        setError('The email is already in use. Please choose a different one.');
                    } else {
                        setError('An error occurred. Please try again.');
                    }
                } else {
                    setError('An error occurred. Please try again.');
                }
            } finally {
                setSaving(false);
            }
        } else {
            setError('User ID not found.');
            setIsLoggedIn(false);
        }
    };

    return (
        <View style={styles.root}>
            <AuroraBackground />
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Edit Profile</Text>
                <View style={styles.titleRule} />

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
                    {isLoading ? (
                        <Text style={styles.loadingText}>Loading user data…</Text>
                    ) : (
                        <PrimaryButton title="Save Changes" onPress={handleSaveChanges} loading={saving} />
                    )}

                    {(error || emailError) && (
                        <Text style={styles.errorText}>
                            {error || emailError}
                        </Text>
                    )}
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
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 76,
        paddingBottom: 110,
    },
    title: {
        fontFamily: fonts.display,
        fontSize: 40,
        color: colors.text,
        textAlign: 'center',
    },
    titleRule: {
        width: 32,
        height: 1,
        backgroundColor: colors.placeholder,
        marginTop: 8,
        marginBottom: 22,
        alignSelf: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 360,
    },
    cardContent: {
        padding: 24,
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
    loadingText: {
        fontFamily: fonts.body,
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 8,
    },
});

export default EditProfile;
