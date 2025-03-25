import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, Platform, Modal } from 'react-native';
import { Button, Surface, TouchableRipple } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { CustomText as Text } from './components/CustomText';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { useTheme } from './src/ThemeContext';
import type { TabParamList, MyTribeStackParamList } from './types/navigation';
import { FREQUENCY_OPTIONS } from './types/frequency';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';
import { DeviceEventEmitter } from 'react-native';

type Contact = {
  id: number;
  name: string;
  frequency: string;
  lastContacted?: string;
  nextReminder?: string;
  history?: { action: string; notes?: string }[];
  paused: boolean;
};

type StoredNotification = {
  id: number;
  name: string;
  date: string;
  frequency: string;
  lastContacted: string | null;
  actioned: boolean;
  paused: boolean;
};

type Props = CompositeScreenProps<
  StackScreenProps<MyTribeStackParamList, 'MyTribeMain'>,
  BottomTabScreenProps<TabParamList>
>;

const MyTribeScreen = ({ navigation }: Props): JSX.Element => {
  const { currentTheme } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(0);
  const contactsPerPage = 5;
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContacts();
    });

    return unsubscribe;
  }, [navigation]);

  const loadContacts = async () => {
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      if (contactsJson) {
        let contacts = JSON.parse(contactsJson);
        
        // Migrate old frequency values to new format
        const migratedContacts = contacts.map((contact: Contact) => {
          if (['0', '1', '2', '3', '4'].includes(contact.frequency)) {
            return {
              ...contact,
              frequency: `r${contact.frequency}` // Convert '0' to 'r0', '1' to 'r1', etc.
            };
          }
          return contact;
        });

        // Save migrated contacts if any changes were made
        if (JSON.stringify(contacts) !== JSON.stringify(migratedContacts)) {
          await AsyncStorage.setItem('contacts', JSON.stringify(migratedContacts));
          contacts = migratedContacts;
        }

        const sortedContacts = contacts.sort((a: Contact, b: Contact) => b.id - a.id);
        setContacts(sortedContacts);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const deleteContact = (contactId: number) => {
    setContactToDelete(contactId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      if (!contactsJson) return;
      
      const contacts = JSON.parse(contactsJson);
      
      const contactToRemove = contacts.find((c: Contact) => c.id === contactToDelete);
      if (!contactToRemove) return;
      
      const updatedContacts = contacts.filter((c: Contact) => c.id !== contactToDelete);
      
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
      
      const notificationsJson = await AsyncStorage.getItem('notifications');
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson);
        const updatedNotifications = notifications.filter(
          (n: StoredNotification) => n.name !== contactToRemove.name
        );
        await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      }
      
      PushNotification.cancelLocalNotification(String(contactToDelete));
      
      setContacts(updatedContacts);
      
      DeviceEventEmitter.emit('refreshNotifications');
      
      setDeleteModalVisible(false);
      setContactToDelete(null);
      
      Alert.alert(
        'Contact Removed',
        `${contactToRemove.name} has been removed from your tribe`
      );
    } catch (error) {
      console.error('Error deleting contact:', error);
      Alert.alert(
        'Error',
        'Failed to remove contact'
      );
    }
  };

  const handleAddContact = () => {
    if (contacts.length >= 10) {
      Alert.alert("You have reached the maximum of 10 contacts. You will need to remove a contact before adding more.");
    } else {
      navigation.navigate('AddContact');
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    // First try to find the frequency in FREQUENCY_OPTIONS
    const option = FREQUENCY_OPTIONS.find(opt => opt.id === frequency);
    if (option) {
      return option.label;
    }

    // Fallback for old format (numeric strings)
    switch (frequency) {
      case '0': return 'Every 5 minutes (Testing)';
      case '1': return '1-3 days';
      case '2': return '3-7 days';
      case '3': return '7-14 days';
      case '4': return '14-28 days';
      default: return 'Unknown';
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={[styles.surfaceWrapper, { backgroundColor: currentTheme.colors.surface }]}>
      <Surface style={[styles.contactItem, { backgroundColor: currentTheme.colors.background }]} elevation={1}>
        <TouchableRipple onPress={() => navigation.navigate('ContactDetail', { contact: item })}>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: currentTheme.colors.onSurface }]}>
              {item.name}
            </Text>
            <Text style={[styles.contactDetail, { color: currentTheme.colors.onSurface }]}>
              Next reminder: {item.paused 
                ? 'Paused'
                : (item.nextReminder && !isNaN(new Date(item.nextReminder).getTime())
                  ? format(new Date(item.nextReminder), 'PPp')
                  : 'N/A')}
            </Text>
            <Text style={[styles.contactDetail, { color: currentTheme.colors.onSurface }]}>
              Last contacted: {item.lastContacted && !isNaN(new Date(item.lastContacted).getTime())
                ? format(new Date(item.lastContacted), 'PPp')
                : 'Never'}
            </Text>
          </View>
        </TouchableRipple>
      </Surface>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    flatList: {
      padding: 16,
      paddingBottom: 2,
    },
    bottomContainer: {
      padding: 5,
      marginTop: 8,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    addButton: {
      marginTop: 8,
      marginBottom: 16,
    },
    surfaceWrapper: {
      marginVertical: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
    contactItem: {
      borderRadius: 8,
    },
    contactInfo: {
      padding: 16,
    },
    removeButton: {
      backgroundColor: 'red',
      padding: 5,
      borderRadius: 5,
      marginLeft: 10,
    },
    contactName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    contactDetail: {
      marginBottom: 4,
    },
    contactContent: {
      padding: 16,
    },
    contactDetails: {
      marginBottom: 4,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 10,
      width: '80%',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    modalText: {
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    modalButton: {
      padding: 10,
    },
  });

  const resetBadgeCount = async () => {
    try {
      const notificationsJson = await AsyncStorage.getItem('notifications');
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
      
      console.log(`🔢 Badge count - Total notifications: ${notifications.length}`);
      
      // Count unactioned notifications whose date has passed
      const now = new Date();
      const dueNotifications = notifications.filter((n: StoredNotification) => {
        const isDue = new Date(n.date) <= now;
        const isUnactioned = n.actioned === false;
        console.log(`🔢 Badge count - Notification ${n.id} (${n.name}): isDue=${isDue}, isUnactioned=${isUnactioned}`);
        return isUnactioned && isDue;
      });
      
      console.log(`🔢 Badge count - Due and unactioned: ${dueNotifications.length}`);
      dueNotifications.forEach((n: StoredNotification, i: number) => {
        console.log(`🔢 Badge count - #${i+1}: ${n.name} (ID: ${n.id})`);
      });
      
      const badgeCount = dueNotifications.length;
      console.log(`🔢 Resetting badge count to ${badgeCount}`);
      
      if (Platform.OS === 'ios') {
        PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
      }
      PushNotification.setApplicationIconBadgeNumber(badgeCount);
    } catch (error) {
      console.error('Error resetting badge count:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      <View style={styles.listContainer}>
        <FlatList
          data={contacts.slice(page * contactsPerPage, (page + 1) * contactsPerPage)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderContact}
          contentContainerStyle={styles.flatList}
          ListFooterComponent={() => (
            <View style={styles.bottomContainer}>
              <View style={styles.navigation}>
                <Button 
                  mode="contained"
                  buttonColor={currentTheme.colors.primary}
                  textColor={currentTheme.colors.onPrimary}
                  onPress={() => setPage(Math.max(0, page - 1))} 
                  disabled={page === 0}
                >
                  Prev
                </Button>
                <Button 
                  mode="contained"
                  buttonColor={currentTheme.colors.primary}
                  textColor={currentTheme.colors.onPrimary}
                  onPress={() => setPage(page + 1)} 
                  disabled={contacts.length <= (page + 1) * contactsPerPage}
                >
                  Next
                </Button>
              </View>
              <Button
                mode="contained"
                onPress={handleAddContact}
                style={styles.addButton}
              >
                New Member
              </Button>
            </View>
          )}
        />
      </View>
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.onSurface }]}>
              Remove Contact
            </Text>
            <Text style={[styles.modalText, { color: currentTheme.colors.onSurface }]}>
              Are you sure you want to remove this contact? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setDeleteModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmDelete}
                style={[styles.modalButton, { backgroundColor: currentTheme.colors.error }]}
              >
                Remove
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyTribeScreen; 