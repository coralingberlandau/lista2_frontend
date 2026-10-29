import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ListItem, RootStackParamList } from '../type';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import PageGate from '@/components/PageGate';
import GlassCard from '@/components/GlassCard';
import { colors, fonts, radii, shadows, progressGradient } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { describeError } from '@/utils/describeError';
import { countItems } from '@/utils/countItems';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ListItemDetails'>;

type HomeProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};

const Home: React.FC<HomeProps> = ({ setIsLoggedIn }) => {
  // On a wide window the list is a centered column, so the add button follows the column's right edge.
  const { width: windowWidth } = useWindowDimensions();
  const addButtonRight = 30 + Math.max(0, (windowWidth - 760) / 2);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const SERVER = API_URL;


  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  );

  const fetchData = useCallback(async () => {
    // The whole page shows only the three dots until the latest lists have arrived, so nobody
    // sees a half-drawn page or an old copy.
    setLoading(true);
    setLoadError(null);

    try {
      const [storedUsername, storedUserId, token] = await Promise.all([
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('token'),
      ]);

      if (!token) {
        throw new Error('No token found');
      }
      if (storedUsername) {
        setUsername(storedUsername);
      }

      if (storedUserId && token) {
        const response = await axios.get(`${SERVER}/grouplists/by-user/${storedUserId}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const activeItems = response.data.filter((item: ListItem) => item.is_active);
        setListItems(activeItems);
      }
    } catch (error) {
      console.error('Error fetching user list items:', error);
      setLoadError(
        error instanceof Error && error.message === 'No token found'
          ? 'Your session expired. Please log in again.'
          : describeError(error)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddListItem = () => {
    navigation.navigate('ListItemDetails');
  };
  const handlePressItem = (item: ListItem) => {
    navigation.navigate('ListItemDetails', { listItem: item });
  };

  return (
    <PageGate
      loading={loading}
      error={loadError ? { title: "Couldn't load your lists", message: loadError, onRetry: fetchData } : null}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {(
          <>
            <View style={styles.headerContainer}>
              <View style={styles.titleBlock}>
                <Text style={styles.greeting}>Hello, {username || 'Guest'}</Text>
                <View style={styles.titleRule} />
                <Text style={styles.subGreeting}>
                  {listItems.length === 0
                    ? 'No lists yet'
                    : `${listItems.length} active list${listItems.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>

            {listItems.length === 0 && (
              <Text style={styles.emptyTitle}>Write your dreams here!</Text>
            )}

            {/* A plain column of cards, not a FlatList: a FlatList with scrolling switched off gets
                touch-action: none on the web, which stops a finger drag that starts on a card from
                scrolling the page on a phone (iPhone Safari and Android Chrome). */}
            <View style={styles.listContent}>
              {listItems.map((item) => {
                const { done, total } = countItems(item.items, item.picture_rows);
                const progress = total > 0 ? done / total : 0;
                const gradient = progressGradient(done, total);
                return (
                  <TouchableOpacity key={item.id} onPress={() => handlePressItem(item)} activeOpacity={0.85}>
                    <GlassCard style={styles.listCard} contentStyle={styles.listCardContent}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.boldText}>{item.title}</Text>
                        {total > 0 && (
                          <LinearGradient
                            colors={gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.badge}
                          >
                            <Text style={styles.badgeText}>{done}/{total}</Text>
                          </LinearGradient>
                        )}
                      </View>
                      {total > 0 ? (
                        <View style={styles.progressTrack}>
                          <LinearGradient
                            colors={gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%` }]}
                          />
                        </View>
                      ) : (
                        <Text style={styles.emptyListNote}>No items yet</Text>
                      )}
                    </GlassCard>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
      <TouchableOpacity style={[styles.addButton, { right: addButtonRight }]} onPress={handleAddListItem}>
        <AntDesign name="plus" size={24} color="#fff" />
      </TouchableOpacity>
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
    padding: 24,
    paddingTop: 56,
    paddingBottom: 110,
  },
  headerContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  titleBlock: {
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.text,
    textAlign: 'center',
  },
  titleRule: {
    width: 32,
    height: 1,
    backgroundColor: colors.placeholder,
    marginVertical: 8,
  },
  subGreeting: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 28,
    color: colors.textMuted,
    marginTop: 40,
    textAlign: 'center',
  },
  listContent: {
    marginTop: 24,
    gap: 14,
  },
  listCard: {
    marginBottom: 14,
  },
  listCardContent: {
    padding: 18,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  emptyListNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(106,91,214,0.12)',
    borderRadius: radii.pill,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  addButton: {
    position: 'absolute',
    bottom: 96,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  boldText: {
    fontFamily: fonts.bodyBoldTitle,
    fontSize: 17,
    color: colors.text,
  },
});

export default Home;
