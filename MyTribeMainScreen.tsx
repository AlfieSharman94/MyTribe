import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateNotificationBadge, markNotificationActioned, forceSyncBadge } from './notification';
import { View } from 'react-native';

const MyTribeMainScreen = () => {
  const navigation = useNavigation();

  const loadNotifications = async () => {
    const notificationsJson = await AsyncStorage.getItem('notifications');
    const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    return notifications;
  };

  const updateBadgeCount = async () => {
    const notifications = await loadNotifications();
    const unreadCount = notifications.length; // Assuming all are unread
    PushNotification.setApplicationIconBadgeNumber(unreadCount);
  };

  const clearNotifications = async () => {
    await AsyncStorage.removeItem('notifications');
    PushNotification.setApplicationIconBadgeNumber(0);
  };

  useEffect(() => {
    // Initial badge sync
    forceSyncBadge();

    const unsubscribe = navigation.addListener('focus', () => {
      forceSyncBadge();
    });

    // Cleanup function
    return () => {
      unsubscribe();
      // Force badge reset when component unmounts if no notifications
      AsyncStorage.getItem('notifications').then(notificationsJson => {
        const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
        if (notifications.length === 0) {
          PushNotification.setApplicationIconBadgeNumber(0);
        }
      });
    };
  }, [navigation]);

  // When handling notification actions (Contacted/Dismissed)
  const handleNotificationAction = async (notificationId: number, action: 'contacted' | 'dismiss') => {
    await markNotificationActioned(notificationId);
    // ... rest of your action handling code ...
  };

  return (
    <View>
      {/* Component content */}
    </View>
  );
};

export default MyTribeMainScreen; 