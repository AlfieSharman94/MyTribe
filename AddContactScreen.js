import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, Button, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddContactScreen = ({ navigation }) => {
  const [contactName, setContactName] = useState('');
  // Initialize contactFrequency with '1' for "1-3 days"
  const [contactFrequency, setContactFrequency] = useState('1');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setContactName('');
      // Reset to the default frequency each time the screen is focused
      setContactFrequency('1');
    });

    return unsubscribe;
  }, [navigation]);

  const calculateNextReminder = (frequency) => {
    const today = new Date();
    switch (frequency) {
      case '1':
        return new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 3) + 1));
      case '2':
        return new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 5) + 3));
      case '3':
        return new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 7) + 7));
      case '4':
        return new Date(today.setDate(today.getDate() + Math.floor(Math.random() * 14) + 14));
      default:
        return new Date();
    }
  };

  const saveContact = async () => {
    if (!contactName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const nextReminder = calculateNextReminder(contactFrequency);

    const newContact = {
      id: Date.now(),
      name: contactName,
      frequency: contactFrequency,
      nextReminder: nextReminder.toISOString(),
    };

    try {
      const existingContactsJson = await AsyncStorage.getItem('contacts');
      const existingContacts = existingContactsJson ? JSON.parse(existingContactsJson) : [];
      const updatedContacts = [...existingContacts, newContact];
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
      navigation.navigate('MyTribe'); // Navigate to "MyTribe" on success
    } catch (e) {
      Alert.alert('Error', 'Failed to save the contact');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Contact Name</Text>
      <TextInput
        placeholder="Contact name"
        value={contactName}
        onChangeText={setContactName}
        style={styles.input}
      />
      <Text>How often would you like to keep in touch?</Text>
      <Picker
        selectedValue={contactFrequency}
        onValueChange={(itemValue) => setContactFrequency(itemValue)}
        style={styles.picker}>
        <Picker.Item label="1-3 days" value="1" />
        <Picker.Item label="3-7 days" value="2" />
        <Picker.Item label="7-14 days" value="3" />
        <Picker.Item label="14-28 days" value="4" />
      </Picker>
      <Button title="Save" onPress={saveContact} />
      <Button title="Cancel" onPress={() => navigation.navigate('MyTribe')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    marginVertical: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
  picker: {
    width: '100%',
    marginVertical: 8,
  },
});

export default AddContactScreen;