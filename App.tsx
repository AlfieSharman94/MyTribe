import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, useColorScheme, View, Alert, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import HomeScreen from './HomeScreen'; // Adjust the path as necessary
import MyTribeScreen from './MyTribeScreen'; // Adjust the path as necessary
import AddContactScreen from './AddContactScreen'; // Adjust the path as necessary
import PushNotification from 'react-native-push-notification'; // Import PushNotification
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Colors } from 'react-native/Libraries/NewAppScreen';

const MyTribeStack = createStackNavigator();

function MyTribeStackNavigator() {
  return (
    <MyTribeStack.Navigator>
      <MyTribeStack.Screen name="MyTribe" component={MyTribeScreen} />
      <MyTribeStack.Screen name="AddContact" component={AddContactScreen} options={{ headerTitle: 'Add Contact' }} />
    </MyTribeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Push Notification Configuration
    PushNotification.configure({
      // (Optional) Called when Token is generated (iOS and Android)
      onRegister: function(token) {
        console.log('TOKEN:', token);
      },

      // (Required) Called when a remote or local notification is opened or received
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
        // Process the notification
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // (optional) Default: true - Specifies whether permissions will be requested
      requestPermissions: true,
    });
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}> {/* Wrap the entire app in GestureHandlerRootView */}
      <SafeAreaView style={[styles.safeAreaView, backgroundStyle]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="MyTribe" component={MyTribeStackNavigator} />
            {/* The AddContact tab has been removed and is now part of the MyTribe stack */}
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});

export default App;