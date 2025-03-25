import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Alert,
  Image,
  Platform,
  LogBox,
  Linking,
  DeviceEventEmitter,
  AppState,
} from 'react-native';
import {NavigationContainer, useNavigation, createNavigationContainerRef} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {GestureHandlerRootView} from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import HomeScreen from './HomeScreen'; // Adjust the path as necessary
import MyTribeScreen from './MyTribeScreen'; // Adjust the path as necessary
import AddContactScreen from './AddContactScreen'; // Adjust the path as necessary
import PushNotification from 'react-native-push-notification'; // Import PushNotification
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import Icon from 'react-native-vector-icons/Ionicons'; // Add this import at the top
import ContactDetailScreen from './ContactDetailScreen';  // Change to default import
import { PaperProvider } from 'react-native-paper';
import { theme, darkTheme } from './src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import SettingsScreen from './SettingsScreen';
import { Appbar } from 'react-native-paper';
import type { RootStackParamList, TabParamList, MyTribeStackParamList } from './types/navigation';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';  // Change this import
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { scheduleNextNotification } from './notification';
import type { Contact } from './types/frequency';
import StorageDebugScreen from './StorageDebugScreen';
import firebase from '@react-native-firebase/app';

LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const MyTribeStack = createStackNavigator<MyTribeStackParamList>();

// Add this at the top of your file, after imports
const NAVIGATE_TO_HOME_EVENT = 'navigateToHomeScreen';
let shouldNavigateToHome = false;

// Create a navigation reference that can be used anywhere
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Function to navigate to home screen from anywhere
export function navigateToHome() {
  if (navigationRef.isReady()) {
    // Reset to MainTabs
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    
    // Wait a bit then navigate to Home tab
    setTimeout(() => {
      // This is a hack but it works reliably
      navigationRef.dispatch({
        type: 'NAVIGATE',
        payload: {
          name: 'MainTabs',
          params: {
            screen: 'Home',
          },
        },
      });
    }, 100);
  }
}

function MyTribeStackNavigator() {
  const { currentTheme } = useTheme();
  
  return (
    <MyTribeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.colors.surface,
          height: 56,  // Standardize height
        },
        headerLeftContainerStyle: {
          paddingLeft: 16,  // Standardize padding
        },
        headerRightContainerStyle: {
          paddingRight: 16,  // Standardize padding
        },
        headerTitleStyle: {
          fontSize: 18,  // Increased from 14
        },
      }}
    >
      <MyTribeStack.Screen 
        name="MyTribeMain"
        component={MyTribeScreen}
        options={{ 
          headerTitle: "My Tribe",
          headerStyle: {
            backgroundColor: currentTheme.colors.surface,
          },
          headerTintColor: currentTheme.colors.onSurface,
          headerTitleStyle: {
            fontSize: 18,
          },
        }}
      />
      <MyTribeStack.Screen
        name="AddContact"
        component={AddContactScreen}
        options={({ navigation }) => ({
          headerTitle: 'New Member',
          headerStyle: {
            backgroundColor: currentTheme.colors.surface,
            height: 112,
          },
          headerLeft: () => (
            <Icon 
              name="arrow-back"
              size={24}
              color={currentTheme.colors.primary}
              style={{ marginLeft: 16 }}
              onPress={() => navigation.goBack()}
            />
          ),
          headerTitleStyle: {
            fontSize: 18,
            color: currentTheme.colors.onSurface,
          },
        })}
      />
      <MyTribeStack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={({ navigation }) => ({
          headerTitle: 'Contact Details',
          headerStyle: {
            backgroundColor: currentTheme.colors.surface,
            height: 112,
          },
          headerLeft: () => (
            <Icon 
              name="arrow-back"
              size={24}
              color={currentTheme.colors.primary}
              style={{ marginLeft: 16 }}
              onPress={() => navigation.goBack()}
            />
          ),
          headerTitleStyle: {
            fontSize: 18,
            color: currentTheme.colors.onSurface,
          },
        })}
      />
    </MyTribeStack.Navigator>
  );
}

// Add this state to the TabNavigator component
const TabNavigator = () => {
  const { currentTheme } = useTheme();
  const [unactionedCount, setUnactionedCount] = useState(0);
  
  // Add this effect to listen for notification changes
  useEffect(() => {
    const checkUnactionedNotifications = async () => {
      try {
        const notificationsJson = await AsyncStorage.getItem('notifications');
        const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];
        
        // Count unactioned notifications whose date has passed
        const now = new Date();
        const dueNotifications = notifications.filter((n: StoredNotification) => 
          n.actioned === false && new Date(n.date) <= now
        );
        
        setUnactionedCount(dueNotifications.length);
      } catch (error) {
        console.error('Error checking unactioned notifications:', error);
      }
    };
    
    // Check on mount
    checkUnactionedNotifications();
    
    // Listen for notification refresh events
    const refreshSubscription = DeviceEventEmitter.addListener(
      'refreshNotifications',
      checkUnactionedNotifications
    );
    
    return () => refreshSubscription.remove();
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'help-outline'; // Default icon
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyTribe') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: currentTheme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: currentTheme.colors.surface,
          borderTopColor: currentTheme.colors.outline,
        },
        tabBarLabelStyle: {
          fontSize: 14,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={({ navigation }) => ({
          headerTitle: "Home",
          headerShown: true, // Restore header
          headerStyle: {
            backgroundColor: currentTheme.colors.surface,
            height: 112,
          },
          headerTitleStyle: {
            fontSize: 18,
            color: currentTheme.colors.onSurface,
          },
          headerRight: () => (
            <Icon 
              name="cog-outline"
              size={24}
              color={currentTheme.colors.onSurface}
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('Settings')}
            />
          ),
          tabBarBadge: unactionedCount > 0 ? unactionedCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: currentTheme.colors.error,
          },
        })}
      />
      <Tab.Screen 
        name="MyTribe" 
        component={MyTribeStackNavigator} 
        options={{
          headerShown: false,
          tabBarLabel: 'My Tribe',  // This is what shows in the tab bar
        }}
      />
    </Tab.Navigator>
  );
};

// Add type for StoredNotification
type StoredNotification = {
  id: number;
  name: string;
  date: string;
  frequency: string;
  lastContacted: string | null;
  actioned: boolean;
  paused: boolean;
};

const App = () => {
  // Add this to your App component
  const linking = {
    prefixes: ['myapp://'], // Your app's deep link prefix
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: 'home',
            MyTribe: 'tribe',
            Settings: 'settings',
          },
        },
      },
    },
  };

  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <AppContent />
      </NavigationContainer>
    </ThemeProvider>
  );
};

const AppContent = () => {
  const { currentTheme, isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const loadThemePreference = async () => {
      const savedMode = await AsyncStorage.getItem('darkMode');
      if (savedMode !== null) {
        toggleTheme(); // Use toggleTheme instead of calling isDarkMode
      }
    };
    loadThemePreference();
  }, []);

  useEffect(() => {
    // First, let's clear any existing notification configuration
    PushNotification.unregister();
    
    // Then reconfigure with a simpler setup
    PushNotification.configure({
      // When a notification is opened or received
      onNotification: function(notification) {
        console.log('NOTIFICATION RECEIVED:', notification);
        
        // If the user tapped on the notification
        if (notification.userInteraction) {
          console.log('USER TAPPED NOTIFICATION - DIRECT NAVIGATION');
          
          // Store a flag in AsyncStorage that we want to navigate to Home
          AsyncStorage.setItem('directNavigateToHome', 'true').then(() => {
            console.log('Set direct navigation flag');
            
            // Force app to foreground if needed
            if (Platform.OS === 'android') {
              // For Android, we can use the current activity
              PushNotification.localNotification({
                title: 'Navigating...',
                message: 'Taking you to your reminders',
                playSound: false,
                ongoing: false,
                autoCancel: true,
              });
            }
            
            // Try direct navigation
            try {
              // Use the most direct approach possible
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            } catch (error) {
              console.error('Initial navigation error:', error);
            }
          });
        }
        
        // Required on iOS only
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },
      
      // Other configuration options
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios'
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel({
        channelId: 'tribe-reminders',
        channelName: 'Tribe Reminders',
        channelDescription: 'Reminders to contact your tribe members',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      }, (created) => console.log(`Channel created: ${created}`));
    }
  }, [navigation]);

  // Add this effect to check for the navigation flag in storage
  useEffect(() => {
    const checkNavigationFlag = async () => {
      try {
        const shouldNavigate = await AsyncStorage.getItem('navigateToHome');
        if (shouldNavigate === 'true') {
          console.log('Found navigation flag in storage');
          
          // Clear the flag
          await AsyncStorage.setItem('navigateToHome', 'false');
          
          // Navigate to Home
          setTimeout(() => {
            console.log('Navigating to Home based on storage flag');
            navigation.navigate('MainTabs');
            // @ts-ignore
            navigation.navigate('MainTabs', { screen: 'Home' });
          }, 500);
        }
      } catch (error) {
        console.error('Error checking navigation flag:', error);
      }
    };
    
    // Check on mount and when the app comes to foreground
    checkNavigationFlag();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkNavigationFlag();
      }
    });
    
    return () => subscription.remove();
  }, [navigation]);

  // Add this effect to AppContent
  useEffect(() => {
    // Check for direct navigation flag
    const checkDirectNavigationFlag = async () => {
      try {
        const shouldNavigate = await AsyncStorage.getItem('directNavigateToHome');
        if (shouldNavigate === 'true') {
          console.log('🏠 Found direct navigation flag');
          
          // Clear the flag
          await AsyncStorage.setItem('directNavigateToHome', 'false');
          
          // Wait for navigation to be ready
          setTimeout(() => {
            console.log('🏠 Executing direct navigation to Home');
            
            // Try multiple approaches
            try {
              // First reset to MainTabs
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
              
              // Then try to navigate to Home tab
              setTimeout(() => {
                try {
                  // @ts-ignore - Using any to bypass type checking
                  navigation.navigate('MainTabs', { screen: 'Home' });
                  
                  // Also try this approach
                  if (navigation.canGoBack()) {
                    navigation.popToTop();
                  }
                  
                  // Force refresh notifications
                  DeviceEventEmitter.emit('refreshNotifications');
                } catch (innerError) {
                  console.error('Inner navigation error:', innerError);
                }
              }, 500);
            } catch (error) {
              console.error('Navigation error:', error);
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error checking direct navigation flag:', error);
      }
    };
    
    // Check on mount
    checkDirectNavigationFlag();
    
    // Also check when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkDirectNavigationFlag();
      }
    });
    
    return () => subscription.remove();
  }, [navigation]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  // Add this console log
  console.log('AppContent theme:', {
    isDark: isDarkMode,
    background: currentTheme.colors.background,
    surface: currentTheme.colors.surface
  });

  const handleNotificationTrigger = async (notification: any) => {
    console.log('📱 Notification triggered:', notification);
    
    // Handle notification when app is in background
    if (notification.userInteraction) {
      console.log('User tapped notification - navigating to Home');
      navigateToHome();
    }
    
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
    
    // Create and store notification entry
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
    
    const isDuplicate = notifications.some((n: any) => n.id === notificationEntry.id);
    if (!isDuplicate) {
      notifications.push(notificationEntry);
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
    }
    
    // Refresh UI
    DeviceEventEmitter.emit('forceRefreshNotifications', {});
  };

  // Add this function to App.tsx
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
      console.log(`App startup - Resetting badge count to ${badgeCount}`);
      
      if (Platform.OS === 'ios') {
        PushNotificationIOS.setApplicationIconBadgeNumber(badgeCount);
      }
      PushNotification.setApplicationIconBadgeNumber(badgeCount);
    } catch (error) {
      console.error('Error resetting badge count:', error);
    }
  };

  // Add this to your App component
  useEffect(() => {
    // Reset badge count when app starts
    resetBadgeCount();
    
    // Also reset badge count when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('App came to foreground - updating badge count');
        resetBadgeCount();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Check if Firebase is initialized
    if (firebase.apps.length === 0) {
      console.log('Firebase should be initialized by native code');
    }
    console.log('Firebase Apps:', firebase.apps.length);
  }, []);

  return (
    <PaperProvider theme={currentTheme}>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaViewContext 
          style={{ 
            flex: 1, 
            backgroundColor: currentTheme.colors.surface,
            paddingTop: Platform.OS === 'ios' ? 0 : 0,  // Remove top padding
          }}
          edges={[]}  // Remove all edge protection
        >
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={currentTheme.colors.background}
          />
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                height: 56,
                backgroundColor: currentTheme.colors.surface,
              },
              headerTitleStyle: {
                fontSize: 18,  // Increased from 14
              },
              headerTintColor: currentTheme.colors.onSurface,
              cardStyle: {
                backgroundColor: currentTheme.colors.surface,
              }
            }}
          >
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{ 
                headerShown: false,
                title: 'Home',  // This changes what's displayed
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={({ navigation }) => ({
                headerTitle: 'Settings',
                headerStyle: {
                  backgroundColor: currentTheme.colors.surface,
                  height: 112, // Match the height of other headers
                },
                headerTitleStyle: {
                  fontSize: 18,
                  color: currentTheme.colors.onSurface,
                },
                headerLeft: () => (
                  <Icon 
                    name="arrow-back"
                    size={24}
                    color={currentTheme.colors.primary}
                    style={{ marginLeft: 16 }}
                    onPress={() => navigation.goBack()}
                  />
                ),
              })}
            />
            <Stack.Screen 
              name="StorageDebug" 
              component={StorageDebugScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </SafeAreaViewContext>
      </GestureHandlerRootView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});

export default App;
