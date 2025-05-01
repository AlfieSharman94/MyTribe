import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import remoteConfig from '@react-native-firebase/remote-config';
import { useTheme } from './src/ThemeContext';

const FirebaseTestScreen = () => {
  const [loading, setLoading] = useState(false);
  const [testValue, setTestValue] = useState<string | null>(null);
  const { currentTheme } = useTheme();

  const testRemoteConfig = async () => {
    setLoading(true);
    try {
      // Set minimum fetch interval to 0 for testing
      await remoteConfig().setConfigSettings({
        minimumFetchIntervalMillis: 0,
      });

      // Fetch and activate
      await remoteConfig().fetchAndActivate();
      
      // Get a test value
      const value = remoteConfig().getValue('test_key');
      setTestValue(value.asString());
      
      Alert.alert('Success', 'Firebase Remote Config is working!');
    } catch (error) {
      console.error('Remote Config error:', error);
      Alert.alert('Error', 'Failed to fetch remote config. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      <Text style={[styles.title, { color: currentTheme.colors.onSurface }]}>
        Firebase Test
      </Text>
      
      <Button
        mode="contained"
        onPress={testRemoteConfig}
        loading={loading}
        style={styles.button}
      >
        Test Remote Config
      </Button>
      
      {testValue && (
        <Text style={[styles.result, { color: currentTheme.colors.onSurface }]}>
          Test Value: {testValue}
        </Text>
      )}
      
      {loading && <ActivityIndicator style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
  result: {
    marginTop: 20,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});

export default FirebaseTestScreen; 