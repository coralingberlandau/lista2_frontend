import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image, useWindowDimensions, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from './type';
import { Ionicons } from '@expo/vector-icons';
import AuroraBackground from '@/components/AuroraBackground';
import { colors, fonts, radii, shadows } from '@/constants/theme';

type WelcomeProps = StackScreenProps<RootStackParamList, 'Welcome'>;

const Welcome: React.FC<WelcomeProps> = ({ navigation }) => {
    const { width } = useWindowDimensions();

    const navigateToLogin = () => {
        navigation.navigate('Login');
    };

    const navigateToRegister = () => {
        navigation.navigate('Register');
    };

    const openServerLink = () => {
        Linking.openURL('https://lista-backend-n3la.onrender.com/');
    };

    return (
        <View style={styles.root}>
            <AuroraBackground />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Image source={require('../assets/images/lista.png')} style={[styles.logo, { width: width * 0.28, height: width * 0.28 }]} />
                <Text style={[styles.title, { fontSize: width > 350 ? 32 : 26 }]}>Welcome to Lista</Text>
                <Text style={styles.description}>
                    <Text style={styles.bold}>Lista</Text> is your calm space for organizing and managing personal and shared lists.
                    {'\n'}It combines real-time updates, customization options, and a user-friendly experience.
                    {'\n\n'}Document sharing is available for users who are registered in the app, using their email address.
                    {'\n'}Permissions can be set for read-only access or full editing capabilities.
                </Text>
                <View style={styles.noticeCard}>
                    <Text style={styles.subtitle}>
                        Before using the application, please ensure the server is running.{'\n'}
                        Since the backend server is hosted on a free-tier service, it may take some time to wake up.{'\n'}
                        Kindly wait until you see a status code of 200 or the 'Django REST framework' interface before proceeding.{'\n'}
                        Once the server is ready, you can fully use the application.{'\n'}
                    </Text>
                    <TouchableOpacity onPress={openServerLink} style={styles.linkContainer}>
                        <Text style={styles.link}>https://lista-backend-n3la.onrender.com/</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={navigateToLogin}>
                        <Ionicons name="log-in-outline" size={22} color="#fff" />
                        <Text style={styles.actionTextPrimary}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonSecondary} onPress={navigateToRegister}>
                        <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                        <Text style={styles.actionTextSecondary}>Register</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 60,
        paddingHorizontal: 24,
    },
    logo: {
        marginBottom: 18,
        borderRadius: radii.lg,
    },
    title: {
        fontFamily: fonts.displayItalic,
        marginBottom: 18,
        textAlign: 'center',
        color: colors.text,
    },
    description: {
        fontFamily: fonts.body,
        fontSize: 15,
        lineHeight: 23,
        textAlign: 'center',
        color: colors.textMuted,
        marginBottom: 24,
    },
    bold: {
        fontFamily: fonts.bodyBold,
        color: colors.text,
    },
    noticeCard: {
        width: '100%',
        backgroundColor: colors.glassBgStrong,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        padding: 18,
        marginBottom: 28,
        ...shadows.soft,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        ...shadows.glow,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glassBgStrong,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
    },
    actionTextPrimary: {
        marginLeft: 8,
        fontSize: 15,
        color: '#fff',
        fontFamily: fonts.bodyBold,
    },
    actionTextSecondary: {
        marginLeft: 8,
        fontSize: 15,
        color: colors.primary,
        fontFamily: fonts.bodyBold,
    },
    link: {
        fontFamily: fonts.bodyMedium,
        fontSize: 13,
        color: colors.primary,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
});

export default Welcome;
