import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, FlatList, PanResponder, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { ImageData, ListItem, RootStackParamList, User } from './type';
import { Ionicons, AntDesign, FontAwesome, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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
import { countItems } from '@/utils/countItems';

// Remembers on this device that the "New ideas" explanation has been shown once.
const NEW_IDEAS_NOTICE_KEY = 'aiNewIdeasNoticeSeen';

type ListItemDetailsRouteProp = RouteProp<RootStackParamList, 'ListItemDetails'>;

// The six-dot handle on the left of a row. Only this handle starts a drag, so scrolling or tapping
// anywhere else on the row never moves it. It reports the drag to the screen, which does the work.
const RowDragHandle: React.FC<{
  onStart: () => void;
  onMove: (dy: number) => void;
  onEnd: (dy: number, cancelled: boolean) => void;
}> = ({ onStart, onMove, onEnd }) => {
  const latest = useRef({ onStart, onMove, onEnd });
  latest.current = { onStart, onMove, onEnd };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => latest.current.onStart(),
      onPanResponderMove: (_, gesture) => latest.current.onMove(gesture.dy),
      onPanResponderRelease: (_, gesture) => latest.current.onEnd(gesture.dy, false),
      onPanResponderTerminate: () => latest.current.onEnd(0, true),
    })
  ).current;
  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel="Drag to reorder"
      style={[styles.dragHandle, { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any]}
    >
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.dragHandleRow}>
          <View style={styles.dragHandleDot} />
          <View style={styles.dragHandleDot} />
        </View>
      ))}
    </View>
  );
};

const ListItemDetails: React.FC = () => {
  // The size of the window right now. It updates when the window is resized or the phone is
  // rotated, so the layout below follows it.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isNarrow = windowWidth < 720;
  // Pop-ups (viewer, AI ideas, share, delete) sit in the middle of the screen. On a short screen,
  // such as a phone turned sideways, they leave room for the tab bar and scroll if they are still
  // taller than what is left, so the close button and every control stay reachable.
  const overlayRoom = { paddingTop: 16, paddingBottom: windowHeight < 640 ? 80 : 16 };
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
  // Pictures of the list, one per row at most (a row is identified by its position).
  const [images, setImages] = useState<ImageData[]>([]);
  // The pictures as the server has them, to know whether anything changed when saving.
  const loadedPictures = useRef<{ id: number; index: number }[]>([]);
  // Row being dragged to a new place with its handle, and how far it has moved (null = no drag).
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  // Height of every row, to work out which row the dragged one is over.
  const rowHeights = useRef<number[]>([]);
  const rowInputs = useRef<Record<number, TextInput | null>>({});
  // Row that should receive the cursor once the list has been redrawn after an insert.
  const rowToFocus = useRef<number | null>(null);
  // Row currently shown in the picture viewer (null = viewer closed).
  const [viewerRow, setViewerRow] = useState<number | null>(null);
  const viewerRowRef = useRef<number | null>(null);
  const itemCountRef = useRef(0);
  // Swiping left or right in the viewer moves to the next or previous row (no wrap-around).
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_event, gesture) => {
        const row = viewerRowRef.current;
        if (row === null) return;
        if (gesture.dx < -50 && row < itemCountRef.current - 1) setViewerRow(row + 1);
        else if (gesture.dx > 50 && row > 0) setViewerRow(row - 1);
      },
    })
  ).current;
  const [recommendations, setRecommendations] = useState<string[]>([]);
  // Positions (in `recommendations`) of the ideas the user ticked to add to the list.
  const [selectedIdeas, setSelectedIdeas] = useState<number[]>([]);
  // Set while the box asks the user to confirm before "New ideas" replaces the set: 'ticked' when
  // some ideas are ticked (they would be added to the list first), 'none' when nothing is ticked
  // (a one-time explanation that the ideas shown will be gone). 'close' is set when the X is
  // pressed while ideas are ticked, because closing would discard them.
  const [confirmNewIdeas, setConfirmNewIdeas] = useState<'ticked' | 'none' | 'close' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Editing an existing list starts view-only; the real permission is confirmed with the server
  // before any editing control is shown. Creating a new list always has full access.
  const [permissionType, setPermissionType] = useState<string>(listItem ? 'read_only' : 'full_access');
  const [permissionReady, setPermissionReady] = useState<boolean>(!listItem);
  const canEdit = permissionType === 'full_access';
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ideas' | 'empty' | 'nothing' | 'error'>('loading');
  const SERVER = API_URL;
  viewerRowRef.current = viewerRow;
  itemCountRef.current = items.length;


  useFocusEffect(
    useCallback(() => {
      setTitle(listItem?.title || '');
      setItems(listItem?.items.split("|") || ['']);
      setViewerRow(null)
      getImages()
      fetchPermissionType();
    }, [listItem])
  );

  const fetchPermissionType = async () => {
    if (!listItem?.id) {
      // A list that is being created: the person creating it can edit everything.
      setPermissionType('full_access');
      setPermissionReady(true);
      return;
    }
    const storedUserId = await AsyncStorage.getItem('userId');
    const token = await AsyncStorage.getItem('token');
    if (!storedUserId) {
      setPermissionType('read_only');
      setPermissionReady(true);
      setError('Missing user_id');
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
      // Could not confirm what this person may do, so keep the list view-only.
      setPermissionType('read_only');
      Toast.show({
        type: 'error',
        text1: "Couldn't check your access",
        text2: `${describeError(err)} You can view this list for now.`,
      });
    } finally {
      setLoading(false);
      setPermissionReady(true);
    }
  };

  // `askForMore` is true when the user asks for a fresh set of ideas: the ideas already shown
  // are sent along so the AI does not repeat them. `currentItems` is the list the ideas are based
  // on (the caller passes the updated list when it has just added ideas to it).
  const fetchRecommendations = async (askForMore: boolean = false, currentItems: string[] = items) => {
    setIsAIModalVisible(true);
    setConfirmNewIdeas(null);
    // The ideas are based on the items' text. With no text yet there is nothing to go on, so say
    // so in a friendly way instead of asking the AI (which would only report an error).
    if (!currentItems.some((row) => row.replace('✔️', '').trim() !== '')) {
      setAiStatus('nothing');
      return;
    }
    if (!listItem || !listItem.id) {
      console.error('Item ID is not available');
      setAiStatus('error');
      return;
    }

    setAiStatus('loading');
    setLoading(true);
    setSelectedIdeas([]);
    try {
      const suggestions = await getRecommendations(currentItems, askForMore ? recommendations : []);
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

  const getRecommendations = async (currentItems: string[], alreadySuggested: string[] = []): Promise<string[]> => {
    const response = await axios.post('/.netlify/functions/recommendations', {
      items: currentItems.filter((item) => item.trim() !== ''),
      exclude: alreadySuggested,
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
    if (!canEdit) return;
    setItems(prev => [...prev, '']);
  };

  const handleItemChange = (text: string, index: number) => {
    if (!canEdit) return;
    const newItems = [...items];
    const wasChecked = newItems[index].startsWith('✔️ ');
    newItems[index] = wasChecked ? `✔️ ${text}` : text;
    setItems(newItems);
  };

  // Inserting a row in the middle of the list. The rows below, and the pictures that belong to
  // them, move down by one together, so every picture stays with its own item. Nothing is saved
  // until Update List is pressed.
  const insertRowAt = (position: number) => {
    if (!canEdit) return;
    setItems((prev) => [...prev.slice(0, position), '', ...prev.slice(position)]);
    setImages((prev) =>
      prev.map((image) => (image.index >= position ? { ...image, index: image.index + 1 } : image))
    );
    rowToFocus.current = position;
  };

  // Puts the cursor in the row that was just inserted. A second try covers a long list where the
  // new row has not been drawn yet.
  useEffect(() => {
    const row = rowToFocus.current;
    if (row === null) return;
    rowToFocus.current = null;
    const focusRow = () => rowInputs.current[row]?.focus();
    if (rowInputs.current[row]) {
      focusRow();
    } else {
      setTimeout(focusRow, 120);
    }
  }, [items]);

  // Where the dragged row would land, from how far it has moved: the row whose area holds the
  // middle of the dragged row.
  const dropIndexFor = (from: number, dy: number, count: number): number => {
    const heights = Array.from({ length: count }, (_, row) => rowHeights.current[row] || 40);
    let top = 0;
    for (let row = 0; row < from; row += 1) top += heights[row];
    const middle = top + heights[from] / 2 + dy;
    let rowTop = 0;
    for (let row = 0; row < count; row += 1) {
      if (middle < rowTop + heights[row]) return row;
      rowTop += heights[row];
    }
    return count - 1;
  };

  // Moves a row to a new place. The rows in between shift by one, and every picture moves with
  // its own row, so each picture stays with the item it belongs to. Nothing is saved until
  // Update List is pressed.
  const moveRow = (from: number, to: number) => {
    if (!canEdit || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setImages((prev) =>
      prev.map((image) => {
        if (image.index === from) return { ...image, index: to };
        if (from < to && image.index > from && image.index <= to) return { ...image, index: image.index - 1 };
        if (to < from && image.index >= to && image.index < from) return { ...image, index: image.index + 1 };
        return image;
      })
    );
  };

  const handleToggleIdea = (position: number) => {
    setSelectedIdeas((prev) =>
      prev.includes(position) ? prev.filter((i) => i !== position) : [...prev, position]
    );
  };

  // Adds the ticked ideas to the bottom of the list, one row each. If the last row is empty and
  // has no picture it is the row waiting for the next item, so the first idea fills it and the
  // rest go below. Nothing is saved until Update List is pressed. Returns the updated list, or
  // null when nothing was added.
  const addSelectedIdeasToList = (): string[] | null => {
    if (!canEdit) return null;
    const chosen = recommendations
      .filter((_, position) => selectedIdeas.includes(position))
      .map((idea) => idea.trim())
      .filter((idea) => idea !== '');
    if (chosen.length === 0) return null;

    const next = [...items];
    const last = next.length - 1;
    const lastRowIsFree =
      last >= 0 &&
      next[last].replace('✔️', '').trim() === '' &&
      !images.some((image) => image.index === last);
    let rest = chosen;
    if (lastRowIsFree) {
      next[last] = chosen[0];
      rest = chosen.slice(1);
    }
    const updated = [...next, ...rest];
    setItems(updated);
    setSelectedIdeas([]);
    Toast.show({
      type: 'success',
      text1: chosen.length === 1 ? 'Added 1 item' : `Added ${chosen.length} items`,
      text2: 'Press Update List to save them.',
    });
    return updated;
  };

  // "Add" closes the box once the ideas are in the list.
  const handleAddSelectedIdeas = () => {
    if (addSelectedIdeasToList()) {
      setIsAIModalVisible(false);
    }
  };

  // "New ideas" replaces the set. If some ideas are ticked, always ask first, because they would be
  // lost. With nothing ticked, explain once (the first time on this device) that the ideas shown
  // will be replaced, then never again, so asking for fresh ideas stays quick.
  const handleNewIdeas = async () => {
    if (selectedIdeas.length > 0) {
      setConfirmNewIdeas('ticked');
      return;
    }
    let alreadyExplained = true;
    try {
      alreadyExplained = (await AsyncStorage.getItem(NEW_IDEAS_NOTICE_KEY)) === 'seen';
    } catch {
      // If the device storage cannot be read, skip the explanation rather than show it every time.
    }
    if (alreadyExplained) {
      fetchRecommendations(true);
      return;
    }
    try {
      await AsyncStorage.setItem(NEW_IDEAS_NOTICE_KEY, 'seen');
    } catch {
      // Not remembering is harmless: the explanation may simply show once more.
    }
    setConfirmNewIdeas('none');
  };

  // The X closes the box. If ideas are ticked, ask first, because closing discards them.
  const handleCloseIdeasBox = () => {
    if (selectedIdeas.length > 0) {
      setConfirmNewIdeas('close');
    } else {
      setIsAIModalVisible(false);
    }
  };

  // "Discard" on that question: close the box without adding anything to the list.
  const handleDiscardAndClose = () => {
    setConfirmNewIdeas(null);
    setSelectedIdeas([]);
    setIsAIModalVisible(false);
  };

  // OK on either question. With ticked ideas they go into the list first (the box stays open);
  // either way a fresh set is shown.
  const handleConfirmNewIdeas = () => {
    const updated = addSelectedIdeasToList();
    fetchRecommendations(true, updated ?? items);
  };

  const handleToggleItem = (index: number) => {
    if (!canEdit) return;
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
    if (!canEdit) return;
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

  const handleRemoveItem = (index: number) => {
    if (!canEdit) return;
    setItems((prev) => prev.filter((_, row) => row !== index));
    // The row's own picture goes with it, and the pictures of the rows below move up with
    // their rows, so every picture stays with the item it belongs to.
    setImages((prev) =>
      prev
        .filter((image) => image.index !== index)
        .map((image) => (image.index > index ? { ...image, index: image.index - 1 } : image))
    );
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
          loadedPictures.current = formattedImages.map((image: ImageData) => ({ id: image.id as number, index: image.index }));
        } else {
          console.error("Invalid response format:", response.data);
          setImages([]);
          loadedPictures.current = [];
        }
      } else {
        setImages([]);
        loadedPictures.current = [];
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
      loadedPictures.current = [];
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
        // The list text is saved; the picture changes were not (and nothing about the pictures
        // changed on the server). Stay here with the pictures still in place so the user can
        // press Update List again, which is safe to repeat.
        Toast.show({
          type: 'error',
          text1: "Your list was updated, but the pictures weren't",
          text2: `${imageProblem} Your pictures are still here.`,
        });
        return;
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

  // Lets the user pick a picture for a row, shrinks it, and puts it on that row (replacing the
  // row's current picture, if any). Nothing is saved until Update List is pressed.
  const choosePictureForRow = async (index: number) => {
    if (!canEdit) return;
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
        isNew: true,
      };

      setImages((prev) => [...prev.filter((image) => image.index !== index), newImage]);
    }
  };

  // Explains, in one short sentence, why a picture could not be saved.
  const describeImageError = (error: unknown): string => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      const serverMessage = typeof data?.error === 'string' ? data.error : null;
      // The server explains picture problems in plain words; show them as they are.
      if ((status === 400 || status === 413) && serverMessage) return serverMessage;
      if (status === 413) return 'That picture is too large. Choose a smaller one.';
      if (status === 400) return "That picture couldn't be read. Try a different one.";
    }
    return describeError(error);
  };

  // Saves all the picture changes of a list in ONE request that the server applies completely
  // or not at all. Returns null when everything was saved (or nothing changed), or a short
  // message explaining what went wrong, so the caller can tell the user instead of claiming
  // success. Because it is all-or-nothing, trying again is always safe.
  const handleSaveImages = async (listItemId: number): Promise<string | null> => {
    const kept = images
      .filter((image) => !image.isNew && image.id)
      .map((image) => ({ id: image.id as number, index: image.index }));
    const added = images.filter((image) => image.isNew);
    const loaded = loadedPictures.current;
    const nothingChanged =
      added.length === 0 &&
      kept.length === loaded.length &&
      kept.every((k) => loaded.some((l) => l.id === k.id && l.index === k.index));
    if (nothingChanged) {
      return null;
    }

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      return 'Your session expired. Please log in again.';
    }

    const formData = new FormData();
    formData.append('list_item_id', listItemId.toString());
    formData.append('keep', JSON.stringify(kept));
    for (const image of added) {
      formData.append('images', JSON.stringify({
        uri: image.uri.split(',')[1],
        fileName: image.fileName,
        mimeType: image.mimeType,
        index: image.index
      }));
    }
    try {
      await axios.post(`${SERVER}/listitemimages/sync_images/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return null;
    } catch (error) {
      console.error('Error saving pictures', error);
      return describeImageError(error);
    }
  };

  const closeViewer = () => setViewerRow(null);
  const viewerOpen = viewerRow !== null && viewerRow < items.length;
  const viewerPicture = viewerOpen ? images.find((image) => image.index === viewerRow) : undefined;
  const viewerRowText = viewerOpen ? items[viewerRow as number].replace('✔️', '').trim() : '';
  const viewerTitle = viewerRowText || `Item ${(viewerRow ?? 0) + 1}`;
  // A list with no text and no pictures has nothing to show a view-only member.
  const listIsEmpty = countItems(items.join('|'), images.map((image) => image.index)).total === 0;

  // While the permission is being confirmed, show the loading dots (not the editing controls).
  if (!permissionReady) {
    return (
      <View style={{ flex: 1 }}>
        <AppBackground />
        <View style={styles.permissionLoading}>
          <AuroraDotsLoader />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBackground />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.container, isNarrow && styles.containerNarrow]}>
          <View style={styles.titleBlock}>
            {canEdit ? (
              <TextInput
                style={[styles.titleInput, { outline: 'none' }]}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.placeholder}
                placeholder="Edit Title" />
            ) : (
              <Text style={styles.titleInput}>{title}</Text>
            )}
            <View style={styles.titleRule} />
          </View>

          <GlassCard style={styles.itemsCard} contentStyle={styles.itemsCardContent}>
            {!canEdit && listIsEmpty ? (
              <Text style={styles.emptyViewNote}>No items yet</Text>
            ) : (
            <FlatList
              data={items}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const filterImage = images && images.filter((img) => img.index === index)
                const isChecked = item.includes('✔️');
                // While a row is dragged: it follows the pointer, and the rows between its old and new
                // place slide out of the way by one row height.
                const dropTo = drag ? dropIndexFor(drag.from, drag.dy, items.length) : null;
                const dragHeight = drag ? rowHeights.current[drag.from] || 40 : 0;
                let slide = 0;
                if (drag && dropTo !== null && index !== drag.from) {
                  if (drag.from < dropTo && index > drag.from && index <= dropTo) slide = -dragHeight;
                  if (dropTo < drag.from && index >= dropTo && index < drag.from) slide = dragHeight;
                }
                const isDragged = drag !== null && drag.from === index;
                const dragStyle = drag
                  ? ([
                      isDragged ? styles.rowLifted : null,
                      { transform: [{ translateY: isDragged ? drag.dy : slide }], userSelect: 'none' },
                      !isDragged ? { transitionProperty: 'transform', transitionDuration: '120ms' } : null,
                    ] as any)
                  : undefined;
                return (
                  <View
                    style={dragStyle}
                    onLayout={(event) => { rowHeights.current[index] = event.nativeEvent.layout.height; }}
                  >
                  <View style={styles.item}>
                    {canEdit && (
                      <RowDragHandle
                        onStart={() => setDrag({ from: index, dy: 0 })}
                        onMove={(dy) => setDrag({ from: index, dy })}
                        onEnd={(dy, cancelled) => {
                          if (!cancelled) moveRow(index, dropIndexFor(index, dy, items.length));
                          setDrag(null);
                        }}
                      />
                    )}
                    <TouchableOpacity onPress={() => handleToggleItem(index)} disabled={!canEdit} style={{ marginRight: 10 }}>
                      <FontAwesome
                        name={isChecked ? "check-square-o" : "square-o"}
                        size={22}
                        color={isChecked ? colors.primary : colors.placeholder}
                      />
                    </TouchableOpacity>

                    {filterImage.length > 0 ? (
                      <TouchableOpacity
                        key={filterImage[0].id}
                        onPress={() => setViewerRow(index)}
                        style={{ marginRight: 10 }}
                      >
                        <Image
                          source={{ uri: filterImage[0].uri }}
                          style={{ width: 25, height: 25, borderRadius: 6 }}
                          onError={() => console.error("Failed to load image")}
                        />
                      </TouchableOpacity>
                    ) : canEdit ? (
                      <TouchableOpacity onPress={() => choosePictureForRow(index)} style={{ marginRight: 10 }}>
                        <FontAwesome name="image" size={22} color={colors.primaryLight} />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ marginRight: 10, opacity: 0.35 }}>
                        <FontAwesome name="image" size={22} color={colors.primaryLight} />
                      </View>
                    )}
                    {canEdit ? (
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
                        ref={(input) => { rowInputs.current[index] = input; }}
                        blurOnSubmit={false}
                        onSubmitEditing={() => insertRowAt(index + 1)}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.textArea,
                          { textDecorationLine: isChecked ? 'line-through' : 'none' },
                        ]}
                      >
                        {isChecked ? item.replace('✔️ ', '') : item}
                      </Text>
                    )}
                    {canEdit && (
                      <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{ marginLeft: 10 }}>
                        <Feather name="trash-2" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  </View>
                )
              }}
              keyExtractor={(_, index) => index.toString()} />
            )}
          </GlassCard>

          <View style={styles.iconRowContainer}>
            {isUpdateMode && canEdit && (
              <TouchableOpacity style={styles.iconContainer} onPress={() => fetchRecommendations()}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>💡</Text>
                </View>
                <Text style={styles.iconLabel}>AI</Text>
              </TouchableOpacity>
            )}
            {isAIModalVisible && (
              <View style={[styles.shareOverlay, overlayRoom]}>
                <GlassCard style={styles.shareCard} contentStyle={styles.shareCardContent} tint={colors.glassBgStrong}>
                  <TouchableOpacity style={styles.shareCloseButton} onPress={handleCloseIdeasBox}>
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
                      <ScrollView style={[styles.aiIdeasScroll, { maxHeight: Math.max(80, Math.min(260, windowHeight - 295)) }]}>
                        {recommendations.map((idea, index) => {
                          const isSelected = selectedIdeas.includes(index);
                          return (
                            <TouchableOpacity
                              key={index}
                              activeOpacity={0.7}
                              disabled={confirmNewIdeas !== null}
                              onPress={() => handleToggleIdea(index)}
                              style={[styles.aiIdeaRow, isSelected && styles.aiIdeaRowSelected]}
                            >
                              <FontAwesome
                                name={isSelected ? 'check-square-o' : 'square-o'}
                                size={22}
                                color={isSelected ? colors.primary : colors.placeholder}
                              />
                              <Text style={styles.aiIdeaText}>{idea}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {confirmNewIdeas === 'close' ? (
                        <View style={styles.aiConfirmBox}>
                          <Text style={styles.aiConfirmTitle}>
                            {selectedIdeas.length === 1 ? 'Discard 1 ticked idea?' : `Discard ${selectedIdeas.length} ticked ideas?`}
                          </Text>
                          <Text style={styles.aiConfirmText}>
                            {selectedIdeas.length === 1
                              ? "It hasn't been added to your list."
                              : "They haven't been added to your list."}
                          </Text>
                          <View style={styles.aiConfirmButtons}>
                            <TouchableOpacity style={[styles.aiConfirmButton, styles.aiConfirmDiscard]} onPress={handleDiscardAndClose}>
                              <Text style={styles.aiConfirmDiscardText}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.aiConfirmOkTouch} onPress={() => setConfirmNewIdeas(null)}>
                              <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.aiConfirmButton}
                              >
                                <Text style={styles.aiConfirmOkText}>Keep editing</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : confirmNewIdeas ? (
                        <View style={styles.aiConfirmBox}>
                          <Text style={styles.aiConfirmText}>
                            {confirmNewIdeas === 'none'
                              ? "You haven't ticked any ideas. These ideas will be replaced and you won't see them again. Continue?"
                              : selectedIdeas.length === 1
                                ? "You've ticked 1 idea. It will be added to your list, and then you'll get a fresh set. Continue?"
                                : `You've ticked ${selectedIdeas.length} ideas. They will be added to your list, and then you'll get a fresh set. Continue?`}
                          </Text>
                          <View style={styles.aiConfirmButtons}>
                            <TouchableOpacity style={[styles.aiConfirmButton, styles.aiConfirmCancel]} onPress={() => setConfirmNewIdeas(null)}>
                              <Text style={styles.aiConfirmCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.aiConfirmOkTouch} onPress={handleConfirmNewIdeas}>
                              <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.aiConfirmButton}
                              >
                                <Text style={styles.aiConfirmOkText}>OK</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.aiIdeasFooter}>
                          <TouchableOpacity style={styles.aiNewIdeas} onPress={handleNewIdeas}>
                            <Ionicons name="refresh" size={14} color={colors.primary} />
                            <Text style={styles.aiFooterText}>New ideas</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.aiAddTouch}
                            activeOpacity={0.85}
                            disabled={selectedIdeas.length === 0}
                            onPress={handleAddSelectedIdeas}
                          >
                            <LinearGradient
                              colors={selectedIdeas.length === 0 ? ['#C9C4E8', '#B9B2DE'] : [colors.primary, colors.primaryLight]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.aiAddButton}
                            >
                              <Text style={styles.aiAddText}>
                                {selectedIdeas.length === 0 ? 'Select ideas to add' : `Add ${selectedIdeas.length} to list`}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
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
                  {aiStatus === 'nothing' && (
                    <View style={styles.aiStateBox}>
                      <View style={[styles.aiStateIcon, styles.aiStateIconSoft]}>
                        <Text style={styles.aiStateEmoji}>💡</Text>
                      </View>
                      <Text style={styles.aiStateTitle}>Nothing to go on yet</Text>
                      <Text style={styles.aiStateText}>Add a few items to your list, then ask for ideas.</Text>
                    </View>
                  )}
                  {aiStatus === 'error' && (
                    <View style={styles.aiStateBox}>
                      <View style={[styles.aiStateIcon, styles.aiStateIconError]}>
                        <Text style={styles.aiStateExclaim}>!</Text>
                      </View>
                      <Text style={styles.aiStateTitle}>Couldn't load ideas</Text>
                      <Text style={styles.aiStateText}>Something went wrong. Please try again in a little while.</Text>
                      <TouchableOpacity style={styles.aiTryAgain} onPress={() => fetchRecommendations()}>
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
              <View style={[styles.shareOverlay, overlayRoom]}>
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
            {isUpdateMode && canEdit && (
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
            {viewerOpen && (
              <View style={[styles.viewerOverlay, overlayRoom]}>
                <GlassCard style={styles.viewerCard} contentStyle={styles.viewerCardContent} tint={colors.glassBgStrong}>
                  <TouchableOpacity style={styles.shareCloseButton} onPress={closeViewer} accessibilityLabel="Close picture viewer">
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.shareTitle} numberOfLines={1}>{viewerTitle}</Text>
                  <View style={styles.shareTitleRule} />
                  <Text style={styles.viewerPosition}>{(viewerRow as number) + 1} of {items.length}</Text>
                  <View style={[styles.viewerFrame, { maxHeight: Math.max(96, windowHeight - 310) }]} {...swipeResponder.panHandlers}>
                    {viewerPicture ? (
                      <Image
                        source={{ uri: viewerPicture.uri }}
                        style={styles.viewerImage}
                        onError={() => console.error('Failed to load picture')}
                      />
                    ) : (
                      <View style={styles.viewerEmpty}>
                        <FontAwesome name="image" size={34} color="#B8B2DC" />
                        <Text style={styles.viewerEmptyTitle}>{canEdit ? 'No picture yet' : 'No picture'}</Text>
                        {canEdit && <Text style={styles.viewerEmptyText}>Add one to see it here</Text>}
                      </View>
                    )}
                    {(viewerRow as number) > 0 && (
                      <TouchableOpacity
                        style={[styles.viewerArrow, { left: 8 }]}
                        onPress={() => setViewerRow((viewerRow as number) - 1)}
                        accessibilityLabel="Previous item"
                      >
                        <Ionicons name="chevron-back" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                    {(viewerRow as number) < items.length - 1 && (
                      <TouchableOpacity
                        style={[styles.viewerArrow, { right: 8 }]}
                        onPress={() => setViewerRow((viewerRow as number) + 1)}
                        accessibilityLabel="Next item"
                      >
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {items.length <= 9 && (
                    <View style={styles.viewerDots}>
                      {items.map((_, row) => (
                        <View key={row} style={[styles.viewerDot, row === viewerRow && styles.viewerDotActive]} />
                      ))}
                    </View>
                  )}
                  {canEdit && (
                    <View style={styles.viewerButtons}>
                      <TouchableOpacity
                        style={styles.viewerPrimaryTouch}
                        onPress={() => choosePictureForRow(viewerRow as number)}
                        accessibilityLabel={viewerPicture ? 'Replace image' : 'Add image'}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.viewerPrimaryButton}
                        >
                          <Ionicons name={viewerPicture ? 'camera-outline' : 'add'} size={18} color="#fff" />
                          <Text style={styles.viewerPrimaryText}>{viewerPicture ? 'Replace image' : 'Add image'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      {viewerPicture && (
                        <TouchableOpacity
                          style={styles.viewerRemoveButton}
                          onPress={() => setImages((prev) => prev.filter((image) => image.index !== viewerRow))}
                          accessibilityLabel="Remove image"
                        >
                          <Ionicons name="trash-outline" size={17} color={colors.danger} />
                          <Text style={styles.viewerRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </GlassCard>
              </View>
            )}
            {isDeleteConfirmVisible && (
              <View style={[styles.shareOverlay, overlayRoom]}>
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
  // flexGrow (not flex: 1) so the bottom padding counts as scrollable space: with flex: 1 the last
  // buttons of a long list ended up hidden under the tab bar. On wide screens the content is a
  // centered column instead of stretching across the whole window.
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 20,
    paddingTop: 52,
    paddingBottom: 110,
  },
  // On narrow screens the AI / Share / Check All / Delete icons sit above the title instead of
  // overlapping it.
  containerNarrow: {
    paddingTop: 84,
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
    alignItems: 'center',
    overflow: 'auto' as any,
    zIndex: 1,
    backgroundColor: 'rgba(38,34,59,0.35)',
  },
  shareCard: {
    width: '88%',
    maxWidth: 380,
    borderRadius: radii.xl,
    marginVertical: 'auto' as any,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  aiIdeaRowSelected: {
    backgroundColor: 'rgba(106,91,214,0.10)',
  },
  aiIdeaText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  aiIdeasFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  // Both footer buttons are 42 high with 13 text, like Replace image and Remove in the viewer.
  aiNewIdeas: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(106,91,214,0.07)',
  },
  aiFooterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  aiAddTouch: {
    flex: 1,
  },
  aiAddButton: {
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAddText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  aiConfirmBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#EFC98A',
    backgroundColor: '#FAEEDA',
  },
  aiConfirmText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#633806',
    marginBottom: 10,
  },
  aiConfirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aiConfirmOkTouch: {
    flex: 1,
  },
  aiConfirmButton: {
    flex: 1,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiConfirmCancel: {
    borderWidth: 1.5,
    borderColor: 'rgba(106,91,214,0.45)',
    backgroundColor: '#fff',
  },
  aiConfirmCancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  aiConfirmTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#633806',
    marginBottom: 2,
  },
  aiConfirmDiscard: {
    borderWidth: 1.5,
    borderColor: 'rgba(226,83,107,0.5)',
    backgroundColor: '#fff',
  },
  aiConfirmDiscardText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.danger,
  },
  aiConfirmOkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
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
  dragHandle: {
    width: 20,
    height: 30,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dragHandleRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dragHandleDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#B3AEC9',
  },
  rowLifted: {
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radii.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  emptyViewNote: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 18,
  },
  permissionLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    overflow: 'auto' as any,
    zIndex: 2,
    backgroundColor: 'rgba(38,34,59,0.78)',
  },
  viewerCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: radii.xl,
    marginVertical: 'auto' as any,
  },
  viewerCardContent: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 20,
  },
  viewerPosition: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  viewerFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(106,91,214,0.10)',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  viewerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(106,91,214,0.4)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  viewerEmptyTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
  viewerEmptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  viewerArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(38,34,59,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  viewerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9C4E6',
  },
  viewerDotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  viewerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  viewerPrimaryTouch: {
    flex: 1,
  },
  viewerPrimaryButton: {
    height: 42,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  viewerPrimaryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  viewerRemoveButton: {
    height: 42,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(226,83,107,0.5)',
    backgroundColor: '#fff',
  },
  viewerRemoveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.danger,
  },
});

export default ListItemDetails;
