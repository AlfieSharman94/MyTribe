import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Button, Text, Surface, Appbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './src/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const StorageDebugScreen = () => {
  const [storageData, setStorageData] = useState<{ [key: string]: any }>({});
  const { currentTheme } = useTheme();
  const navigation = useNavigation();

  const loadStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result: { [key: string]: any } = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        try {
          result[key] = JSON.parse(value || '');
        } catch {
          result[key] = value;
        }
      }
      
      setStorageData(result);
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentTheme.colors.background,
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 16,
      padding: 16,
      borderRadius: 8,
      backgroundColor: currentTheme.colors.surface,
    },
    key: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentTheme.colors.primary,
      marginBottom: 8,
    },
    value: {
      color: currentTheme.colors.onSurface,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Storage Debug" />
        <Appbar.Action icon="refresh" onPress={loadStorageData} />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        {Object.entries(storageData).map(([key, value]) => (
          <Surface key={key} style={styles.section} elevation={1}>
            <Text style={styles.key}>{key}</Text>
            <Text style={styles.value}>
              {typeof value === 'object' 
                ? JSON.stringify(value, null, 2)
                : String(value)
              }
            </Text>
          </Surface>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default StorageDebugScreen; 