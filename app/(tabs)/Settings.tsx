import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../type';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import axios from 'axios';
import { ScrollView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import debounce from 'lodash/debounce';
import AppBackground from '@/components/AppBackground';
import { PageLoader } from '@/components/PageLoader';
import GlassCard from '@/components/GlassCard';
import { backgroundImageSources } from '@/constants/backgroundImages';
import { backgroundThumbSources } from '@/constants/backgroundThumbs';
import {
  gradientBackgrounds,
  DEFAULT_BACKGROUND_ID,
  CUSTOM_BACKGROUND_ID,
  CUSTOM_BACKGROUND_URI_KEY,
} from '@/constants/gradientBackgrounds';
import { colors, fonts, radii } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { describeError } from '@/utils/describeError';

type Swatch =
  | { kind: 'default' }
  | { kind: 'photo'; id: number; url: ImageSourcePropType }
  | { kind: 'gradient'; id: number; colors: readonly [string, string] }
  | { kind: 'upload' };

type SettingsProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};
type EditProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

const Settings: React.FC<SettingsProps> = ({ setIsLoggedIn }) => {
  const appName = "Lista";
  const version = "2.0.0";
  const supportContact = "listaassistance@gmail.com";
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [customUri, setCustomUri] = useState<string | null>(null);
  // The page appears only when everything it shows is ready (the saved choice and the thumbnails);
  // until then it shows just the three dots. After the first time it stays ready, because what it
  // reads is saved on this device and refreshes in a blink.
  const [ready, setReady] = useState(false);
  const SERVER = API_URL;


  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${supportContact.split(': ')[1]}`);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error logging out:', error);
      Toast.show({
        type: 'error',
        text1: "Couldn't log you out",
        text2: 'Please try again.',
      });
    }
  };

  const swatches: Swatch[] = useMemo(
    () => [
      { kind: 'default' },
      // Small thumbnail files for the grid (the full-size pictures are used only as the background).
      ...backgroundImageSources.map((full, index): Swatch => ({ kind: 'photo', id: index + 1, url: backgroundThumbSources[index] ?? full })),
      ...gradientBackgrounds.map((g): Swatch => ({ kind: 'gradient', id: g.id, colors: g.colors })),
      { kind: 'upload' },
    ],
    []
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const [value, uri] = await Promise.all([
            AsyncStorage.getItem('customizations'),
            AsyncStorage.getItem(CUSTOM_BACKGROUND_URI_KEY),
          ]);
          if (cancelled) return;
          const parsed = value ? parseInt(value, 10) : NaN;
          setSelectedImage(Number.isFinite(parsed) ? parsed : null);
          setCustomUri(uri);
          // Draw the thumbnails before showing the page (but never wait more than a few seconds).
          const prefetch = Promise.all(
            backgroundThumbSources.map((source) => {
              const uriOfThumb = Image.resolveAssetSource(source)?.uri;
              return uriOfThumb ? Image.prefetch(uriOfThumb).catch(() => false) : Promise.resolve(true);
            })
          );
          await Promise.race([prefetch, new Promise((resolve) => setTimeout(resolve, 4000))]);
        } catch (error) {
          console.error('Error loading settings:', error);
        } finally {
          if (!cancelled) setReady(true);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const debounceSaveToServer = useMemo(
    () =>
      debounce(async (imageId: number) => {
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
            text1: 'Background updated.',
          });
        } catch (error) {
          console.error('Error:', error);
          Toast.show({
            type: 'error',
            text1: "Couldn't save your background",
            text2: describeError(error),
          });
        }
      }, 500),
    []
  );

  const handleBackgroundChange = async (imageId: number) => {
    setSelectedImage(imageId);
    await AsyncStorage.setItem('customizations', imageId.toString());
    debounceSaveToServer(imageId);
  };

  const handleUploadCustomBackground = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: 'Photo library access is needed to pick a background.',
        text2: 'Allow photo access in your browser or device settings.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const uri = result.assets[0].uri;
    setCustomUri(uri);
    await AsyncStorage.setItem(CUSTOM_BACKGROUND_URI_KEY, uri);
    await handleBackgroundChange(CUSTOM_BACKGROUND_ID);
  };

  // One background choice in the grid below.
  const renderSwatch = (item: Swatch) => {
              if (item.kind === 'default') {
                const isSelected = selectedImage === DEFAULT_BACKGROUND_ID || selectedImage === null;
                return (
                  <TouchableOpacity
                    onPress={() => handleBackgroundChange(DEFAULT_BACKGROUND_ID)}
                    style={[styles.backgroundImageOption, isSelected && styles.selectedBackgroundImage]}
                  >
                    <View style={styles.defaultSwatch}>
                      <View style={[styles.miniBlob, styles.miniBlobViolet]} />
                      <View style={[styles.miniBlob, styles.miniBlobCoral]} />
                      <View style={[styles.miniBlob, styles.miniBlobTeal]} />
                    </View>
                  </TouchableOpacity>
                );
              }

              if (item.kind === 'photo') {
                return (
                  <TouchableOpacity
                    onPress={() => handleBackgroundChange(item.id)}
                    style={[
                      styles.backgroundImageOption,
                      selectedImage === item.id && styles.selectedBackgroundImage,
                    ]}
                  >
                    <Image source={item.url} style={styles.backgroundImage} resizeMode="cover" />
                  </TouchableOpacity>
                );
              }

              if (item.kind === 'gradient') {
                return (
                  <TouchableOpacity
                    onPress={() => handleBackgroundChange(item.id)}
                    style={[
                      styles.backgroundImageOption,
                      selectedImage === item.id && styles.selectedBackgroundImage,
                    ]}
                  >
                    <LinearGradient
                      colors={item.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.backgroundImage}
                    />
                  </TouchableOpacity>
                );
              }

              const isCustomSelected = selectedImage === CUSTOM_BACKGROUND_ID;
              return (
                <TouchableOpacity
                  onPress={handleUploadCustomBackground}
                  style={[
                    styles.backgroundImageOption,
                    styles.uploadOption,
                    isCustomSelected && styles.selectedBackgroundImage,
                  ]}
                >
                  {isCustomSelected && customUri ? (
                    <Image source={{ uri: customUri }} style={styles.backgroundImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="add" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
  };

  // The swatches in rows of four, like the grid always looked.
  const swatchRows: Swatch[][] = [];
  for (let start = 0; start < swatches.length; start += 4) {
    swatchRows.push(swatches.slice(start, start + 4));
  }

  if (!ready) {
    return (
      <View style={styles.root}>
        <AppBackground />
        <PageLoader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBackground overrideId={selectedImage} overrideCustomUri={customUri} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <AntDesign name="logout" size={17} color={colors.danger} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{appName}</Text>
            <View style={styles.titleRule} />
            <Text style={styles.version}>Version {version}</Text>
          </View>
        </View>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={[styles.sectionLabelRow, styles.sectionLabelRowSpaced]}>
            <Ionicons name="help-circle-outline" size={14} color={colors.text} />
            <Text style={styles.sectionLabel}>Support</Text>
          </View>
          <Text style={styles.supportInfo}>For assistance, please contact Lista support:</Text>
          <TouchableOpacity onPress={handleEmailPress}>
            <Text style={styles.supportContact}>{supportContact}</Text>
          </TouchableOpacity>
          <Text style={styles.inspirationText}>Keep achieving great things with Lista.</Text>
          <Text style={styles.inspirationText}>We're here to make your life easier and more organized. </Text>
        </GlassCard>

        <TouchableOpacity onPress={navigateToEditProfile}>
          <GlassCard style={styles.card} contentStyle={[styles.cardContent, styles.sectionLabelRow]}>
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={styles.sectionLabel}>Edit Profile</Text>
          </GlassCard>
        </TouchableOpacity>

        <GlassCard style={styles.card} contentStyle={styles.cardContent}>
          <View style={[styles.sectionLabelRow, styles.sectionLabelRowSpaced]}>
            <Ionicons name="color-palette-outline" size={14} color={colors.text} />
            <Text style={styles.sectionLabel}>Background</Text>
          </View>
          {/* A plain grid of rows of four, not a FlatList: a FlatList with scrolling switched off gets
              touch-action: none on the web, which stops a finger drag that starts on the grid from
              scrolling the page on a phone (iPhone Safari and Android Chrome). */}
          <View style={styles.backgroundGridWrap}>
            {swatchRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.backgroundGridRow}>
                {row.map((item, columnIndex) => (
                  <React.Fragment key={rowIndex * 4 + columnIndex}>{renderSwatch(item)}</React.Fragment>
                ))}
              </View>
            ))}
          </View>
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
    // A centered column on wide screens instead of stretching across the whole window.
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 56,
    paddingBottom: 110,
  },
  headerContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.text,
    textAlign: 'center',
  },
  titleRule: {
    width: 32,
    height: 1,
    backgroundColor: colors.placeholder,
    marginVertical: 8,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 1.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    marginBottom: 18,
  },
  cardContent: {
    padding: 18,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabelRowSpaced: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.3,
    color: colors.placeholder,
    textTransform: 'uppercase',
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
    position: 'absolute',
    top: 0,
    right: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glassBgStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundGridWrap: {
    marginTop: 10,
  },
  backgroundGridRow: {
    flexDirection: 'row',
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
  defaultSwatch: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm - 2,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  miniBlob: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    opacity: 0.75,
  },
  miniBlobViolet: {
    backgroundColor: colors.blobViolet,
    top: -8,
    left: -6,
  },
  miniBlobCoral: {
    backgroundColor: colors.blobCoral,
    bottom: -10,
    right: -8,
  },
  miniBlobTeal: {
    backgroundColor: colors.blobTeal,
    bottom: 4,
    left: 10,
  },
  uploadOption: {
    backgroundColor: colors.glassBgStrong,
    justifyContent: 'center',
    alignItems: 'center',
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
