// notifications.js

import AsyncStorage from '@react-native-async-storage/async-storage';

export const generateNotification = (contact) => ({
  id: Date.now().toString(),
  name: contact.name,
  date: new Date().toISOString(),
  status: 'pending',
});

export const storeNotification = async (notification) => {
  try {
    const storedNotifications = await AsyncStorage.getItem('notifications');
    const notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    notifications.push(notification);
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to store notification', e);
  }
};
