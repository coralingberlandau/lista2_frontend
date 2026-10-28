import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ImageSourcePropType, useWindowDimensions } from 'react-native';
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
import PageGate from '@/components/PageGate';
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
import { publishBackgroundChoice } from '@/utils/backgroundChoice';

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
  // PageGate shows the page only when everything it needs is ready (the saved choice, the 24
  // thumbnails, the page background and the Logout icon); until then it shows just the three dots.
  // After the first time it stays ready, because what it reads is saved on this device.
  const [dataLoaded, setDataLoaded] = useState(false);
  const [thumbsLoaded, setThumbsLoaded] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  // Wide screens (a laptop or desktop window) keep one centered column, with the pictures wrapping
  // across it; phones keep rows of four, exactly as before.
  const wide = windowWidth >= 900;
  const SERVER = API_URL;


  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${supportContact}`);
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
          // The Logout icon's font is first used on this page, so wait for it too (otherwise the icon pops in late).
          await AntDesign.loadFont().catch(() => undefined);
          if (cancelled) return;
          const parsed = value ? parseInt(value, 10) : NaN;
          const savedId = Number.isFinite(parsed) ? parsed : null;
          setSelectedImage(savedId);
          setCustomUri(uri);
        } catch (error) {
          console.error('Error loading settings:', error);
        } finally {
          if (!cancelled) setDataLoaded(true);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const photoCount = backgroundThumbSources.length;
  const markThumbLoaded = useCallback(() => setThumbsLoaded((count) => count + 1), []);
  const picturesReady = dataLoaded && thumbsLoaded >= photoCount;

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

  const handleBackgroundChange = async (imageId: number, pickedUri: string | null = null) => {
    setSelectedImage(imageId);
    // Every screen hears about it now: each keeps its old background until the new picture has
    // loaded, then switches, so no screen shows a blank or half-painted background.
    publishBackgroundChoice({ id: imageId, uri: pickedUri ?? customUri });
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
    await handleBackgroundChange(CUSTOM_BACKGROUND_ID, uri);
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
                    <Image
                      source={item.url}
                      style={styles.backgroundImage}
                      resizeMode="cover"
                      onLoad={markThumbLoaded}
                      onError={markThumbLoaded}
                    />
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

  const supportCard = (
    <GlassCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={[styles.sectionLabelRow, styles.sectionLabelRowSpaced]}>
        <Ionicons name="help-circle-outline" size={14} color={colors.text} />
        <Text style={styles.sectionLabel}>Support</Text>
      </View>
      <Text style={styles.supportInfo}>For assistance, please contact Lista support:</Text>
      <TouchableOpacity onPress={handleEmailPress} style={styles.emailPill} accessibilityRole="link">
        <Ionicons name="mail-outline" size={16} color={colors.primary} />
        <Text style={styles.supportContact}>{supportContact}</Text>
      </TouchableOpacity>
      <View style={styles.supportRule} />
      {/* Non-breaking spaces keep "more organized," and "with Lista." together, so no word is left alone on a line. */}
      <Text style={styles.inspirationText}>
        We're here to make your life easier and more{'\u00A0'}organized, so keep achieving great things with{'\u00A0'}Lista.
      </Text>
    </GlassCard>
  );

  const editProfileCard = (
    <TouchableOpacity onPress={navigateToEditProfile}>
      <GlassCard style={styles.card} contentStyle={[styles.cardContent, styles.sectionLabelRow]}>
        <Ionicons name="pencil-outline" size={14} color={colors.primary} />
        <Text style={styles.sectionLabel}>Edit Profile</Text>
      </GlassCard>
    </TouchableOpacity>
  );

  const backgroundCard = (
    <GlassCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={[styles.sectionLabelRow, styles.sectionLabelRowSpaced]}>
        <Ionicons name="color-palette-outline" size={14} color={colors.text} />
        <Text style={styles.sectionLabel}>Background</Text>
      </View>
      {/* A plain grid, not a FlatList: a FlatList with scrolling switched off gets
          touch-action: none on the web, which stops a finger drag that starts on the grid from
          scrolling the page on a phone (iPhone Safari and Android Chrome). Phones show rows of
          four, as the grid always looked; wide screens let the swatches wrap across the card. */}
      {wide ? (
        <View style={styles.backgroundGridWide}>
          {swatches.map((item, index) => (
            <React.Fragment key={index}>{renderSwatch(item)}</React.Fragment>
          ))}
        </View>
      ) : (
        <View style={styles.backgroundGridWrap}>
          {swatchRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.backgroundGridRow}>
              {row.map((item, columnIndex) => (
                <React.Fragment key={rowIndex * 4 + columnIndex}>{renderSwatch(item)}</React.Fragment>
              ))}
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );

  return (
    <PageGate preloadContent ready={picturesReady}>
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]}>
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

        {supportCard}
        {editProfileCard}
        {backgroundCard}

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            © All rights reserved to Coral Landau, Founder of Lista.
          </Text>
        </View>
      </ScrollView>
    </PageGate>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(106,91,214,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(106,91,214,0.18)',
  },
  supportContact: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  supportRule: {
    height: 1,
    backgroundColor: colors.divider,
    marginTop: 16,
    marginBottom: 14,
  },
  inspirationText: {
    fontFamily: fonts.displayItalic,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
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
  containerWide: {
    // A single centered column on wide screens, a little narrower than the page.
    maxWidth: 720,
  },
  backgroundGridWide: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
