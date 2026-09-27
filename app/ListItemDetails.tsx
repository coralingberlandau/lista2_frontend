import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Image, FlatList, ImageBackground, useWindowDimensions, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { BackgroundImage, ImageData, ListItem, RootStackParamList, User } from './type';
import { Ionicons, AntDesign, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { ScrollView } from 'react-native-gesture-handler';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors, fonts, radii, shadows } from '@/constants/theme';

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [largeImage, setLargeImage] = useState<string | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [backgroundImageId, setBackgroundImageId] = useState<string>('25');
  const { width, height } = useWindowDimensions();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatedImagesIndex, setUpdatedImagesIndex] = useState<string[]>([])
  const [deletedImagesIndex, setDeletedImagesIndex] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null);
  const [permissionType, setPermissionType] = useState<string>('full_access');
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const SERVER = "https://lista-backend-n3la.onrender.com"


  const backgroundImages = [
    require('../assets/background/back1.jpg'),
    require('../assets/background/back2.jpg'),
    require('../assets/background/back3.jpg'),
    require('../assets/background/back4.jpg'),
    require('../assets/background/back5.jpg'),
    require('../assets/background/back6.jpg'),
    require('../assets/background/back7.jpg'),
    require('../assets/background/back8.jpg'),
    require('../assets/background/back9.jpg'),
    require('../assets/background/back10.jpg'),
    require('../assets/background/back11.jpg'),
    require('../assets/background/back12.jpg'),
    require('../assets/background/back13.jpg'),
    require('../assets/background/back14.jpg'),
    require('../assets/background/back15.jpg'),
    require('../assets/background/back16.jpg'),
    require('../assets/background/back17.jpg'),
    require('../assets/background/back18.jpg'),
    require('../assets/background/back19.jpg'),
    require('../assets/background/back20.jpg'),
    require('../assets/background/back21.jpg'),
    require('../assets/background/back22.jpg'),
    require('../assets/background/back23.jpg'),
    require('../assets/background/back24.jpg'),
  ];

  useFocusEffect(
    useCallback(() => {
      setTitle(listItem?.title || '');
      setItems(listItem?.items.split("|") || ['']);
      setUpdatedImagesIndex([])
      setDeletedImagesIndex([])
      getImages()
      getBackgroundImage()
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
      return;
    }

    setLoading(true);
    try {
      const data = await getRecommendations(listItem.id);
      if (data && data.recommended_items) {
        setRecommendations(data.recommended_items.split(','));
        console.log('Recommendations data:', data);

      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async (listItemId: number) => {
    try {
      const response = await axios.get(`${SERVER}/recommendations/${listItemId}/`)
      console.log('Server response:', response);
      if (response.status !== 200) {
        throw new Error('Network response was not ok');
      }
      const data = await response.data;
      return data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }

  const handleAddItem = async () => {
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

        await handleSaveImages(itemId)

        Toast.show({
          type: 'success',
          text1: 'The list has been saved successfully!',
        });

        navigation.navigate('Home');

      } catch (error) {
        console.error('Error adding list item:', error);
        Toast.show({
          type: 'error',
          text1: 'Error adding the item',
          text2: 'Please try again later',
        });
      }
    };
  };

  const AddItemToList = () => {
    setItems(prev => [...prev, '']);
  };

  const handleItemChange = (text: string, index: number) => {
    const newItems = [...items];
    newItems[index] = text;
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
    setIsModalVisible(true);
  };

  const handlePermissionSelect = (selectedPermission: string) => {
    setPermission(selectedPermission);
  };

  const handleConfirmShare = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');

    if (storedUserId && token) {
      try {
        const userResponse: { data: User } = await axios.get(`${SERVER}/get_user_info/${shareValue}/`,
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
          permission_type: permission,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        Toast.show({
          type: 'success',
          text1: 'List shared successfully!',
        });
        setShareValue('');
      } catch (error: any) {
        console.error('Error sharing list item:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
        }
        if (error.status === 404) {
          Toast.show({
            type: 'error',
            text1: 'User not found. Please verify the email',
          });
        }
        else {
          Toast.show({
            type: 'error',
            text1: 'Error sharing the list. Please try again later.',
          });
        }
        setShareValue('');
      } finally {
        setIsModalVisible(false);
      }
    } else {
      Toast.show({
        type: 'error',
        text1: 'User ID or token not found. Please log in again.',
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

  const getBackgroundImage = async () => {
    const backgroundId = await AsyncStorage.getItem('customizations');
    setBackgroundImageId(backgroundId)
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
        text1: 'The item has been deleted successfully!',
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
        text1: 'Error deleting the item',
        text2: 'Please try again later',
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

      listItem && await handleSaveImages(listItem.id)
      Toast.show({
        type: 'success',
        text1: 'The list has been updated successfully!',
      });

      navigation.navigate('Home');
    } catch (error: unknown) {

      if (axios.isAxiosError(error)) {
        console.error("Error updating list:", error.response ? error.response.data : error.message);
      } else {
        console.error("Unexpected error:", error);
      }
      Toast.show({
        type: 'error',
        text1: 'Error updating the item',
        text2: 'Please try again later',
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
      const newImage: ImageData = {
        uri: result.assets[0].uri,
        fileName: result.assets[0].fileName || `image_${index}.jpeg`,
        mimeType: result.assets[0].type || 'image/jpeg',
        index: index,
      };

      setImages([...images, newImage]);
    }
  };

  const handleSaveImages = async (listItemId: number) => {
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
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      catch { }
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
        const response = await axios.post(`${SERVER}/listitemimages/upload_images/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('response', response);
        return response.data;
      } catch (error) {
        console.error('Error uploading images', error);
      }
    }
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
      <ImageBackground
        source={backgroundImages[parseInt(backgroundImageId, 10) - 1]}
        style={[styles.background, { width, height }]}
        resizeMode="cover">
        <ScrollView contentContainerStyle={styles.container}>
          <GlassCard style={styles.headerCard} contentStyle={styles.headerCardContent}>
            <TextInput
              style={[styles.titleInput, { outline: 'none' }]}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.placeholder}
              placeholder="Edit Title" />
          </GlassCard>

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
                    <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{ marginRight: 10 }}>
                      <AntDesign name="delete" size={20} color={colors.danger} />
                    </TouchableOpacity>
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
                      value={item}
                      onChangeText={(text) => handleItemChange(text, index)}
                    />
                  </View>
                )
              }}
              keyExtractor={(_, index) => index.toString()} />
          </GlassCard>

          <View style={styles.iconRowContainer}>
            {isUpdateMode && (
              <TouchableOpacity style={styles.iconContainer} onPress={fetchRecommendations}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="lightbulb" size={17} color={colors.primary} />
                </View>
                <Text style={styles.iconLabel}>AI</Text>
              </TouchableOpacity>
            )}
            {isAIModalVisible && (
              <View style={styles.overlay}>
                <GlassCard style={styles.modalCard} contentStyle={styles.modalContainer} tint={colors.glassBgStrong}>
                  <Text style={styles.modalTitle}>AI Recommendations</Text>
                  {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <View style={styles.recommendationsContainer}>
                      {recommendations.length > 0 ? (
                        <FlatList
                          data={recommendations}
                          keyExtractor={(item, index) => index.toString()}
                          renderItem={({ item }) => (
                            <View style={styles.recommendationItem}>
                              <Text style={styles.recommendationText}>{item}</Text>
                            </View>
                          )}
                        />
                      ) : (
                        <View style={styles.emptyContainer}>
                          <ScrollView contentContainerStyle={styles.scrollViewContent}>
                            <Text style={styles.emptyText}>Temporary unavailable....</Text>
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.separator} />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsAIModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
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
              <View style={styles.overlay}>
                <GlassCard style={styles.modalCard} contentStyle={styles.modalContainer} tint={colors.glassBgStrong}>
                  <Text style={styles.modalTitle}>Select Permission</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={permission}
                      onValueChange={handlePermissionSelect}
                      style={styles.picker}
                    >
                      <Picker.Item label="Read Only" value="read_only" />
                      <Picker.Item label="Full Access" value="full_access" />
                    </Picker>
                  </View>
                  <TextInput
                    placeholder="Enter a email"
                    placeholderTextColor={colors.placeholder}
                    value={shareValue}
                    onChangeText={setShareValue}
                    style={styles.input}
                  />
                  <PrimaryButton title="Confirm Share" onPress={handleConfirmShare} style={styles.confirmButton} />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setIsModalVisible(false);
                    }}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </GlassCard>
              </View>
            )}
            {isUpdateMode && permissionType === 'full_access' && (
              <TouchableOpacity style={styles.iconContainer} onPress={() => handleDeleteItem()}>
                <View style={styles.iconCircle}>
                  <AntDesign name="delete" size={17} color={colors.danger} />
                </View>
                <Text style={styles.iconLabel}>Delete</Text>
              </TouchableOpacity>
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
      </ImageBackground>
    </View >
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 52,
  },
  headerCard: {
    marginBottom: 14,
  },
  headerCardContent: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  titleInput: {
    width: '100%',
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.text,
    paddingVertical: 10,
  },
  itemsCard: {
    marginBottom: 6,
  },
  itemsCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 14,
  },
  updateButton: {
    marginVertical: 10,
    marginBottom: 30,
  },
  modalTitle: {
    marginBottom: 15,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 20,
    textAlign: 'center',
  },
  confirmButton: {
    marginTop: 20,
    marginBottom: 10,
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
  modalCard: {},
  modalContainer: {
    borderRadius: 10,
    padding: 20,
    margin: 20,
  },
  pickerContainer: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  input: {
    height: 48,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: colors.inputBg,
    fontFamily: fonts.body,
    color: colors.text,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(226,83,107,0.12)',
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: colors.danger,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
  recommendationsContainer: {
    marginTop: 20,
  },
  recommendationItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  recommendationText: {
    fontFamily: fonts.body,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    maxHeight: 150,
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontStyle: 'italic',
  },
  separator: {
    height: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default ListItemDetails;
