import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert, FlatList, SafeAreaView, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Appbar } from 'react-native-paper';
import { generateNotification, storeNotification, calculateNextReminder, markNotificationActioned, scheduleNextNotification, storeNotificationSafely } from './notification';
import { CustomText as Text } from './components/CustomText';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Surface } from 'react-native-paper';
import { useTheme } from './src/ThemeContext';
import type { TabParamList } from './types/navigation';
import ActionModal from './components/ActionModal';
import { FREQUENCY_OPTIONS } from './types/frequency';
import { format } from 'date-fns';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';
import { StoredNotification } from './notification';
import type { Contact } from './types/contact';

type Props = BottomTabScreenProps<TabParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props): JSX.Element => {
  const { currentTheme, isDarkMode, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: number; type: 'contacted' | 'dismiss' } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [contactHistories, setContactHistories] = useState<{ [key: string]: any }>({});
  const isFocused = useIsFocused();

  const paginatedNotifications = useMemo(() => {
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const startIndex = currentPage * itemsPerPage;
    return sortedNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [notifications, currentPage]);

  const totalPages = Math.ceil(notifications.length / itemsPerPage);

  useEffect(() => {
    const initialize = async () => {
      // Only load notifications on startup, don't check for reminders
      await loadNotifications();
    };
    
    initialize();
  }, []);

  useEffect(() => {
    // Listen for notification refresh events
    const refreshSubscription = DeviceEventEmitter.addListener(
      'refreshNotifications',
      () => {
        console.log('Refreshing notifications from event');
        loadNotifications();
      }
    );
    
    // Listen for force refresh events (higher priority)
    const forceRefreshSubscription = DeviceEventEmitter.addListener(
      'forceRefreshNotifications',
      async () => {
        console.log('🔍 CRITICAL - Starting forceRefresh, notifications:', await AsyncStorage.getItem('notifications'));
        
        try {
          // Get current notifications
          const notificationsJson = await AsyncStorage.getItem('notifications');
          console.log(`🔍 FORCE REFRESH - Current notifications: ${notificationsJson}`);
          
          if (!notificationsJson) {
            console.log('⚠️ No notifications found before refresh');
            return;
          }
          
          // Parse notifications
          const allNotifications = JSON.parse(notificationsJson);
          
          // Store a backup copy
          await AsyncStorage.setItem('notifications_backup', notificationsJson);
          console.log('📦 Stored backup of notifications');
          
          // Only update UI with due notifications
          const now = new Date();
          const dueNotifications = allNotifications.filter((n: StoredNotification) => 
            n.actioned === false && new Date(n.date) <= now
          );
          
          // Update UI with due notifications
          setNotifications(dueNotifications);
          
          console.log(`✅ Refresh complete. Final notifications in storage: ${await AsyncStorage.getItem('notifications')}`);
          console.log('🔍 CRITICAL - Ending forceRefresh, notifications:', await AsyncStorage.getItem('notifications'));
        } catch (error) {
          console.error('Error in forceRefreshNotifications:', error);
        }
      }
    );
    
    // Clean up the subscriptions
    return () => {
      refreshSubscription.remove();
      forceRefreshSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Periodically refresh notifications when the screen is visible
    const refreshInterval = setInterval(() => {
      if (isFocused) {
        console.log('Periodic refresh of notifications');
        loadNotifications();
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [isFocused]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen focused - refreshing notifications');
      loadNotifications();
      resetBadgeCount();
    });

    return unsubscribe;
  }, [navigation]);

  const debugNotifications = async () => {
    try {
      console.log('======= DEBUGGING NOTIFICATIONS =======');
      const notificationsJson = await AsyncStorage.getItem('notifications');
      console.log('Raw notifications:', notificationsJson);
      
      const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
      console.log(`Total notifications in storage: ${allNotifications.length}`);
      
      const activeNotifications = allNotifications.filter((n: StoredNotification) => n.actioned === false);
      console.log(`Active notifications: ${activeNotifications.length}`);
      activeNotifications.forEach((n: StoredNotification) => {
        console.log(`- ${n.name} (ID: ${n.id}): ${n.date}`);
      });
      
      console.log('======= END DEBUG =======');
    } catch (e) {
      console.error('Error in debugNotifications:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('HomeScreen focused - refreshing notifications');
      loadNotifications();
      debugNotifications();
      return () => {};
    }, [])
  );

  const checkForReminders = async () => {
    try {
      console.log('Checking for reminders...');
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts: Contact[] = contactsJson ? JSON.parse(contactsJson) : [];
      const now = new Date();
      
      await Promise.all(contacts.map(async (contact) => {
        if (!contact.paused && contact.nextReminder && new Date(contact.nextReminder) <= now) {
          console.log('Creating reminder for:', contact.name);
          const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
          const history = historyJson ? JSON.parse(historyJson) : [];
          
          const contactWithHistory = {
            ...contact,
            history
          };
          
          const notification = await generateNotification(contactWithHistory);
          await storeNotification(notification);

          const nextReminder = await calculateNextReminder(contact.frequency);
          console.log('Next reminder set for:', nextReminder);
          
          const updatedContacts = contacts.map(c => 
            c.id === contact.id 
              ? { ...c, nextReminder: nextReminder.toISOString() }
              : c
          );
          await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
        }
      }));

      await loadNotifications();
    } catch (e) {
      console.error('Error in checkForReminders:', e);
    }
  };

  const loadNotifications = async () => {
    try {
      console.log('\n🔄 Loading notifications...');
      
      const notificationsJson = await AsyncStorage.getItem('notifications');
      console.log('📝 Raw notifications:', notificationsJson);
      
      if (!notificationsJson) {
        console.log('⚠️ No notifications in storage');
        setNotifications([]);
        return;
      }
      
      const allNotifications = JSON.parse(notificationsJson);
      console.log(`\n📊 Processing ${allNotifications.length} total notifications`);
      
      // First filter: Only unactioned notifications
      const activeNotifications = allNotifications.filter((n: StoredNotification) => n.actioned === false);
      console.log(`Found ${activeNotifications.length} unactioned notifications`);
      
      // Log all unactioned notifications
      activeNotifications.forEach((n: StoredNotification, i: number) => {
        console.log(`🔍 Unactioned #${i+1}: ID ${n.id}, name: ${n.name}, date: ${n.date}`);
      });
      
      // Second filter: Only past due notifications
      const now = new Date();
      const dueNotifications = activeNotifications.filter((n: StoredNotification) => {
        const dueDate = new Date(n.date);
        const isDue = dueDate <= now;
        console.log(`- ${n.name}: due ${dueDate.toLocaleString()}, isDue: ${isDue}`);
        return isDue;
      });
      
      console.log(`\n📱 Showing ${dueNotifications.length} due notifications`);
      dueNotifications.forEach((n: StoredNotification, i: number) => {
        console.log(`- ${n.name}: ID ${n.id}, due ${new Date(n.date).toLocaleString()}`);
      });
      
      setNotifications(dueNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const loadContactHistories = async (notifications: StoredNotification[]) => {
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts: Contact[] = contactsJson ? JSON.parse(contactsJson) : [];
      
      const histories: { [key: string]: any } = {};
      
      await Promise.all(notifications.map(async (notification) => {
        const contact = contacts.find(c => c.name.trim() === notification.name.trim());
        if (contact) {
          const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
          const history = historyJson ? JSON.parse(historyJson) : [];
          if (history.length > 0) {
            histories[notification.name] = history[0];
          }
        }
      }));
      
      setContactHistories(histories);
    } catch (e) {
      console.error('Error loading contact histories:', e);
    }
  };

  useEffect(() => {
    loadContactHistories(notifications);
  }, [notifications]);

  // First, let's create a reusable function to dismiss a single notification
  const dismissSingleNotification = async (notification: StoredNotification, notes: string = '') => {
    try {
      console.log(`🔄 Dismissing notification for ${notification.name} with notes: ${notes}`);
      
      // Find the matching contact
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts: Contact[] = contactsJson ? JSON.parse(contactsJson) : [];
      const contact = contacts.find(c => c.name.trim() === notification.name.trim());
      
      if (!contact) {
        console.error(`❌ Could not find contact for notification: ${notification.name}`);
        return;
      }
      
      console.log(`📝 Found matching contact: ${contact.name} (ID: ${contact.id})`);
      
      // 1. Mark notification as actioned
      await markNotificationActioned(notification.id, 'dismissed', notes);
      
      // 2. Update contact history
      const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      const now = new Date();
      history.unshift({
        date: now.toISOString(),
        action: 'Dismissed',
        notes: notes || 'Manually dismissed'
      });
      
      await AsyncStorage.setItem(`history_${contact.id}`, JSON.stringify(history));
      console.log(`📝 Updated history for ${contact.name}`);
      
      // 3. Schedule next reminder (this is already handled by markNotificationActioned)
      // The markNotificationActioned function now calls scheduleNextNotification internally
      
      return true;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  };

  // Create a function for handling "Contacted" action
  const contactedSingleNotification = async (notification: StoredNotification, notes: string = '') => {
    try {
      console.log(`🔄 Marking notification as contacted for ${notification.name} with notes: ${notes}`);
      
      // Find the matching contact
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts: Contact[] = contactsJson ? JSON.parse(contactsJson) : [];
      const contact = contacts.find(c => c.name.trim() === notification.name.trim());
      
      if (!contact) {
        console.error(`❌ Could not find contact for notification: ${notification.name}`);
        return;
      }
      
      console.log(`📝 Found matching contact: ${contact.name} (ID: ${contact.id})`);
      
      // 1. Mark notification as actioned
      await markNotificationActioned(notification.id, 'contacted', notes);
      
      // 2. Update contact history
      const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      const now = new Date();
      history.unshift({
        date: now.toISOString(),
        action: 'Contacted',
        notes: notes || 'Manually marked as contacted'
      });
      
      // 3. Update contact's lastContacted date
      contact.lastContacted = now.toISOString();
      
      // 4. Save updated contact and history
      await AsyncStorage.setItem(`history_${contact.id}`, JSON.stringify(history));
      
      // 5. Update the contact in the contacts array
      const updatedContacts = contacts.map((c: Contact) => 
        c.id === contact.id ? { ...c, lastContacted: now.toISOString() } : c
      );
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
      
      console.log(`📝 Updated history and lastContacted for ${contact.name}`);
      
      return true;
    } catch (error) {
      console.error('Error marking notification as contacted:', error);
      return false;
    }
  };

  // Then update handleNotificationAction to use this function
  const handleNotificationAction = (id: number, type: 'contacted' | 'dismiss') => {
    setPendingAction({ id, type });
    setModalVisible(true);
  };

  // Update handleModalAction to use contactedSingleNotification
  const handleModalAction = async (notes: string) => {
    if (!pendingAction) return;
    await handleActionDirectly(pendingAction.id, pendingAction.type, notes);
  };

  const handleModalSubmit = async (notes: string) => {
    if (!pendingAction) return;
    
    try {
      const { id, type } = pendingAction;
      
      // Get and update contacts first
      const contactsJson = await AsyncStorage.getItem('contacts');
      let contacts: Contact[] = contactsJson ? JSON.parse(contactsJson) : [];
      
      // Find the notification
      const storedNotificationsJson = await AsyncStorage.getItem('notifications');
      let storedNotifications: StoredNotification[] = storedNotificationsJson ? JSON.parse(storedNotificationsJson) : [];
      const notification = storedNotifications.find(n => n.id === id);
      
      if (!notification) {
        console.error('Notification not found:', id);
        return;
      }
      
      // Find and update the matching contact
      const now = new Date();
      contacts = await Promise.all(contacts.map(async (c: Contact) => {
        if (c.name.trim() === notification.name.trim()) {
          // Store history
          const historyJson = await AsyncStorage.getItem(`history_${c.id}`);
          const history = historyJson ? JSON.parse(historyJson) : [];
          history.unshift({
            date: now.toISOString(),
            action: type === 'contacted' ? 'Contacted' : 'Dismissed',
            notes
          });
          await AsyncStorage.setItem(`history_${c.id}`, JSON.stringify(history));

          // Schedule next notification after action
          console.log('🔍 CRITICAL - Before scheduling next notification');
          const nextReminderDate = await scheduleNextNotification(c);
          console.log('🔍 CRITICAL - After scheduling next notification');
          
          return {
            ...c,
            lastContacted: type === 'contacted' ? now.toISOString() : c.lastContacted,
            nextReminder: nextReminderDate.toISOString()
          };
        }
        return c;
      }));
      
      // Get the LATEST notifications (including the new one that was just added)
      const latestNotificationsJson = await AsyncStorage.getItem('notifications');
      let latestNotifications: StoredNotification[] = latestNotificationsJson ? JSON.parse(latestNotificationsJson) : [];
      
      // Mark the actioned notification
      latestNotifications = latestNotifications.map(n => 
        n.id === id ? { ...n, actioned: true } : n
      );
      
      // Save the updated notifications
      await AsyncStorage.setItem('notifications', JSON.stringify(latestNotifications));
      await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
      
      // Only update UI with due notifications
      const dueNotifications = latestNotifications.filter(n => 
        n.actioned === false && new Date(n.date) <= now
      );
      setNotifications(dueNotifications);
      
      setModalVisible(false);
      setPendingAction(null);
      await resetBadgeCount();

      console.log('✅ User actioned reminder:', {
        contact: notification.name,
        action: type,
        notes: notes ? 'Provided' : 'None',
        nextReminder: 'Updated'
      });
    } catch (e) {
      console.error('Error handling notification action:', e);
      Alert.alert('Error', 'Failed to process action');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderNotification = ({ item }: { item: StoredNotification }) => {
    const lastHistory = contactHistories[item.name];
    
    return (
      <View style={[styles.surfaceWrapper, { backgroundColor: currentTheme.colors.surface }]}>
        <Surface style={[styles.notificationItem, { backgroundColor: currentTheme.colors.background }]} elevation={1}>
          <View style={styles.notificationInfo}>
            <Text style={[styles.contactName, { color: currentTheme.colors.onSurface }]}>
              {item.name}
            </Text>
            <Text style={[styles.notificationDate, { color: currentTheme.colors.secondaryContainer }]}>
              Notification date: {item.date && !isNaN(new Date(item.date).getTime())
                ? format(new Date(item.date), 'PPp')
                : 'Invalid date'}
            </Text>
            <View style={styles.historyInfo}>
              <Text style={{ color: currentTheme.colors.onSurface }}>
                Last contact: {lastHistory ? formatDate(lastHistory.date) : 'Never'}
              </Text>
              {lastHistory?.action && (
                <Text style={{ color: currentTheme.colors.onSurface }}>
                  Last action: {lastHistory.action}
                </Text>
              )}
              {lastHistory?.notes && (
                <Text style={{ color: currentTheme.colors.onSurface }}>
                  Notes: {lastHistory.notes}
                </Text>
              )}
            </View>
            <View style={styles.buttons}>
              <Button 
                mode="outlined"
                textColor={currentTheme.colors.error}
                onPress={() => handleNotificationAction(item.id, 'dismiss')}
              >
                Dismiss
              </Button>
              <Button 
                mode="contained"
                buttonColor={currentTheme.colors.primary}
                textColor={currentTheme.colors.onPrimary}
                onPress={() => handleNotificationAction(item.id, 'contacted')}
              >
                Contacted
              </Button>
            </View>
          </View>
        </Surface>
      </View>
    );
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Finally, update handleClearAll to use the dismissSingleNotification function
  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          onPress: async () => {
            try {
              console.log('🧹 Clearing all notifications...');
              
              // Get current notifications and contacts
              const notificationsJson = await AsyncStorage.getItem('notifications');
              const contactsJson = await AsyncStorage.getItem('contacts');
              
              if (!notificationsJson || !contactsJson) {
                console.error('Missing data for clear all');
                return;
              }
              
              const currentNotifications = JSON.parse(notificationsJson);
              let contacts = JSON.parse(contactsJson);
              
              // Get only unactioned, due notifications
              const now = new Date();
              const dueNotifications = currentNotifications.filter((n: StoredNotification) => 
                n.actioned === false && new Date(n.date) <= now
              );
              
              console.log(`🧹 Processing ${dueNotifications.length} due notifications`);
              
              // Mark all as actioned
              const updatedNotifications = currentNotifications.map((n: StoredNotification) => ({
                ...n,
                actioned: true
              }));
              
              // Create new notifications and update contacts
              const newNotifications: StoredNotification[] = [];
              
              // Process each notification
              for (const notification of dueNotifications) {
                // Find matching contact
                const contact = contacts.find((c: Contact) => c.name === notification.name);
                if (!contact) {
                  console.log(`⚠️ Contact not found for ${notification.name}`);
                  continue;
                }
                
                // Calculate next reminder
                const nextReminderDate = await calculateNextReminder(notification.frequency);
                
                // Create new notification
                const newNotification: StoredNotification = {
                  id: Date.now() + Math.floor(Math.random() * 10000),
                  name: notification.name,
                  date: nextReminderDate.toISOString(),
                  frequency: notification.frequency,
                  lastContacted: contact.lastContacted || null,
                  actioned: false,
                  paused: false
                };
                
                newNotifications.push(newNotification);
                
                // Schedule the push notification
                PushNotification.localNotificationSchedule({
                  channelId: 'tribe-reminders',
                  title: 'Time to Connect! 👋',
                  message: `It's time to reach out to ${notification.name}`,
                  date: nextReminderDate,
                  id: String(contact.id),
                  userInfo: { 
                    contactId: contact.id, 
                    notificationId: newNotification.id,
                    navigateTo: 'Home'
                  },
                  number: 1,
                  actions: ["View"],
                  invokeApp: true,
                  category: "reminder"
                });
                
                console.log(`🔔 Scheduled push notification for ${notification.name} at ${nextReminderDate.toLocaleString()}`);
                
                // Update contact
                contacts = contacts.map((c: Contact) => 
                  c.id === contact.id 
                    ? {
                        ...c,
                        nextReminder: nextReminderDate.toISOString(),
                        history: [
                          { date: new Date().toISOString(), action: 'dismiss', notes: 'Cleared via Clear All' },
                          ...(c.history || [])
                        ]
                      }
                    : c
                );
                
                // Update contact history
                const historyJson = await AsyncStorage.getItem(`history_${contact.id}`);
                const history = historyJson ? JSON.parse(historyJson) : [];
                history.unshift({
                  date: new Date().toISOString(),
                  action: 'Dismissed',
                  notes: 'Cleared via Clear All'
                });
                await AsyncStorage.setItem(`history_${contact.id}`, JSON.stringify(history));
              }
              
              // Save everything
              await AsyncStorage.setItem('notifications', JSON.stringify([...updatedNotifications, ...newNotifications]));
              await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
              
              // Update UI
              setNotifications([]);
              resetBadgeCount();
              
              console.log('✅ All notifications cleared and new ones scheduled');
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          },
        },
      ],
    );
  };

  const resetBadgeCount = async () => {
    try {
      const notificationsJson = await AsyncStorage.getItem('notifications');
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
      
      // Count unactioned notifications whose date has passed
      const now = new Date();
      const dueNotifications = notifications.filter((n: StoredNotification) => 
        n.actioned === false && 
        new Date(n.date) <= now
      );
      
      const badgeCount = dueNotifications.length;
      console.log(`Resetting badge count to ${badgeCount}`);
      
      if (Platform.OS === 'ios') {
        PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
      }
      PushNotification.setApplicationIconBadgeNumber(badgeCount);
    } catch (error) {
      console.error('Error resetting badge count:', error);
    }
  };

  // Add this function to handle notification triggers
  const handleNotificationTrigger = async (notification: any) => {
    console.log('📱 Notification triggered:', notification);
    
    // Find the contact
    const contactsJson = await AsyncStorage.getItem('contacts');
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];
    const contactId = notification.userInfo?.contactId;
    
    if (!contactId) {
      console.error('❌ No contact ID found in notification');
      return;
    }
    
    const contact = contacts.find((c: Contact) => c.id === contactId);
    if (!contact) {
      console.error(`❌ Contact with ID ${contactId} not found`);
      return;
    }
    
    console.log(`📝 Creating notification entry for ${contact.name}`);
    
    // Create a notification entry
    const notificationEntry = {
      id: notification.userInfo?.notificationId || Date.now(),
      name: contact.name,
      date: new Date().toISOString(),
      frequency: contact.frequency,
      lastContacted: contact.lastContacted || null,
      actioned: false,
      paused: false
    };
    
    // Store in notifications array
    const notificationsJson = await AsyncStorage.getItem('notifications');
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    // Check for duplicates
    const isDuplicate = notifications.some((n: StoredNotification) => n.id === notificationEntry.id);
    if (!isDuplicate) {
      notifications.push(notificationEntry);
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      console.log(`✅ Notification entry created and stored`);
    } else {
      console.log(`⚠️ Duplicate notification entry detected, skipping`);
    }
    
    // Refresh notifications
    loadNotifications();
  };

  // Add this function to debug notifications after scheduling
  const debugNotificationsAfterScheduling = async () => {
    try {
      console.log('🔍 DEBUG - Checking notifications after scheduling');
      const notificationsJson = await AsyncStorage.getItem('notifications');
      
      if (!notificationsJson) {
        console.log('⚠️ No notifications found in storage after scheduling!');
        return;
      }
      
      const allNotifications = JSON.parse(notificationsJson);
      console.log(`📊 Found ${allNotifications.length} notifications in storage after scheduling`);
      
      allNotifications.forEach((n: StoredNotification, i: number) => {
        console.log(`Notification ${i+1}: ${n.name}, ID: ${n.id}, actioned: ${n.actioned}, date: ${new Date(n.date).toLocaleString()}`);
      });
    } catch (e) {
      console.error('Error in debugNotificationsAfterScheduling:', e);
    }
  };

  const handleActionDirectly = async (notificationId: number, type: 'contacted' | 'dismiss', notes: string) => {
    try {
      console.log(`\n🔄 Starting action handler for notification ${notificationId}`);
      
      // Get current data
      const [notificationsJson, contactsJson] = await Promise.all([
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('contacts')
      ]);
      
      if (!notificationsJson || !contactsJson) throw new Error('Missing data');
      
      const allNotifications = JSON.parse(notificationsJson);
      const contacts = JSON.parse(contactsJson);
      
      // Find notification and contact
      const notification = allNotifications.find((n: StoredNotification) => n.id === notificationId);
      if (!notification) throw new Error(`Notification ${notificationId} not found`);
      
      const contact = contacts.find((c: Contact) => c.name === notification.name);
      if (!contact) throw new Error(`Contact not found for ${notification.name}`);
      
      // 1. Mark notification as actioned
      const updatedNotifications = allNotifications.map((n: StoredNotification) => 
        n.id === notificationId ? { ...n, actioned: true } : n
      );
      
      // 2. Create next notification
      const nextReminderDate = await calculateNextReminder(notification.frequency);
      const newNotification: StoredNotification = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        name: notification.name,
        date: nextReminderDate.toISOString(),
        frequency: notification.frequency,
        lastContacted: type === 'contacted' ? new Date().toISOString() : contact.lastContacted || null,
        actioned: false,
        paused: false
      };
      
      // 3. Update contact
      const updatedContacts = contacts.map((c: Contact) => 
        c.id === contact.id 
          ? {
              ...c,
              lastContacted: type === 'contacted' ? new Date().toISOString() : c.lastContacted,
              nextReminder: nextReminderDate.toISOString(),
              history: [
                { date: new Date().toISOString(), action: type, notes },
                ...(c.history || [])
              ]
            }
          : c
      );
      
      // 4. Save everything
      await Promise.all([
        AsyncStorage.setItem('notifications', JSON.stringify([...updatedNotifications, newNotification])),
        AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts))
      ]);
      
      // 5. Schedule OS notification
      PushNotification.localNotificationSchedule({
        channelId: 'tribe-reminders',
        title: 'Time to Connect! 👋',
        message: `It's time to reach out to ${contact.name}`,
        date: nextReminderDate,
        id: String(contact.id),
        userInfo: { 
          contactId: contact.id, 
          notificationId: newNotification.id,
          navigateTo: 'Home'
        },
        number: 1,
        actions: ["View"],
        invokeApp: true,
        category: "reminder"
      });
      
      // 6. Update UI
      await loadNotifications();
      
      // 7. Show success message
      Alert.alert(
        'Success',
        `You've ${type === 'contacted' ? 'contacted' : 'dismissed'} ${notification.name}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error in handleActionDirectly:', error);
      Alert.alert('Error', 'Failed to process your action');
    } finally {
      setModalVisible(false);
      setPendingAction(null);
    }
  };

  const refreshNotifications = async () => {
    console.log('\n🔄 Manual refresh requested');
    await loadNotifications();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    surfaceWrapper: {
      marginVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    notificationItem: {
      margin: 8,
      padding: 16,
      borderRadius: 8,
    },
    notificationInfo: {
      flex: 1,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 8,
    },
    contentContainer: {
      flex: 1,
      paddingBottom: 5,
    },
    bottomContainer: {
      backgroundColor: currentTheme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: currentTheme.colors.outline,
      marginTop: 8,
    },
    clearAllButton: {
      margin: 16,
      marginBottom: 0,
      borderColor: currentTheme.colors.error,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: currentTheme.colors.surface,
    },
    paginationButton: {
      minWidth: 100,
    },
    pageText: {
      fontSize: 16,
    },
    contactName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    notificationDate: {
      marginBottom: 8,
    },
    historyInfo: {
      backgroundColor: currentTheme.colors.surfaceVariant,
      padding: 8,
      borderRadius: 4,
      marginBottom: 8,
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      {notifications.length > 0 ? (
        <View style={styles.contentContainer}>
          <FlatList
            data={paginatedNotifications}
            keyExtractor={item => item.id.toString()}
            renderItem={renderNotification}
            contentContainerStyle={{
              padding: 16,
            }}
            ListFooterComponent={() => (
              <View style={styles.bottomContainer}>
                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <Button
                      mode="contained"
                      onPress={handlePrevPage}
                      disabled={currentPage === 0}
                      style={[styles.paginationButton, { opacity: currentPage === 0 ? 0.5 : 1 }]}
                      buttonColor={currentTheme.colors.primary}
                    >
                      Previous
                    </Button>
                    <Text style={[styles.pageText, { color: currentTheme.colors.onSurface }]}>
                      {`${currentPage + 1} of ${totalPages}`}
                    </Text>
                    <Button
                      mode="contained"
                      onPress={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      style={[styles.paginationButton, { opacity: currentPage >= totalPages - 1 ? 0.5 : 1 }]}
                      buttonColor={currentTheme.colors.primary}
                    >
                      Next
                    </Button>
                  </View>
                )}
                <Button
                  mode="outlined"
                  onPress={handleClearAll}
                  style={styles.clearAllButton}
                  textColor={currentTheme.colors.error}
                >
                  Clear All Notifications
                </Button>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={{ color: currentTheme.colors.onSurface }}>You are all up-to-date 😊</Text>
        </View>
      )}
      <ActionModal
        visible={modalVisible}
        action={pendingAction?.type || 'contacted'}
        onSubmit={handleModalSubmit}
        onDismiss={() => {
          setModalVisible(false);
          setPendingAction(null);
        }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen; 