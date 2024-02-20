import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Adjust the import path as necessary to match your project structure
import { generateNotification, storeNotification } from './notification';

const HomeScreen = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    checkForReminders();
    loadNotifications();
  }, []);

  const checkForReminders = async () => {
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      const contacts = contactsJson ? JSON.parse(contactsJson) : [];
      const today = new Date();

      // Check each contact for due reminders and generate notifications
      contacts.forEach(async (contact) => {
        if (new Date(contact.nextReminder) <= today) {
          const notification = generateNotification(contact);
          await storeNotification(notification);
        }
      });

      // Reload notifications after potentially adding new ones
      loadNotifications();
    } catch (e) {
      Alert.alert('Error', 'Failed to check reminders');
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      setNotifications(storedNotifications ? JSON.parse(storedNotifications) : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load notifications');
      console.error(e);
    }
  };

  const handleNotificationAction = async (id, action) => {
    const updatedNotifications = notifications.map(notification => {
      if (notification.id === id) {
        return { ...notification, action: action };
      }
      return notification;
    });
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    setNotifications(updatedNotifications);
  };

  const renderNotification = ({ item }) => (
    <View style={styles.notificationItem}>
      <Text>Contact: {item.name}</Text>
      <Text>Notification date: {item.date}</Text>
      <View style={styles.buttons}>
        <Button title="Contacted" onPress={() => handleNotificationAction(item.id, 'contacted')} />
        <Button title="Dismiss" onPress={() => handleNotificationAction(item.id, 'dismiss')} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderNotification}
        />
      ) : (
        <Text>You are all up-to-date :)</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%', // Ensure full width usage
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});

export default HomeScreen;