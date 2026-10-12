import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Image, FlatList, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { ImageData, ListItem, RootStackParamList, User } from './type';
import { Ionicons, AntDesign, FontAwesome, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ScrollView } from 'react-native-gesture-handler';
import AppBackground from '@/components/AppBackground';
import AuroraDotsLoader from '@/components/AuroraDotsLoader';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts, radii, shadows } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { describeError } from '@/utils/describeError';
import { shrinkImage } from '@/utils/resizeImage';

type ListItemDetailsRouteProp = RouteProp<RootStackParamList, 'ListItemDetails'>;

const ListItemDetails: React.FC = () => {
  const route = useRoute<ListItemDetailsRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Home'>>();
  const { listItem }: { listItem?: ListItem } = route.params || {};
  const isUpdateMode = !!listItem
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [title, setTitle] = useState(listItem ? listItem.title : '');
  const [items, setItems] = useState<string[]>(listItem ? listItem.items.split("|") : ['']);
  const [permission, setPermission] = useState('read_only');
  const [shareValue, setShareValue] = useState('');
  const [sharePeople, setSharePeople] = useState<{ email: string; permission: string }[]>([]);
  const [failedEmails, setFailedEmails] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [largeImage, setLargeImage] = useState<string | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const { width, height } = useWindowDimensions();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedImagesIndex, setUpdatedImagesIndex] = useState<string[]>([])
  const [deletedImagesIndex, setDeletedImagesIndex] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null);
  const [permissionType, setPermissionType] = useState<string>('full_access');
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ideas' | 'empty' | 'error'>('loading');
  const SERVER = API_URL;


  useFocusEffect(
    useCallback(() => {
      setTitle(listItem?.title || '');
      setItems(listItem?.items.split("|") || ['']);
      setUpdatedImagesIndex([])
      setDeletedImagesIndex([])
      getImages()
      fetchPermissionType();
    }, [listItem])
  );

  const fetchPermissionType = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');
    if (!storedUserId || !listItem?.id) {
      setPermissionType('full_access')
      setError('Missing user_id or list_item_id');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${SERVER}/grouplists/permission_type/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          user_id: storedUserId,
          list_item_id: listItem?.id,
        }
      });

      setPermissionType(response.data.permission_type);
    } catch (err) {
      console.error('Error fetching permission type:', err);
      setError('Failed to fetch permission type');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsAIModalVisible(true);
    if (!listItem || !listItem.id) {
      console.error('Item ID is not available');
      setAiStatus('error');
      return;
    }

    setAiStatus('loading');
    setLoading(true);
    try {
      const suggestions = await getRecommendations(items);
      setRecommendations(suggestions);
      setAiStatus(suggestions.length > 0 ? 'ideas' : 'empty');
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
      setAiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async (currentItems: string[]): Promise<string[]> => {
    const response = await axios.post('/.netlify/functions/recommendations', {
      items: currentItems.filter((item) => item.trim() !== ''),
    });
    const recommendations = response.data?.recommendations;
    if (!Array.isArray(recommendations)) {
      throw new Error('Unexpected recommendations response');
    }
    return recommendations;
  }

  const handleAddItem = async () => {
    if (!title.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Add a title to save your list.',
      });
      return;
    }

    const storedUserId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');
    if (storedUserId && token) {
      try {
        const itemsToString = items.join("|");
        const response = await axios.post(`${SERVER}/listitem/`, {
          title,
          items: itemsToString,
          user: storedUserId,
          is_active: true,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const itemId = response.data.id;

        await axios.post(`${SERVER}/grouplists/`, {
          user: storedUserId,
          list_item: itemId,
          role: 'admin',
          permission_type: 'full_access',
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const imageProblem = await handleSaveImages(itemId)

        if (imageProblem) {
          // The list itself is saved; only the picture(s) were not.
          Toast.show({
            type: 'error',
            text1: "Your list was saved, but a picture wasn't",
            text2: imageProblem,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'Your list was saved.',
          });
        }

        navigation.navigate('Home');

      } catch (error) {
        console.error('Error adding list item:', error);
        Toast.show({
          type: 'error',
          text1: "Couldn't save your list",
          text2: describeError(error),
        });
      }
    };
  };

  const AddItemToList = () => {
    setItems(prev => [...prev, '']);
  };

  const handleItemChange = (text: string, index: number) => {
    const newItems = [...items];
    const wasChecked = newItems[index].startsWith('✔️ ');
    newItems[index] = wasChecked ? `✔️ ${text}` : text;
    setItems(newItems);
  };

  const handleToggleItem = (index: number) => {
    const newItems = [...items];
    const itemText = newItems[index];
    if (itemText.startsWith('✔️ ')) {
      newItems[index] = itemText.replace('✔️ ', '');
    } else {
      newItems[index] = `✔️ ${itemText}`;
    }
    setItems(newItems);
  };

  const allItemsChecked = items.length > 0 && items.every((item) => item.startsWith('✔️ '));

  const handleToggleAllItems = () => {
    setItems((prev) =>
      prev.map((item) => {
        const isChecked = item.startsWith('✔️ ');
        if (allItemsChecked) {
          return isChecked ? item.replace('✔️ ', '') : item;
        }
        return isChecked ? item : `✔️ ${item}`;
      })
    );
  };

  const handleRemoveImages = (index: number, imageToRemove: ImageData) => {
    const newImages = images.filter((image) => image.index !== index)
    setImages(newImages);
    setDeletedImagesIndex(prev => [...prev, imageToRemove.index.toString()])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    const imageToRemove = images.filter((image: ImageData) => image.index === index)
    const updateImages = images.filter((image: ImageData) => image.index !== index)
    if (imageToRemove && imageToRemove.length > 0) {
      handleRemoveImages(index, imageToRemove[0])
    }
    updateImages.forEach((image) => {
      if (image.index > index) {
        const imgeIndex = image.index
        setUpdatedImagesIndex(prev => [...prev, imgeIndex.toString()])
        image.index--
      }
    })
    setImages(updateImages)
  };

  const handleSharePress = () => {
    setSharePeople([]);
    setFailedEmails([]);
    setShareValue('');
    setIsModalVisible(true);
  };

  const handlePermissionSelect = (selectedPermission: string) => {
    setPermission(selectedPermission);
  };

  const shareTotal =
    sharePeople.length +
    (shareValue.trim() && !sharePeople.some((person) => person.email.toLowerCase() === shareValue.trim().toLowerCase()) ? 1 : 0);

  const hasSharePerson = (email: string) =>
    sharePeople.some((person) => person.email.toLowerCase() === email.toLowerCase());

  const handleAddSharePerson = () => {
    const email = shareValue.trim();
    if (!email) {
      return;
    }
    if (hasSharePerson(email)) {
      Toast.show({
        type: 'error',
        text1: 'That email is already added.',
      });
      return;
    }
    setSharePeople((prev) => [...prev, { email, permission }]);
    setFailedEmails((prev) => prev.filter((failed) => failed !== email));
    setShareValue('');
  };

  const handleMoveSharePerson = (email: string) => {
    setSharePeople((prev) =>
      prev.map((person) =>
        person.email === email
          ? { ...person, permission: person.permission === 'read_only' ? 'full_access' : 'read_only' }
          : person
      )
    );
  };

  const handleRemoveSharePerson = (email: string) => {
    setSharePeople((prev) => prev.filter((person) => person.email !== email));
    setFailedEmails((prev) => prev.filter((failed) => failed !== email));
  };

  const shareOneEmail = async (email: string, personPermission: string, token: string) => {
    const userResponse: { data: User } = await axios.get(`${SERVER}/get_user_info/${email}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(userResponse, userResponse.data.id)
    await axios.post(`${SERVER}/grouplists/`, {
      user: userResponse.data.id,
      list_item: listItem?.id,
      role: 'member',
      permission_type: personPermission,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const handleConfirmShare = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');

    if (storedUserId && token) {
      const people = [...sharePeople];
      const pendingEmail = shareValue.trim();
      if (pendingEmail && !hasSharePerson(pendingEmail)) {
        people.push({ email: pendingEmail, permission });
      }

      if (people.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Add at least one email to share with.',
        });
        return;
      }

      setIsSharing(true);
      setFailedEmails([]);
      let sharedCount = 0;
      const notFound: string[] = [];
      const otherFailed: string[] = [];
      let otherReason = '';

      for (const person of people) {
        try {
          await shareOneEmail(person.email, person.permission, token);
          sharedCount += 1;
        } catch (error: any) {
          console.error('Error sharing list item:', error);
          if (error.response) {
            console.error('Response data:', error.response.data);
          }
          if (error.response?.status === 404 || error.status === 404) {
            notFound.push(person.email);
          } else {
            otherFailed.push(person.email);
            otherReason = describeError(error);
          }
        }
      }

      setIsSharing(false);
      setShareValue('');
      const failed = [...notFound, ...otherFailed];

      if (failed.length === 0) {
        Toast.show({
          type: 'success',
          text1: sharedCount === 1 ? 'List shared.' : `List shared with ${sharedCount} people.`,
        });
        setSharePeople([]);
        setIsModalVisible(false);
        return;
      }

      setSharePeople(people.filter((person) => failed.includes(person.email)));
      setFailedEmails(failed);
      const details: string[] = [];
      if (notFound.length > 0) {
        details.push(`Couldn't find: ${notFound.join(', ')}. They need to join Lista first, then share again.`);
      }
      if (otherFailed.length > 0) {
        details.push(`Couldn't share with ${otherFailed.join(', ')}. ${otherReason}`);
      }
      Toast.show({
        type: 'error',
        text1:
          sharedCount > 0
            ? `Shared with ${sharedCount} ${sharedCount === 1 ? 'person' : 'people'}.`
            : "Couldn't share the list.",
        text2: details.join(' '),
        visibilityTime: 7000,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Your session expired.',
        text2: 'Please log in again.',
      });
    }
  };

  const getImages = async () => {
    try {
      if (listItem?.id) {
        const response = await axios.get(
          `${SERVER}/listitemimages/${listItem.id}/get_images_for_list_item/`, {
        }

        );
        if (response.status === 200 && Array.isArray(response.data.images)) {
          console.log('response', response.data.images)
          const formattedImages = response.data.images.map((image: any) => {
            const imageUrl = image.url.startsWith("http")
              ? image.url
              : `${SERVER}${image.url}`;
            return {
              id: image.id || 0,
              uri: imageUrl || "",
              fileName: image.fileName || "unknown.jpg",
              mimeType: image.mimeType || "image/jpeg",
              index: image.index,
            };
          });
          setImages(formattedImages);
        } else {
          console.error("Invalid response format:", response.data);
          setImages([]);
        }
      } else {
        setImages([]);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error("User is not logged in!");
        return;
      }

      listItem && await axios.patch(
        `${SERVER}/listitem/${listItem.id}/`,
        { is_active: false },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      Toast.show({
        type: 'success',
        text1: 'Your list was deleted.',
      });

      setIsMenuVisible(false);
      navigation.navigate('Home');

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Error deleting item:", error.response ? error.response.data : error.message);
      } else {
        console.error("Unexpected error:", error);
      }
      Toast.show({
        type: 'error',
        text1: "Couldn't delete your list",
        text2: describeError(error),
      });
    }
  }

  const handleUpdateList = async () => {
    const itemsToString = items.join("|");
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error("User is not logged in!");
        return;
      }

      listItem && await axios.patch(
        `${SERVER}/listitem/${listItem.id}/`,
        { title, items: itemsToString },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const imageProblem = listItem ? await handleSaveImages(listItem.id) : null
      if (imageProblem) {
        // The list itself is saved; only the picture change(s) were not.
        Toast.show({
          type: 'error',
          text1: "Your list was updated, but a picture wasn't",
          text2: imageProblem,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Your list was updated.',
        });
      }

      navigation.navigate('Home');
    } catch (error: unknown) {

      if (axios.isAxiosError(error)) {
        console.error("Error updating list:", error.response ? error.response.data : error.message);
      } else {
        console.error("Unexpected error:", error);
      }
      Toast.show({
        type: 'error',
        text1: "Couldn't update your list",
        text2: describeError(error),
      });
    }
  };

  const handleAddImage = async (index: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    console.log('result images', result);

    if (!result.canceled && result.assets) {
      const asset = result.assets[0];
      // Shrink big photos before they are kept for upload (the server refuses very large uploads).
      let picture;
      try {
        picture = await shrinkImage(asset.uri);
      } catch (error) {
        console.error('Could not process the picture:', error);
        Toast.show({
          type: 'error',
          text1: "Couldn't use this picture",
          text2: 'Try a JPEG or PNG picture.',
        });
        return;
      }
      const newImage: ImageData = {
        uri: picture.uri,
        // The server adds the file extension itself, so keep the name without one.
        fileName: (asset.fileName || `image_${index}`).replace(/\.[^.]+$/, ''),
        mimeType: picture.mimeType,
        index: index,
      };

      setImages([...images, newImage]);
    }
  };

  // Explains, in one short sentence, why a picture could not be saved.
  const describeImageError = (error: unknown): string => {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 413) return 'That picture is too large. Choose a smaller one.';
      if (error.response.status === 400) return "That picture couldn't be read. Try a different one.";
    }
    return describeError(error);
  };

  // Saves the picture changes of a list. Returns null when everything was saved, or a short
  // message explaining what went wrong (so the caller can tell the user instead of claiming success).
  const handleSaveImages = async (listItemId: number): Promise<string | null> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      return 'Your session expired. Please log in again.';
    }
    const authHeader = { Authorization: `Bearer ${token}` };
    let problem: string | null = null;

    if (isUpdateMode && (deletedImagesIndex.length > 0 || updatedImagesIndex.length > 0)) {
      try {
        console.log({ deletedImagesIndex, updatedImagesIndex })
        await axios.post(`${SERVER}/listitemimages/update_images/`,
          {
            list_item_id: listItem.id,
            deletedImagesIndex: deletedImagesIndex,
            updatedImagesIndex: updatedImagesIndex
          }, {
          headers: {
            ...authHeader,
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      catch (error) {
        console.error('Error updating pictures', error);
        problem = describeImageError(error);
      }
    }

    const formData = new FormData();
    formData.append('list_item', listItemId.toString());

    for (const image of images) {
      if (image.fileName === 'unknown.jpg') {
        continue
      }

      const base64Image = image.uri.split(',')[1];

      formData.append('images', JSON.stringify({
        uri: base64Image,
        fileName: image.fileName,
        mimeType: image.mimeType,
        index: image.index
      }));
    }
    if (formData.has('images')) {
      try {
        await axios.post(`${SERVER}/listitemimages/upload_images/`, formData, {
          headers: {
            ...authHeader,
            'Content-Type': 'multipart/form-data',
          },
        });
      } catch (error) {
        console.error('Error uploading images', error);
        problem = describeImageError(error);
      }
    }
    return problem;
  };
  const handleShowLargeImage = (index: number) => {
    const selectedImage = images.find((img) => img.index === index);
    if (selectedImage) {
      setLargeImage(selectedImage.uri);
      setModalVisible(true);
    } else {
      console.error("Image not found for index:", index);
    }
  };

  const handleCloseLargeImage = () => {
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBackground />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.titleBlock}>
            <TextInput
              style={[styles.titleInput, { outline: 'none' }]}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.placeholder}
              placeholder="Edit Title" />
            <View style={styles.titleRule} />
          </View>

          <GlassCard style={styles.itemsCard} contentStyle={styles.itemsCardContent}>
            <FlatList
              data={items}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const filterImage = images && images.filter((img) => img.index === index)
                const isChecked = item.includes('✔️');
                return (
                  <View style={styles.item}>
                    <TouchableOpacity onPress={() => handleToggleItem(index)} style={{ marginRight: 10 }}>
                      <FontAwesome
                        name={isChecked ? "check-square-o" : "square-o"}
                        size={22}
                        color={isChecked ? colors.primary : colors.placeholder}
                      />
                    </TouchableOpacity>

                    {filterImage.length > 0 ? (
                      <TouchableOpacity
                        key={filterImage[0].id}
                        onPress={() => handleShowLargeImage(index)}
                        style={{ marginRight: 10 }}
                      >
                        <Image
                          source={{ uri: filterImage[0].uri }}
                          style={{ width: 25, height: 25, borderRadius: 6 }}
                          onError={() => console.error("Failed to load image")}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => handleAddImage(index)} style={{ marginRight: 10 }}>
                        <FontAwesome name="image" size={22} color={colors.primaryLight} />
                      </TouchableOpacity>
                    )}
                    <Modal
                      visible={modalVisible}
                      onRequestClose={handleCloseLargeImage}
                      animationType="fade"
                      transparent={true}
                    >
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(38,34,59,0.85)' }}>
                        <View style={styles.seeImage}>
                          <TouchableOpacity onPress={handleCloseLargeImage}>
                            {largeImage ? (
                              <Image
                                source={{ uri: largeImage }}
                                style={{
                                  width: width * 0.9,
                                  height: height * 0.7,
                                  borderRadius: 10,
                                  resizeMode: 'contain',
                                }}
                                onError={() => console.error('Failed to load large image')}
                              />
                            ) : (
                              <Text>Image not available</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                    <TextInput
                      style={[
                        styles.textArea,
                        {
                          outline: 'none',
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                        },
                      ]}
                      placeholder="Write here..."
                      placeholderTextColor={colors.placeholder}
                      multiline={false}
                      value={isChecked ? item.replace('✔️ ', '') : item}
                      onChangeText={(text) => handleItemChange(text, index)}
                    />
                    <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{ marginLeft: 10 }}>
                      <Feather name="trash-2" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )
              }}
              keyExtractor={(_, index) => index.toString()} />
          </GlassCard>

          <View style={styles.iconRowContainer}>
            {isUpdateMode && (
              <TouchableOpacity style={styles.iconContainer} onPress={fetchRecommendations}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>💡</Text>
                </View>
                <Text style={styles.iconLabel}>AI</Text>
              </TouchableOpacity>
            )}
            {isAIModalVisible && (
              <View style={styles.shareOverlay}>
                <GlassCard style={styles.shareCard} contentStyle={styles.shareCardContent} tint={colors.glassBgStrong}>
                  <TouchableOpacity style={styles.shareCloseButton} onPress={() => setIsAIModalVisible(false)}>
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.shareTitle}>Ideas for your list</Text>
                  <View style={styles.shareTitleRule} />
                  {aiStatus === 'loading' && (
                    <View style={styles.aiStateBox}>
                      <AuroraDotsLoader />
                      <Text style={styles.aiStateTitle}>Thinking of ideas…</Text>
                    </View>
                  )}
                  {aiStatus === 'ideas' && (
                    <View>
                      <View style={styles.aiLabelRow}>
                        <Text style={styles.aiLabelEmoji}>💡</Text>
                        <Text style={styles.shareLabelInline}>AI Recommendations</Text>
                      </View>
                      <ScrollView style={styles.aiIdeasScroll}>
                        {recommendations.map((idea, index) => (
                          <View key={index} style={styles.aiIdeaRow}>
                            <Text style={styles.aiIdeaText}>{idea}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {aiStatus === 'empty' && (
                    <View style={styles.aiStateBox}>
                      <View style={[styles.aiStateIcon, styles.aiStateIconSoft]}>
                        <Text style={styles.aiStateEmoji}>💡</Text>
                      </View>
                      <Text style={styles.aiStateTitle}>No ideas this time</Text>
                      <Text style={styles.aiStateText}>Add a few more items to your list, then ask again.</Text>
                    </View>
                  )}
                  {aiStatus === 'error' && (
                    <View style={styles.aiStateBox}>
                      <View style={[styles.aiStateIcon, styles.aiStateIconError]}>
                        <Text style={styles.aiStateExclaim}>!</Text>
                      </View>
                      <Text style={styles.aiStateTitle}>Couldn't load ideas</Text>
                      <Text style={styles.aiStateText}>Something went wrong. Please try again in a little while.</Text>
                      <TouchableOpacity style={styles.aiTryAgain} onPress={fetchRecommendations}>
                        <Ionicons name="refresh" size={14} color={colors.primary} />
                        <Text style={styles.aiTryAgainText}>Try again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </GlassCard>
              </View>
            )}
            {isUpdateMode && permissionType === 'full_access' && (
              <TouchableOpacity style={styles.iconContainer} onPress={handleSharePress}>
                <View style={styles.iconCircle}>
                  <Ionicons name="share-outline" size={18} color={colors.text} />
                </View>
                <Text style={styles.iconLabel}>Share</Text>
              </TouchableOpacity>
            )}
            {isModalVisible && (
              <View style={styles.shareOverlay}>
                <GlassCard style={styles.shareCard} contentStyle={styles.shareCardContent} tint={colors.glassBgStrong}>
                  <TouchableOpacity
                    style={styles.shareCloseButton}
                    onPress={() => {
                      setIsModalVisible(false);
                    }}
                  >
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.shareTitle}>Share list</Text>
                  <View style={styles.shareTitleRule} />
                  <Text style={styles.shareLabel}>Add an email</Text>
                  <View style={styles.shareInputRow}>
                    <TextInput
                      placeholder="Enter an email"
                      placeholderTextColor={colors.placeholder}
                      value={shareValue}
                      onChangeText={setShareValue}
                      onSubmitEditing={handleAddSharePerson}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[styles.input, styles.shareEmailInput]}
                    />
                    <TouchableOpacity style={styles.shareAddButton} onPress={handleAddSharePerson}>
                      <Ionicons name="add" size={22} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.permissionSwitch}>
                    <TouchableOpacity
                      style={[styles.permissionOption, permission === 'read_only' && styles.permissionOptionActive]}
                      onPress={() => handlePermissionSelect('read_only')}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={15}
                        color={permission === 'read_only' ? colors.text : colors.textMuted}
                      />
                      <Text style={[styles.permissionOptionText, permission === 'read_only' && styles.permissionOptionTextActive]}>
                        Read Only
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.permissionOption, permission === 'full_access' && styles.permissionOptionActive]}
                      onPress={() => handlePermissionSelect('full_access')}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={15}
                        color={permission === 'full_access' ? colors.text : colors.textMuted}
                      />
                      <Text style={[styles.permissionOptionText, permission === 'full_access' && styles.permissionOptionTextActive]}>
                        Full Access
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {sharePeople.length === 0 ? (
                    <Text style={styles.shareHint}>People you add will appear here, grouped by what they can do.</Text>
                  ) : (
                    (['read_only', 'full_access'] as const).map((groupPermission) => {
                      const members = sharePeople.filter((person) => person.permission === groupPermission);
                      if (members.length === 0) {
                        return null;
                      }
                      const isEditGroup = groupPermission === 'full_access';
                      return (
                        <View key={groupPermission} style={styles.shareGroup}>
                          <View style={styles.shareGroupHeader}>
                            <Ionicons
                              name={isEditGroup ? 'pencil-outline' : 'eye-outline'}
                              size={14}
                              color={colors.placeholder}
                            />
                            <Text style={styles.shareLabelInline}>
                              {isEditGroup ? 'Can edit' : 'Can view'} · {members.length}
                            </Text>
                          </View>
                          <View style={[styles.shareGroupBox, isEditGroup ? styles.shareGroupBoxEdit : styles.shareGroupBoxView]}>
                            {members.map((person) => {
                              const isFailed = failedEmails.includes(person.email);
                              return (
                                <View
                                  key={person.email}
                                  style={[
                                    styles.shareChip,
                                    isEditGroup ? styles.shareChipEdit : styles.shareChipView,
                                    isFailed && styles.shareChipFailed,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.shareChipText,
                                      isEditGroup ? styles.shareChipTextEdit : styles.shareChipTextView,
                                      isFailed && styles.shareChipTextFailed,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {person.email}
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.shareChipMove}
                                    onPress={() => handleMoveSharePerson(person.email)}
                                  >
                                    <Ionicons
                                      name={isEditGroup ? 'arrow-up' : 'arrow-down'}
                                      size={12}
                                      color={colors.textMuted}
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleRemoveSharePerson(person.email)}>
                                    <Ionicons name="close" size={14} color={colors.placeholder} />
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })
                  )}
                  <PrimaryButton
                    title={shareTotal > 0 ? `Confirm Share (${shareTotal})` : 'Confirm Share'}
                    onPress={handleConfirmShare}
                    loading={isSharing}
                    disabled={shareTotal === 0}
                    style={styles.confirmButton}
                  />
                </GlassCard>
              </View>
            )}
            {isUpdateMode && (
              <TouchableOpacity style={styles.iconContainer} onPress={handleToggleAllItems}>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark-circle-outline" size={19} color={colors.primary} />
                </View>
                <Text style={styles.iconLabel}>{allItemsChecked ? 'Uncheck All' : 'Check All'}</Text>
              </TouchableOpacity>
            )}
            {isUpdateMode && permissionType === 'full_access' && (
              <TouchableOpacity style={styles.iconContainer} onPress={() => setIsDeleteConfirmVisible(true)}>
                <View style={styles.iconCircle}>
                  <AntDesign name="delete" size={17} color={colors.danger} />
                </View>
                <Text style={styles.iconLabel}>Delete</Text>
              </TouchableOpacity>
            )}
            {isDeleteConfirmVisible && (
              <View style={styles.shareOverlay}>
                <GlassCard style={styles.shareCard} contentStyle={styles.shareCardContent} tint={colors.glassBgStrong}>
                  <TouchableOpacity style={styles.shareCloseButton} onPress={() => setIsDeleteConfirmVisible(false)}>
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.shareTitle}>Delete this list?</Text>
                  <View style={styles.shareTitleRule} />
                  <View style={styles.aiStateBox}>
                    <View style={[styles.aiStateIcon, styles.aiStateIconError, styles.deleteConfirmIcon]}>
                      <AntDesign name="delete" size={20} color={colors.danger} />
                    </View>
                    <Text style={styles.deleteConfirmName} numberOfLines={2}>
                      {title || (listItem ? listItem.title : '')}
                    </Text>
                    <Text style={styles.aiStateText}>This list will be deleted.</Text>
                    <Text style={styles.deleteConfirmWarning}>If it's shared, everyone loses access too.</Text>
                  </View>
                  <View style={styles.deleteConfirmButtons}>
                    <TouchableOpacity
                      style={[styles.deleteConfirmButton, styles.deleteCancelButton]}
                      onPress={() => setIsDeleteConfirmVisible(false)}
                    >
                      <Text style={styles.deleteCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteConfirmButton, styles.deleteConfirmDanger]}
                      onPress={() => {
                        setIsDeleteConfirmVisible(false);
                        handleDeleteItem();
                      }}
                    >
                      <Text style={styles.deleteConfirmDangerText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </View>
            )}
          </View>
          {permissionType === 'full_access' && (
            <TouchableOpacity style={styles.addItemButton} onPress={AddItemToList}>
              <Text style={styles.addItemButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          )}
          {permissionType === 'full_access' && (
            <PrimaryButton
              title={isUpdateMode ? 'Update List' : 'Create List'}
              onPress={isUpdateMode ? handleUpdateList : handleAddItem}
              style={styles.updateButton}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 52,
    paddingBottom: 110,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  titleInput: {
    fontSize: 35,
    fontFamily: fonts.display,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  titleRule: {
    width: 32,
    height: 1,
    backgroundColor: colors.placeholder,
    marginTop: 8,
  },
  itemsCard: {
    marginBottom: 6,
  },
  itemsCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  item: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  textArea: {
    flex: 2,
    borderWidth: 0,
    paddingLeft: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
  addItemButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    width: '100%',
  },
  addItemButtonText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  updateButton: {
    marginVertical: 10,
    marginBottom: 30,
  },
  confirmButton: {
    marginTop: 4,
    marginBottom: 0,
  },
  iconRowContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    paddingHorizontal: 10,
    marginTop: 10,
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 1,
  },
  iconContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.soft,
  },
  iconLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  iconEmoji: {
    fontSize: 16,
    lineHeight: 19,
  },
  shareOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(38,34,59,0.35)',
  },
  shareCard: {
    width: '88%',
    maxWidth: 380,
    borderRadius: radii.xl,
  },
  shareCardContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
  },
  shareCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(226,83,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  shareTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
  },
  shareTitleRule: {
    width: 32,
    height: 1,
    backgroundColor: colors.placeholder,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  aiStateBox: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  aiStateIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aiStateIconSoft: {
    backgroundColor: 'rgba(106,91,214,0.1)',
  },
  aiStateIconError: {
    backgroundColor: 'rgba(226,83,107,0.12)',
  },
  aiStateEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  aiStateExclaim: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.danger,
  },
  aiStateTitle: {
    fontFamily: fonts.displayItalic,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  aiStateText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  aiTryAgain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(106,91,214,0.07)',
  },
  aiTryAgainText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  deleteConfirmIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 10,
  },
  deleteConfirmName: {
    fontFamily: fonts.displayItalic,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  deleteConfirmWarning: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#B13A52',
    textAlign: 'center',
    marginTop: 6,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  deleteConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  deleteCancelButton: {
    borderColor: 'rgba(106,91,214,0.45)',
  },
  deleteCancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.primary,
  },
  deleteConfirmDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  deleteConfirmDangerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#fff',
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiLabelEmoji: {
    fontSize: 13,
  },
  aiIdeasScroll: {
    maxHeight: 260,
  },
  aiIdeaRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  aiIdeaText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  shareLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.placeholder,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  permissionSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(106,91,214,0.08)',
    borderRadius: radii.md - 4,
    padding: 4,
    marginBottom: 16,
  },
  permissionOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radii.sm - 3,
  },
  permissionOptionActive: {
    backgroundColor: colors.white,
    ...shadows.soft,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  shareInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  shareEmailInput: {
    flex: 1,
    marginBottom: 0,
  },
  shareAddButton: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.placeholder,
    marginBottom: 16,
  },
  shareGroup: {
    marginBottom: 12,
  },
  shareGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shareLabelInline: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.placeholder,
    textTransform: 'uppercase',
  },
  shareGroupBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  shareGroupBoxView: {
    backgroundColor: 'rgba(106,91,214,0.05)',
    borderColor: 'rgba(106,91,214,0.15)',
  },
  shareGroupBoxEdit: {
    backgroundColor: 'rgba(63,174,131,0.07)',
    borderColor: 'rgba(63,174,131,0.22)',
  },
  shareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: radii.pill,
  },
  shareChipView: {
    backgroundColor: 'rgba(106,91,214,0.13)',
  },
  shareChipEdit: {
    backgroundColor: 'rgba(63,174,131,0.18)',
  },
  shareChipFailed: {
    backgroundColor: 'rgba(226,83,107,0.16)',
  },
  shareChipText: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  shareChipTextView: {
    color: '#4B3FB5',
  },
  shareChipTextEdit: {
    color: '#1F5C42',
  },
  shareChipTextFailed: {
    color: '#7A2639',
  },
  shareChipMove: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  permissionOptionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  permissionOptionTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  input: {
    height: 48,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: colors.inputBg,
    fontFamily: fonts.body,
    color: colors.text,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  seeImage: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ListItemDetails;
