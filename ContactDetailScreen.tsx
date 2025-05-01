import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Button, Card, Title, Paragraph, Surface, TextInput, RadioButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from './src/ThemeContext';
import { format } from 'date-fns';
import { StackScreenProps } from '@react-navigation/stack';
import type { MyTribeStackParamList } from './types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateNextReminder, updateNotificationBadge, type StoredNotification, scheduleLocalNotification } from './notification';
import PushNotification from 'react-native-push-notification';
import { DeviceEventEmitter } from 'react-native';
const { Android: RadioButtonAndroid } = RadioButton;

type Contact = {
  id: number;
  name: string;
  frequency: string;
  lastContacted?: string;
  nextReminder?: string;
  paused?: boolean;
};

type ContactParams = {
  contact: Contact
}

type HistoryEntry = {
  date: string;
  action: string;
  notes?: string;
};

type FrequencyType = 'random' | 'weekday';

type FrequencyOption = {
  id: string;
  type: FrequencyType;
  label: string;
  weekday?: number; // 0-6 for Sunday-Saturday
};

type Notification = {
  name: string;
  // ... other notification properties
};

type Props = StackScreenProps<MyTribeStackParamList, 'ContactDetail'>;

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: 'r0', type: 'random', label: 'Every 5 minutes (Testing)' },
  { id: 'r1', type: 'random', label: '1-3 days' },
  { id: 'r2', type: 'random', label: '3-7 days' },
  { id: 'r3', type: 'random', label: '7-14 days' },
  { id: 'r4', type: 'random', label: '14-28 days' },
];

const RANDOM_FREQUENCIES = [
  { id: 'r0', label: 'Every 5 minutes (Testing)' },
  { id: 'r1', label: '1-3 days' },
  { id: 'r2', label: '3-7 days' },
  { id: 'r3', label: '7-14 days' },
  { id: 'r4', label: '14-28 days' },
];

const WEEKDAYS = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
];

const calculateResponseRate = (history: HistoryEntry[]): string => {
  if (history.length === 0) return '0';
  
  const contacted = history.filter(entry => entry.action === 'Contacted').length;
  const rate = (contacted / history.length) * 100;
  return rate.toFixed(0);
};

const ContactDetailScreen = ({ route, navigation }: Props): JSX.Element => {
  const { currentTheme } = useTheme();
  const { contact } = route.params;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFrequency, setEditedFrequency] = useState(contact.frequency);
  const [editedName, setEditedName] = useState(contact.name);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [frequencyType, setFrequencyType] = useState<'random' | 'weekday'>('random');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [interval, setInterval] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly');
  const [randomFrequency, setRandomFrequency] = useState(contact.frequency);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isPaused, setIsPaused] = useState(contact.paused || false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
        if (historyJson) {
          const loadedHistory = JSON.parse(historyJson);
          setHistory(loadedHistory);
        }
      } catch (e) {
        console.error('Error loading history:', e);
      }
    };

    loadHistory();
  }, [contact.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const loadHistory = async () => {
        try {
          const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
          if (historyJson) {
            const loadedHistory = JSON.parse(historyJson);
            setHistory(loadedHistory);
          }
        } catch (e) {
          console.error('Error loading history:', e);
        }
      };
      loadHistory();
    });

    return unsubscribe;
  }, [navigation, contact.id]);

  useEffect(() => {
    if (contact.frequency.startsWith('w')) {
      const [_, weekday, intervalType] = contact.frequency.match(/w(\d)_(\w+)/) || [];
      setFrequencyType('weekday');
      setSelectedDay(weekday);
      setInterval(intervalType as typeof interval);
    } else {
      setFrequencyType('random');
      setRandomFrequency(contact.frequency);
    }
  }, [contact.frequency]);

  useEffect(() => {
    if (isEditing) {
      const newFrequency = getFrequencyId();
      setEditedFrequency(newFrequency);
      console.log(`📝 Updated editedFrequency to: ${newFrequency}`);
    }
  }, [frequencyType, randomFrequency, selectedDay, interval, isEditing]);

  const handleDelete = async () => {
    try {
      // Get all contacts
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts = contactsJson ? JSON.parse(contactsJson) : [];
      
      // Filter out the contact to delete
      const updatedContacts = contacts.filter((c: Contact) => c.id !== contact.id);
      
      // Save updated contacts
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
      
      // Cancel any scheduled notifications for this contact
      PushNotification.cancelLocalNotification(String(contact.id));
      console.log(`Cancelled all scheduled notifications for contact ID: ${contact.id}`);
      
      // Remove contact history
      await AsyncStorage.removeItem(`history_${contact.id}`);
      
      // Remove any pending notifications for this contact
      const notificationsJson = await AsyncStorage.getItem('notifications');
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson);
        const updatedNotifications = notifications.filter(
          (n: any) => n.name !== contact.name
        );
        await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      }
      
      // Update badge count
      await updateNotificationBadge();
      
      // Hide the modal
      setShowDeleteModal(false);
      
      // Navigate back
      navigation.goBack();
      
      // Emit event to refresh contacts list
      DeviceEventEmitter.emit('refreshContacts');
    } catch (e) {
      console.error('Error deleting contact:', e);
      Alert.alert('Error', 'Failed to delete contact');
    }
  };

  const handleEdit = async () => {
    try {
      console.log(`🔄 Saving edited contact with frequency: ${editedFrequency}`);
      
      // Calculate next reminder based on the updated frequency
      const nextReminder = await calculateNextReminder(editedFrequency);
      
      // Get all contacts
      const contactsJson = await AsyncStorage.getItem('contacts');
      let contacts = contactsJson ? JSON.parse(contactsJson) : [];
      
      // Update the contact
      contacts = contacts.map((c: Contact) => {
        if (c.id === contact.id) {
          return {
            ...c,
            name: editedName,
            frequency: editedFrequency,
            nextReminder: nextReminder.toISOString()
          };
        }
        return c;
      });
      
      // Save updated contacts
      await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
      
      // Cancel any existing OS notifications for this contact
      PushNotification.cancelLocalNotification(String(contact.id));
      
      // Remove any pending notifications for this contact from AsyncStorage
      const notificationsJson = await AsyncStorage.getItem('notifications');
      if (notificationsJson) {
        const notifications = JSON.parse(notificationsJson);
        const updatedNotifications = notifications.filter(
          (n: any) => n.name !== contact.name
        );
        
        console.log(`🧹 Removed ${notifications.length - updatedNotifications.length} existing notifications for ${contact.name}`);
        
        // Save the filtered notifications
        await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      }
      
      // Schedule a new notification with the updated frequency
      const updatedContact = contacts.find((c: Contact) => c.id === contact.id);
      if (updatedContact) {
        await scheduleLocalNotification(updatedContact);
      }
      
      // Exit edit mode
      setIsEditing(false);
      
      // Refresh the screen with updated data
      navigation.setParams({ contact: {
        ...contact,
        name: editedName,
        frequency: editedFrequency,
        nextReminder: nextReminder.toISOString()
      }});
      
      console.log('✅ Contact updated successfully');
      
      // Update badge count
      await updateNotificationBadge();
    } catch (e) {
      console.error('Error updating contact:', e);
      Alert.alert('Error', 'Failed to update contact');
    }
  };

  const handleCancel = () => {
    setEditedName(contact.name);
    setEditedFrequency(contact.frequency);
    setIsEditing(false);
  };

  const getFrequencyId = () => {
    if (frequencyType === 'random') {
      return randomFrequency;
    }
    return selectedDay ? `w${selectedDay}_${interval}` : randomFrequency;
  };

  const handlePauseResume = async (shouldPause: boolean) => {
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      let contacts = contactsJson ? JSON.parse(contactsJson) : [];

      contacts = await Promise.all(contacts.map(async (c: Contact) => {
        if (c.id === contact.id) {
          const nextReminder = shouldPause ? null : (await calculateNextReminder(c.frequency)).toISOString();
          return {
            ...c,
            paused: shouldPause,
            nextReminder,
          };
        }
        return c;
      }));

      await AsyncStorage.setItem('contacts', JSON.stringify(contacts));

      // Update contact in route params
      route.params.contact.paused = shouldPause;
      route.params.contact.nextReminder = shouldPause ? null : (await calculateNextReminder(contact.frequency)).toISOString();

      // Add history entry
      const newEntry: HistoryEntry = {
        date: new Date().toISOString(),
        action: shouldPause ? 'Paused' : 'Resumed',
      };

      const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
      const currentHistory = historyJson ? JSON.parse(historyJson) : [];
      const updatedHistory = [newEntry, ...currentHistory];

      await AsyncStorage.setItem(`history_${contact.id}`, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      setIsPaused(shouldPause);
      setShowPauseModal(false);

      if (shouldPause) {
        // Cancel any scheduled OS notifications for this contact
        PushNotification.cancelLocalNotification(String(contact.id));
        console.log(`🔕 Cancelled all scheduled notifications for contact ID: ${contact.id}`);

        // Clear existing notifications for this contact from AsyncStorage
        const notificationsJson = await AsyncStorage.getItem('notifications');
        let notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
        
        // Remove both pending and scheduled notifications for this contact
        notifications = notifications.filter((n: StoredNotification) => 
          n.name && contact.name && n.name.trim() !== contact.name.trim()
        );
        
        await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
        console.log(`🧹 Removed all notifications for ${contact.name}`);
        
        // Update badge count
        await updateNotificationBadge();
        
        // Emit event to refresh notifications
        DeviceEventEmitter.emit('forceRefreshNotifications');
      }
    } catch (e) {
      console.error('Error updating contact pause state:', e);
      Alert.alert('Error', 'Failed to update contact');
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Surface 
        style={[styles.contactInfo, { backgroundColor: currentTheme.colors.surface }]}
        elevation={1}
      >
        {isEditing ? (
          <TextInput
            mode="outlined"
            value={editedName}
            onChangeText={setEditedName}
            style={styles.nameInput}
            outlineColor={currentTheme.colors.outline}
            activeOutlineColor={currentTheme.colors.primary}
            textColor={currentTheme.colors.onSurface}
          />
        ) : (
          <Text style={[styles.contactName, { color: currentTheme.colors.onSurface }]}>
            {contact.name}
          </Text>
        )}
        {isEditing ? (
          <>
            <RadioButton.Group onValueChange={value => {
              setFrequencyType(value as 'random' | 'weekday');
              setSelectedDay(null);
            }} value={frequencyType}>
              <TouchableOpacity 
                onPress={() => setFrequencyType('random')}
                style={styles.radioOption}
              >
                <RadioButtonAndroid
                  value="random"
                  status={frequencyType === 'random' ? 'checked' : 'unchecked'}
                  color={currentTheme.colors.primary}
                  uncheckedColor={currentTheme.colors.onSurface}
                />
                <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
                  Random intervals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setFrequencyType('weekday')}
                style={styles.radioOption}
              >
                <RadioButtonAndroid
                  value="weekday"
                  status={frequencyType === 'weekday' ? 'checked' : 'unchecked'}
                  color={currentTheme.colors.primary}
                  uncheckedColor={currentTheme.colors.onSurface}
                />
                <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
                  Specific day
                </Text>
              </TouchableOpacity>
            </RadioButton.Group>

            {frequencyType === 'random' ? (
              <Picker
                selectedValue={randomFrequency}
                onValueChange={setRandomFrequency}
                style={{ color: currentTheme.colors.onSurface }}
                dropdownIconColor={currentTheme.colors.onSurface}
              >
                {RANDOM_FREQUENCIES.map(freq => (
                  <Picker.Item 
                    key={freq.id} 
                    label={freq.label} 
                    value={freq.id}
                    color={currentTheme.colors.onSurface}
                  />
                ))}
              </Picker>
            ) : (
              <>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={setSelectedDay}
                  style={{ color: currentTheme.colors.onSurface }}
                  dropdownIconColor={currentTheme.colors.onSurface}
                >
                  <Picker.Item 
                    label="Select a day" 
                    value={null}
                    color={currentTheme.colors.onSurface}
                  />
                  {WEEKDAYS.map(day => (
                    <Picker.Item 
                      key={day.id} 
                      label={day.label} 
                      value={day.id}
                      color={currentTheme.colors.onSurface}
                    />
                  ))}
                </Picker>

                {selectedDay && (
                  <RadioButton.Group onValueChange={value => setInterval(value as typeof interval)} value={interval}>
                    <View style={styles.intervalOptions}>
                      {['weekly', 'fortnightly', 'monthly'].map((int) => (
                        <TouchableOpacity 
                          key={int} 
                          onPress={() => setInterval(int as typeof interval)}
                          style={styles.radioOption}
                        >
                          <RadioButtonAndroid
                            value={int}
                            status={interval === int ? 'checked' : 'unchecked'}
                            color={currentTheme.colors.primary}
                            uncheckedColor={currentTheme.colors.onSurface}
                          />
                          <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
                            {int.charAt(0).toUpperCase() + int.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </RadioButton.Group>
                )}
              </>
            )}
          </>
        ) : (
          <Text style={{ color: currentTheme.colors.onSurface }}>
            Frequency: {FREQUENCY_OPTIONS.find(opt => opt.id === contact.frequency)?.label}
          </Text>
        )}
        <Paragraph style={{ color: currentTheme.colors.onSurface }}>
          Last contacted: {contact.lastContacted && !isNaN(new Date(contact.lastContacted).getTime()) 
            ? format(new Date(contact.lastContacted), 'PPp') 
            : 'N/A'}
        </Paragraph>
        <Paragraph style={{ color: currentTheme.colors.onSurface }}>
          Next reminder: {contact.paused 
            ? 'Paused' 
            : (contact.nextReminder && !isNaN(new Date(contact.nextReminder).getTime())
              ? format(new Date(contact.nextReminder), 'PPp') 
              : 'N/A')}
        </Paragraph>
        {history.length > 0 && (
          <Paragraph style={{ color: currentTheme.colors.onSurface }}>
            Response rate: {calculateResponseRate(history)}%
          </Paragraph>
        )}
        <View style={styles.editButtons}>
          {isEditing ? (
            <>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={[styles.actionButton, styles.cancelButton]}
                textColor={currentTheme.colors.error}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleEdit}
                style={styles.actionButton}
                buttonColor={currentTheme.colors.primary}
                textColor={currentTheme.colors.onPrimary}
              >
                Save
              </Button>
            </>
          ) : (
            <Button
              mode="contained"
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
              buttonColor={currentTheme.colors.primary}
              textColor={currentTheme.colors.onPrimary}
            >
              Edit
            </Button>
          )}
          <Button
            mode="contained"
            onPress={() => isPaused ? handlePauseResume(false) : setShowPauseModal(true)}
            style={styles.actionButton}
            buttonColor={isPaused ? currentTheme.colors.success : currentTheme.colors.warning}
            textColor={currentTheme.colors.onPrimary}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </View>
      </Surface>

      <Surface 
        style={[styles.historySurface, { backgroundColor: currentTheme.colors.surface }]} 
        elevation={1}
      >
        <Title style={{ color: currentTheme.colors.onSurface }}>Contact History</Title>
        <Text style={[styles.historySubtitle, { color: currentTheme.colors.secondaryContainer }]}>
          Your previous five notifications
        </Text>
        {history.slice(0, 10).map((entry, index) => (
          <Surface 
            key={index}
            style={[styles.historyItem, { backgroundColor: currentTheme.colors.surface }]}
            elevation={1}
          >
            <Card.Content style={{ padding: 8 }}>
              <Paragraph style={{ color: currentTheme.colors.onSurface }}>
                {entry.date && !isNaN(new Date(entry.date).getTime())
                  ? format(new Date(entry.date), 'PPp')
                  : 'Invalid date'}
              </Paragraph>
              <Paragraph style={{ color: currentTheme.colors.onSurface }}>
                Action: {entry.action}
              </Paragraph>
              {entry.notes && (
                <Paragraph style={{ color: currentTheme.colors.onSurface, marginTop: 4 }}>
                  Notes: {entry.notes}
                </Paragraph>
              )}
            </Card.Content>
          </Surface>
        ))}
        {history.length === 0 && (
          <Paragraph style={styles.noHistory}>No history available</Paragraph>
        )}
      </Surface>

      <Button 
        mode="contained" 
        onPress={() => setShowDeleteModal(true)}
        style={styles.removeButton}
        buttonColor={currentTheme.colors.error}
      >
        Remove Contact
      </Button>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.onSurface }]}>
              Remove Contact
            </Text>
            <Text style={[styles.modalText, { color: currentTheme.colors.onSurface }]}>
              Are you sure you want to remove this contact? All saved data will be lost.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowDeleteModal(false)}
                textColor={currentTheme.colors.primary}
              >
                Close
              </Button>
              <Button
                mode="contained"
                onPress={handleDelete}
                buttonColor={currentTheme.colors.error}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPauseModal}
        transparent
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Surface style={[styles.modalContent, { backgroundColor: currentTheme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.onSurface }]}>
              Pause Notifications
            </Text>
            <Text style={[styles.modalText, { color: currentTheme.colors.onSurface }]}>
              No new notifications will be generated for this contact until resumed.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowPauseModal(false)}
                textColor={currentTheme.colors.error}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => handlePauseResume(true)}
                buttonColor={currentTheme.colors.warning}
                textColor={currentTheme.colors.onPrimary}
              >
                Confirm
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 90, // Increase bottom padding to ensure content is above tab bar
  },
  contactInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  historySurface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  historyItem: {
    marginTop: 8,
  },
  noHistory: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  removeButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    margin: 20,
    borderRadius: 8,
    padding: 24,
    width: '90%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 18,
    marginBottom: 8,
  },
  historySubtitle: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  intervalOptions: {
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 16,
  },
  nameInput: {
    marginBottom: 8,
  },
});

export default ContactDetailScreen; 