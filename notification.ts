import { format } from 'date-fns';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREQUENCY_OPTIONS, WeekdayInterval } from './types/frequency';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, DeviceEventEmitter } from 'react-native';
import { Mutex } from 'async-mutex';

// Create a mutex for notification storage operations
const storeMutex = new Mutex();

type Contact = {
  id: number;
  name: string;
  frequency: string;
  lastContacted?: string;
  nextReminder?: string;
  history?: Array<{
    date: string;
    action: string;
    notes?: string;
  }>;
};

// First, let's define a proper type for notifications
export type StoredNotification = {
  id: number;
  name: string;
  date: string;
  frequency: string;
  lastContacted: string | null;
  actioned: boolean;
  paused: boolean;
};

type StoredNotificationWithAction = StoredNotification & {
  actioned?: boolean;
  paused?: boolean;
};

console.log('notification.ts loaded');

// Centralized function to store notifications with mutex protection
export const storeNotificationSafely = async (notification: StoredNotificationWithAction) => {
  return await storeMutex.runExclusive(async () => {
    console.log('🔒 Mutex acquired - Reading current notifications');
    
    // 1. Read the existing array
    const storedNotifications = await AsyncStorage.getItem('notifications');
    const currentNotifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    console.log(`📊 Found ${currentNotifications.length} existing notifications`);
    
    // 2. Check for duplicates by ID
    const isDuplicate = currentNotifications.some((n: StoredNotificationWithAction) => n.id === notification.id);
    if (isDuplicate) {
      console.log(`⚠️ Duplicate notification detected with ID ${notification.id} - skipping`);
      return currentNotifications;
    }
    
    // 3. Append the new notification
    const updatedNotifications = [...currentNotifications, notification];
    
    console.log(`📈 Will store ${updatedNotifications.length} notifications (added 1)`);
    
    // 4. Write back
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    console.log('🔓 Mutex released - Notifications stored successfully');
    
    // 5. Update badge count
    const now = new Date();
    const dueNotifications = updatedNotifications.filter((n: StoredNotification) => 
      n.actioned === false && 
      new Date(n.date) <= now
    );
    const unactionedCount = dueNotifications.length;

    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(unactionedCount);
    }
    PushNotification.setApplicationIconBadgeNumber(unactionedCount);
    
    console.log('Badge count updated to:', unactionedCount, '(only counting due notifications)');
    
    // 6. Emit event to refresh UI AFTER everything is complete
    // Add a small delay to ensure AsyncStorage write is fully committed
    setTimeout(() => {
      console.log('🔄 Emitting forceRefreshNotifications after storage completion');
      DeviceEventEmitter.emit('forceRefreshNotifications', {});
    }, 300);
    
    return updatedNotifications;
  });
};

// Update generateNotification to use the mutex-protected function
export const generateNotification = async (contact: Contact): Promise<StoredNotification> => {
  console.log('🎯 Generating notification for:', contact.name);
  
  // Create a unique ID using contact name, timestamp, and random number
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 10000);
  const nameHash = contact.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const uniqueId = timestamp + randomPart + nameHash;
  
  const notification: StoredNotification = {
    id: uniqueId,
    name: contact.name,
    date: new Date().toISOString(),
    frequency: contact.frequency,
    lastContacted: contact.history?.[0]?.date || null,
    actioned: false,
    paused: false
  };

  console.log('📝 Created notification object with unique ID:', notification);

  // Get the next reminder date
  const nextReminderDate = await calculateNextReminder(contact.frequency);
  
  // Schedule the notification for the future
  PushNotification.localNotificationSchedule({
    channelId: 'tribe-reminders',
    title: 'Time to Connect! 👋',
    message: `It's time to reach out to ${contact.name}`,
    subText: `Last contacted: ${contact.history?.[0]?.date || 'Never'}`,
    playSound: true,
    soundName: 'default',
    importance: 'high',
    priority: 'high',
    largeIcon: "ic_launcher",
    smallIcon: "ic_notification",
    bigText: `Keep in touch with ${contact.name}. You aim to contact them ${
      FREQUENCY_OPTIONS.find(opt => opt.id === contact.frequency)?.label || 'regularly'
    }`,
    vibrate: true,
    vibration: 300,
    invokeApp: true,
    date: nextReminderDate, // Schedule for the next reminder date
    allowWhileIdle: true,
    repeatType: undefined,
    userInfo: { contactId: contact.id } // Add contact ID to userInfo
  });

  // Store the notification using the mutex-protected function
  const fullNotification = {
    ...notification,
    actioned: false,
    paused: false
  };
  
  await storeNotificationSafely(fullNotification);
  
  return notification;
};

// Update storeNotification to use the mutex-protected function
export const storeNotification = async (notification: StoredNotification) => {
  console.log('💾 Attempting to store notification:', notification);
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    const currentNotifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    console.log('📊 Current notifications before storing:', currentNotifications);

    const fullNotification = {
      ...notification,
      actioned: false,
      paused: false
    };
    
    const updatedNotifications = [...currentNotifications, fullNotification];
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    console.log('✅ Notification stored successfully. Updated notifications:', updatedNotifications);
  } catch (e) {
    console.error('❌ Error storing notification:', e);
  }
};

const adjustTimeToWindow = async (date: Date): Promise<Date> => {
  // Get stored times or use defaults (8am-8pm)
  const startTime = await AsyncStorage.getItem('notificationStartTime') || '08:00';
  const endTime = await AsyncStorage.getItem('notificationEndTime') || '20:00';
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  
  // Create a new date to avoid modifying the original
  const adjustedDate = new Date(date);
  
  // Always set to start of window time
  adjustedDate.setHours(startHour, startMinute, 0, 0);
  
  // If the adjusted date is in the past, move to next day
  const now = new Date();
  if (adjustedDate <= now) {
    adjustedDate.setDate(adjustedDate.getDate() + 1);
  }
  
  return adjustedDate;
};

export async function calculateNextReminder(frequency: string): Promise<Date> {
  console.log('calculateNextReminder called with frequency:', frequency);
  const startTime = await AsyncStorage.getItem('notificationStartTime') || '08:00';
  const endTime = await AsyncStorage.getItem('notificationEndTime') || '20:00';
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Calculate random time within window
  const randomMinutes = Math.floor(
    Math.random() * 
    ((endHour * 60 + endMinute) - (startHour * 60 + startMinute))
  );
  
  const nextDate = new Date();
  nextDate.setHours(startHour, startMinute, 0, 0);
  nextDate.setMinutes(nextDate.getMinutes() + randomMinutes);

  if (frequency.startsWith('r')) {
    // Handle random intervals
    switch (frequency) {
      case 'r0':
        // Testing: 10 seconds from now (instead of 1 minute)
        const testDate = new Date();
        testDate.setSeconds(testDate.getSeconds() + 10);
        console.log(`🔍 TEST MODE - Setting next reminder to 10 seconds from now: ${testDate.toLocaleString()}`);
        return testDate;
      case 'r1':
        nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 3) + 1);
        break;
      case 'r2':
        nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 5) + 3);
        break;
      case 'r3':
        nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 7) + 7);
        break;
      case 'r4':
        nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 14) + 14);
        break;
    }
  } else if (frequency.startsWith('w')) {
    // Parse weekday and interval from frequency ID (e.g., 'w3_weekly')
    const [_, weekdayStr, intervalStr] = frequency.match(/w(\d)_(\w+)/) || [];
    const targetDay = parseInt(weekdayStr);
    const interval = intervalStr as WeekdayInterval;

    let daysToAdd = targetDay - nextDate.getDay();
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }

    // Add days to reach the next occurrence of the weekday
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    // If the time has already passed today, move to next occurrence
    if (nextDate < new Date()) {
      switch (interval) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'fortnightly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setDate(nextDate.getDate() + 28);
          break;
      }
    }
  }

  return nextDate;
}

// Update the badge count function to work on both platforms
export const updateNotificationBadge = async () => {
  try {
    // Get all notifications
    const notificationsJson = await AsyncStorage.getItem('notifications');
    console.log(`🔍 DEBUG - Raw notifications for badge update: ${notificationsJson}`);
    
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    // Count unactioned notifications whose date has passed
    const now = new Date();
    const dueNotifications = notifications.filter((n: StoredNotification) => 
      n.actioned === false && 
      new Date(n.date) <= now
    );
    
    const badgeCount = dueNotifications.length;
    console.log(`🔢 Setting badge count to ${badgeCount} (${dueNotifications.length} due unactioned notifications)`);
    
    // Update badge count
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
    }
    PushNotification.setApplicationIconBadgeNumber(badgeCount);
    
    return badgeCount;
  } catch (error) {
    console.error('Error updating notification badge:', error);
    return 0;
  }
};

// Update markNotificationActioned to ensure badge is updated
export const markNotificationActioned = async (notificationId: number, action: string = 'dismissed', notes: string = '') => {
  try {
    console.log(`🎯 Marking notification ${notificationId} as actioned with action: ${action}`);
    
    // Get all notifications
    const notificationsJson = await AsyncStorage.getItem('notifications');
    console.log(`🔍 DEBUG - Raw notifications before action: ${notificationsJson}`);
    
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    // Find the notification to mark as actioned
    const notification = notifications.find((n: StoredNotificationWithAction) => n.id === notificationId);
    if (!notification) {
      console.error(`❌ Notification with ID ${notificationId} not found`);
      return;
    }
    
    // STEP 1: Mark the notification as actioned but don't remove it yet
    const updatedNotifications = notifications.map((n: StoredNotification) => 
      n.id === notificationId ? { ...n, actioned: true } : n
    );
    
    console.log(`📊 DEBUG - Notifications after marking as actioned: ${JSON.stringify(updatedNotifications)}`);
    
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Verify the notifications were saved correctly
    const verifyJson = await AsyncStorage.getItem('notifications');
    console.log(`✅ DEBUG - Verification after marking as actioned: ${verifyJson}`);
    
    // Find the contact for this notification
    const contactsJson = await AsyncStorage.getItem('contacts');
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];
    const contact = contacts.find((c: Contact) => c.name === notification.name);
    
    if (!contact) {
      console.error(`❌ Contact not found for notification ${notificationId} (${notification.name})`);
      return;
    }
    
    // Update contact's history
    if (!contact.history) {
      contact.history = [];
    }
    
    // Add this action to history
    contact.history.unshift({
      date: new Date().toISOString(),
      action: action,
      notes: notes || `Manually ${action}`
    });
    
    // Update lastContacted if this was a "contacted" action
    if (action === 'contacted') {
      contact.lastContacted = new Date().toISOString();
    }
    
    // Save updated contacts
    await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
    
    console.log(`🔄 Scheduling next reminder for ${contact.name} after actioning notification ${notificationId}`);
    
    // STEP 2: Create a new notification with current date
    const newId = Date.now() + Math.floor(Math.random() * 10000);
    
    // Create a notification entry for AsyncStorage - set date to NOW to make it appear immediately
    const newNotificationEntry = {
      id: newId,
      name: contact.name,
      date: new Date().toISOString(), // Set to current time to make it appear immediately
      frequency: contact.frequency,
      lastContacted: contact.lastContacted || null,
      actioned: false,
      paused: false
    };
    
    // STEP 3: Add the new notification to the existing array
    const finalNotifications = [...updatedNotifications, newNotificationEntry];
    
    console.log(`📊 DEBUG - Final notifications array: ${JSON.stringify(finalNotifications)}`);
    
    // Save the updated array
    await AsyncStorage.setItem('notifications', JSON.stringify(finalNotifications));
    
    // Verify the notifications were saved correctly
    const finalVerifyJson = await AsyncStorage.getItem('notifications');
    console.log(`✅ DEBUG - Final verification: ${finalVerifyJson}`);
    
    // STEP 4: Schedule the next OS notification
    const nextReminderDate = await calculateNextReminder(contact.frequency);
    
    // Schedule the notification with the OS using the new ID
    PushNotification.localNotificationSchedule({
      channelId: 'tribe-reminders',
      title: 'Time to Connect! 👋',
      message: `It's time to reach out to ${contact.name}`,
      subText: `Last contacted: ${contact.lastContacted || 'Never'}`,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      largeIcon: "ic_launcher",
      smallIcon: "ic_notification",
      bigText: `Keep in touch with ${contact.name}. You aim to contact them ${
        FREQUENCY_OPTIONS.find(opt => opt.id === contact.frequency)?.label || 'regularly'
      }`,
      vibrate: true,
      vibration: 300,
      invokeApp: true,
      date: nextReminderDate,
      allowWhileIdle: true,
      repeatType: undefined,
      id: String(contact.id),
      userInfo: { 
        contactId: contact.id,
        notificationId: newId
      }
    });
    
    // Update the contact with the new reminder date
    contact.nextReminder = nextReminderDate.toISOString();
    await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
    
    // Update badge count
    await updateNotificationBadge();
    
    // Emit event to refresh UI
    DeviceEventEmitter.emit('forceRefreshNotifications', {});
    
    return true;
  } catch (error) {
    console.error('Error marking notification as actioned:', error);
    return false;
  }
};

// Update clearNotifications to reset badge
export const clearNotifications = async () => {
  try {
    await AsyncStorage.setItem('notifications', JSON.stringify([]));
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(0);
    }
    PushNotification.setApplicationIconBadgeNumber(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

export const forceSyncBadge = async () => {
  try {
    const notificationsJson = await AsyncStorage.getItem('notifications');
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    // Count unactioned notifications
    const unactioned = notifications.filter((n: StoredNotificationWithAction) => 
      !n.actioned && !n.paused
    ).length;
    
    console.log('Force syncing badge count to:', unactioned);
    PushNotification.setApplicationIconBadgeNumber(unactioned);
    
    return unactioned;
  } catch (error) {
    console.error('Error in forceSyncBadge:', error);
    PushNotification.setApplicationIconBadgeNumber(0);
    return 0;
  }
};

// Update the scheduleLocalNotification function in notification.ts
export const scheduleLocalNotification = async (contact: Contact) => {
  try {
    const { id, name, nextReminder } = contact;
    
    // Ensure we have a valid date
    const reminderDate = nextReminder 
      ? new Date(nextReminder) 
      : await calculateNextReminder(contact.frequency);
    
    // Cancel any existing notifications for this contact
    PushNotification.cancelLocalNotification(String(id));
    
    // Create a unique notification ID
    const notificationId = Date.now() + Math.floor(Math.random() * 10000);
    
    // Schedule the notification
    PushNotification.localNotificationSchedule({
      channelId: 'tribe-reminders',
      title: 'Time to Connect! 👋',
      message: `It's time to reach out to ${name}`,
      date: reminderDate, // Use the validated date
      id: String(id),
      userInfo: {
        contactId: id,
        notificationId: notificationId,
        navigateTo: 'Home'
      },
      number: 1,
      actions: ["View"],
      invokeApp: true,
      category: "reminder"
    });
    
    console.log(`🔔 Scheduled notification for: ${reminderDate.toLocaleString()}`);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Update scheduleNextNotification to preserve existing notifications
export const scheduleNextNotification = async (contact: Contact) => {
  console.log('🔄 Starting scheduleNextNotification for:', contact.name);
  
  // Calculate the next reminder date
  const nextReminderDate = await calculateNextReminder(contact.frequency);
  
  // Generate a completely new unique ID for this reminder
  const newId = Date.now() + Math.floor(Math.random() * 10000);
  console.log(`🆔 Generated new unique ID for next reminder: ${newId}`);
  
  // Create a notification entry for AsyncStorage
  const notificationEntry = {
    id: newId,
    name: contact.name,
    date: nextReminderDate.toISOString(), // Use the calculated next date, not current time
    frequency: contact.frequency,
    lastContacted: contact.lastContacted || null,
    actioned: false,
    paused: false
  };
  
  // Use the mutex to safely store the notification
  await storeMutex.runExclusive(async () => {
    console.log('🔒 Mutex acquired - Adding new notification');
    
    // Get existing notifications
    const notificationsJson = await AsyncStorage.getItem('notifications');
    const existingNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    console.log(`🔍 DEBUG - Existing notifications before adding new one: ${JSON.stringify(existingNotifications)}`);
    
    // Add the new notification to the existing ones
    const updatedNotifications = [...existingNotifications, notificationEntry];
    console.log(`📊 DEBUG - Updated notifications array (${updatedNotifications.length} items): ${JSON.stringify(updatedNotifications)}`);
    
    // Save the updated array
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Verify the notifications were saved correctly
    const verifyJson = await AsyncStorage.getItem('notifications');
    console.log(`✅ DEBUG - Verification after adding new notification: ${verifyJson}`);
    
    console.log('🔓 Mutex released - New notification added');
  });
  
  // Schedule the notification with the OS using the new ID
  PushNotification.localNotificationSchedule({
    channelId: 'tribe-reminders',
    title: 'Time to Connect! 👋',
    message: `It's time to reach out to ${contact.name}`,
    subText: `Last contacted: ${contact.lastContacted || 'Never'}`,
    playSound: true,
    soundName: 'default',
    importance: 'high',
    priority: 'high',
    largeIcon: "ic_launcher",
    smallIcon: "ic_notification",
    bigText: `Keep in touch with ${contact.name}. You aim to contact them ${
      FREQUENCY_OPTIONS.find(opt => opt.id === contact.frequency)?.label || 'regularly'
    }`,
    vibrate: true,
    vibration: 300,
    invokeApp: true,
    date: nextReminderDate,
    allowWhileIdle: true,
    repeatType: undefined,
    id: String(contact.id),
    userInfo: { 
      contactId: contact.id,
      notificationId: newId
    }
  });
  
  // Update the contact with the new reminder date
  try {
    const contactsJson = await AsyncStorage.getItem('contacts');
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];
    
    const updatedContacts = contacts.map((c: Contact) => 
      c.id === contact.id ? { ...c, nextReminder: nextReminderDate.toISOString() } : c
    );
    
    await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
    console.log(`📝 Updated contact's nextReminder date in storage`);
  } catch (error) {
    console.error('Error updating contact nextReminder:', error);
  }
  
  // Wait a moment before emitting the event
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if notifications are still in storage before emitting event
  const finalCheckJson = await AsyncStorage.getItem('notifications');
  console.log(`🔍 FINAL CHECK - Notifications before emitting event: ${finalCheckJson}`);
  
  // Emit event to refresh UI
  DeviceEventEmitter.emit('forceRefreshNotifications', {});
  
  // Check if notifications are still in storage after emitting event
  setTimeout(async () => {
    const afterEventJson = await AsyncStorage.getItem('notifications');
    console.log(`🔍 AFTER EVENT - Notifications after emitting event: ${afterEventJson}`);
  }, 1000);
  
  console.log('✅ Next notification scheduled for:', {
    contact: contact.name,
    scheduledFor: nextReminderDate.toLocaleString(),
    id: newId
  });
  
  return nextReminderDate;
};

export const debugStoredNotifications = async () => {
  try {
    const notificationsJson = await AsyncStorage.getItem('notifications');
    console.log('🔍 DEBUG - Raw notifications in storage:', notificationsJson);
    
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    console.log(`🔍 DEBUG - Total notifications in storage: ${notifications.length}`);
    
    notifications.forEach((n: StoredNotificationWithAction, index: number) => {
      console.log(`🔍 DEBUG - Notification ${index + 1}:`, {
        id: n.id,
        name: n.name,
        actioned: n.actioned,
        date: n.date
      });
    });
  } catch (e) {
    console.error('Error in debugStoredNotifications:', e);
  }
}; 