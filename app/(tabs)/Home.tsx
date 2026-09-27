import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ListItem, RootStackParamList } from '../type';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ScrollView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import AuroraBackground from '@/components/AuroraBackground';
import GlassCard from '@/components/GlassCard';
import { colors, fonts, radii, shadows, progressGradient } from '@/constants/theme';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ListItemDetails'>;

type HomeProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
};

const Home: React.FC<HomeProps> = ({ setIsLoggedIn }) => {
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<NavigationProp>();
  const SERVER = "https://lista-backend-n3la.onrender.com"


  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  );

  const fetchData = useCallback(async () => {
    setListItems([]);
    setLoading(true);

    try {
      const storedUsername = await AsyncStorage.getItem('userName');
      const storedUserId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');

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
      Alert.alert('Error', 'Failed to fetch your list items. Please try again later.');
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

  const doneCount = (item: ListItem) =>
    item.items.split('|').filter((line) => line.includes('✔️')).length;
  const totalCount = (item: ListItem) => item.items.split('|').length;

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Hello, {username || 'Guest'}</Text>
                <Text style={styles.subGreeting}>
                  {listItems.length === 0
                    ? 'No lists yet'
                    : `${listItems.length} active list${listItems.length === 1 ? '' : 's'}`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <AntDesign name="logout" size={17} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {listItems.length === 0 && (
              <Text style={styles.emptyTitle}>Write your dreams here!</Text>
            )}

            <FlatList
              data={listItems}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const done = doneCount(item);
                const total = totalCount(item);
                const progress = total > 0 ? done / total : 0;
                const gradient = progressGradient(done, total);
                return (
                  <TouchableOpacity onPress={() => handlePressItem(item)} activeOpacity={0.85}>
                    <GlassCard style={styles.listCard} contentStyle={styles.listCardContent}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.boldText}>{item.title}</Text>
                        <LinearGradient
                          colors={gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.badge}
                        >
                          <Text style={styles.badgeText}>{done}/{total}</Text>
                        </LinearGradient>
                      </View>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.descriptionText}>
                        {item.items.split('|').join(' · ')}
                      </Text>
                      <View style={styles.progressTrack}>
                        <LinearGradient
                          colors={gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${Math.max(progress * 100, total > 0 ? 4 : 0)}%` }]}
                        />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                )
              }}
            />
          </>
        )}
      </ScrollView>
      {!loading && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddListItem}>
          <AntDesign name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    padding: 24,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
  },
  subGreeting: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 20,
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
    bottom: 30,
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
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 8,
  },
  loadingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    color: colors.primary,
    marginTop: 60,
    textAlign: 'center',
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
});

export default Home;
