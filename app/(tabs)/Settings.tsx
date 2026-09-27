import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BackgroundImage, RootStackParamList } from '../type';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import axios from 'axios';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import _ from 'lodash';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { colors, fonts, radii } from '@/constants/theme';

type SettingsProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

const Settings: React.FC<SettingsProps> = ({ setIsLoggedIn }) => {
  const appName = "Lista Application";
  const version = "1.0.0";
  const supportContact = "listaassistance@gmail.com";
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const SERVER = "https://lista-backend-n3la.onrender.com"


  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${supportContact.split(': ')[1]}`);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error logging out:', error);
      Toast.show({
        type: 'error',
        text1: 'Error logging out',
        text2: 'Please try again later',
      });
    }
  };

  const backgroundImages: BackgroundImage[] = [
    { id: 1, url: require('../../assets/background/back1.jpg') },
    { id: 2, url: require('../../assets/background/back2.jpg') },
    { id: 3, url: require('../../assets/background/back3.jpg') },
    { id: 4, url: require('../../assets/background/back4.jpg') },
    { id: 5, url: require('../../assets/background/back5.jpg') },
    { id: 6, url: require('../../assets/background/back6.jpg') },
    { id: 7, url: require('../../assets/background/back7.jpg') },
    { id: 8, url: require('../../assets/background/back8.jpg') },
    { id: 9, url: require('../../assets/background/back9.jpg') },
    { id: 10, url: require('../../assets/background/back10.jpg') },
    { id: 11, url: require('../../assets/background/back11.jpg') },
    { id: 12, url: require('../../assets/background/back12.jpg') },
    { id: 13, url: require('../../assets/background/back13.jpg') },
    { id: 14, url: require('../../assets/background/back14.jpg') },
    { id: 15, url: require('../../assets/background/back15.jpg') },
    { id: 16, url: require('../../assets/background/back16.jpg') },
    { id: 17, url: require('../../assets/background/back17.jpg') },
    { id: 18, url: require('../../assets/background/back18.jpg') },
    { id: 19, url: require('../../assets/background/back19.jpg') },
    { id: 20, url: require('../../assets/background/back20.jpg') },
    { id: 21, url: require('../../assets/background/back21.jpg') },
    { id: 22, url: require('../../assets/background/back22.jpg') },
    { id: 23, url: require('../../assets/background/back23.jpg') },
    { id: 24, url: require('../../assets/background/back24.jpg') },
  ];

  const debounceSaveToServer = _.debounce(async (imageId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${SERVER}/customizations/`,
        {
          background_image_id: imageId || 0,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        await AsyncStorage.setItem('customizations', imageId.toString());
      }

      Toast.show({
        type: 'success',
        text1: 'Background changed successfully!',
      });
    } catch (error) {
      console.error('Error:', error);
      Toast.show({
        type: 'error',
        text1: 'An error occurred. Please try again later.',
      });
    }
  }, 500);

  const handleBackgroundChange = async (imageId: number) => {
    setSelectedImage(imageId);
    debounceSaveToServer(imageId);
  };

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{appName}</Text>
            <Text style={styles.version}>Version {version}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <AntDesign name="logout" size={17} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.supportInfo}>For assistance, please contact Lista support:</Text>
          <TouchableOpacity onPress={handleEmailPress}>
            <Text style={styles.supportContact}>{supportContact}</Text>
          </TouchableOpacity>
          <Text style={styles.inspirationText}>Keep achieving great things with Lista.</Text>
          <Text style={styles.inspirationText}>We're here to make your life easier and more organized. </Text>
        </GlassCard>

        <TouchableOpacity onPress={navigateToEditProfile} style={styles.editProfileButton}>
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.backgroundHeader}>
          <Ionicons name="color-palette-outline" size={20} color={colors.text} />
          <Text style={styles.backgroundTitle}>Background</Text>
        </View>
        <GlassCard style={styles.card} contentStyle={styles.backgroundPickerContainer}>
          <FlatList
            data={backgroundImages}
            scrollEnabled={false}
            renderItem={({ item }: { item: BackgroundImage }) => (
              <TouchableOpacity
                onPress={() => handleBackgroundChange(item.id)}
                style={[
                  styles.backgroundImageOption,
                  selectedImage === item.id && styles.selectedBackgroundImage,
                ]}
              >
                <Image
                  source={item.url}
                  style={styles.backgroundImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            keyExtractor={(_, index) => index.toString()}
            numColumns={4}
          />
        </GlassCard>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            © All rights reserved to Coral Landau, Founder of Lista.
          </Text>
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
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    width: '100%',
    marginBottom: 18,
  },
  cardContent: {
    padding: 18,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  supportInfo: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  supportContact: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: 12,
  },
  inspirationText: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glassBgStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassBgStrong,
    padding: 14,
    borderRadius: radii.md,
    marginBottom: 20,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    gap: 8,
  },
  editProfileText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  backgroundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  backgroundTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  backgroundPickerContainer: {
    padding: 12,
  },
  backgroundImageOption: {
    margin: 4,
    width: 68,
    height: 68,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm - 2,
  },
  selectedBackgroundImage: {
    borderColor: colors.primary,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default Settings;
