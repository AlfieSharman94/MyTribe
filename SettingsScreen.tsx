import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Linking } from 'react-native';
import { List, Switch, Surface, Button } from 'react-native-paper';
import { TimePickerModal } from 'react-native-paper-dates';
import { useTheme } from './src/ThemeContext';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from './types/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enGB, registerTranslation } from 'react-native-paper-dates';
import { useNavigation } from '@react-navigation/native';

// Register the locale at the top level, after imports
registerTranslation('en-GB', enGB);

// Add this near the top of the file, after imports
const SHOW_DEBUG_BUTTON = false; // Set to false to hide the button

type Props = StackScreenProps<RootStackParamList, 'Settings'>;

const parseTimeString = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const SettingsScreen = ({ navigation }: Props): JSX.Element => {
  const { isDarkMode, toggleTheme, currentTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('19:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
    loadTimeSettings();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.checkPermissions((permissions) => {
          setNotificationsEnabled(!!permissions.alert);
        });
      } else {
        // For Android, check if the channel exists as a proxy for permissions
        PushNotification.channelExists('tribe-reminders', (exists) => {
          setNotificationsEnabled(exists);
        });
      }
    } catch (e) {
      console.error('Error checking notification permissions:', e);
      setNotificationsEnabled(false);
    }
  };

  const handleNotificationToggle = () => {
    if (!notificationsEnabled) {
      Linking.openSettings();
    }
    // Re-check permissions after toggling
    setTimeout(checkNotificationPermission, 1000);
  };

  const loadTimeSettings = async () => {
    try {
      const start = await AsyncStorage.getItem('notificationStartTime');
      const end = await AsyncStorage.getItem('notificationEndTime');
      if (start) setStartTime(start);
      if (end) setEndTime(end);
    } catch (e) {
      console.error('Error loading time settings:', e);
    }
  };

  const saveTimeSettings = async (start: string, end: string) => {
    try {
      await AsyncStorage.setItem('notificationStartTime', start);
      await AsyncStorage.setItem('notificationEndTime', end);
    } catch (e) {
      console.error('Error saving time settings:', e);
    }
  };

  const openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      // For iOS, we need to open the app settings
      Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      // For Android, we can open the app notification settings directly
      Linking.openSettings();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      <View style={styles.surfaceWrapper}>
        <Surface style={[styles.surface, { backgroundColor: currentTheme.colors.background }]}>
          <List.Item
            title="Dark Mode"
            description="Toggle dark mode theme"
            left={() => (
              <Icon 
                name={isDarkMode ? "moon" : "moon-outline"}
                size={24}
                color={currentTheme.colors.onSurface}
                style={{ marginLeft: 8, marginRight: 8 }}
              />
            )}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                color={currentTheme.colors.primary}
              />
            )}
          />
          <List.Item
            title="Push Notifications"
            description="Turn on to receive reminders"
            onPress={handleNotificationToggle}
            left={props => (
              <Icon 
                name={notificationsEnabled ? "notifications-outline" : "notifications-off-outline"}
                size={24}
                color={currentTheme.colors.onSurface}
                style={{ marginLeft: 8, marginRight: 8 }}
              />
            )}
            right={props => (
              <Switch 
                value={notificationsEnabled} 
                onValueChange={() => {
                  // Open the native settings
                  openNotificationSettings();
                }}
              />
            )}
          />
          <List.Item
            title="Notification Time Window"
            description={`${startTime} - ${endTime}`}
            left={props => (
              <Icon 
                name="time-outline"
                size={24}
                color={currentTheme.colors.onSurface}
                style={{ marginLeft: 8, marginRight: 8 }}
              />
            )}
          />
          <View style={styles.timeButtons}>
            <Button 
              onPress={() => setShowStartPicker(true)}
              mode="text"
            >
              Set Start Time
            </Button>
            <Button 
              onPress={() => setShowEndPicker(true)}
              mode="text"
            >
              Set End Time
            </Button>
          </View>
          
          {/* Conditionally render the Debug Storage button */}
          {SHOW_DEBUG_BUTTON && (
            <Button 
              mode="outlined"
              onPress={() => navigation.navigate('StorageDebug')}
            >
              Debug Storage
            </Button>
          )}
        </Surface>
      </View>
      <TimePickerModal
        visible={showStartPicker}
        onDismiss={() => setShowStartPicker(false)}
        onConfirm={({ hours, minutes }) => {
          const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          setStartTime(timeString);
          saveTimeSettings(timeString, endTime);
          setShowStartPicker(false);
        }}
        hours={parseInt(startTime.split(':')[0])}
        minutes={parseInt(startTime.split(':')[1])}
        locale="en-GB"
      />
      <TimePickerModal
        visible={showEndPicker}
        onDismiss={() => setShowEndPicker(false)}
        onConfirm={({ hours, minutes }) => {
          const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          setEndTime(timeString);
          saveTimeSettings(startTime, timeString);
          setShowEndPicker(false);
        }}
        hours={parseInt(endTime.split(':')[0])}
        minutes={parseInt(endTime.split(':')[1])}
        locale="en-GB"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  surfaceWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  surface: {
    borderRadius: 8,
  },
  timeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
});

export default SettingsScreen; 