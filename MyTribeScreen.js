import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

const MyTribeScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [page, setPage] = useState(0);
  const contactsPerPage = 5;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadContacts();
    });

    return unsubscribe;
  }, [navigation]);

  const loadContacts = async () => {
    try {
      const contactsJson = await AsyncStorage.getItem('contacts');
      if (contactsJson) {
        // Sort contacts in descending order based on the ID (assuming ID is timestamp when added)
        const sortedContacts = JSON.parse(contactsJson).sort((a, b) => b.id - a.id);
        setContacts(sortedContacts);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const removeContact = async (id) => {
    try {
      const filteredContacts = contacts.filter(contact => contact.id !== id);
      await AsyncStorage.setItem('contacts', JSON.stringify(filteredContacts));
      setContacts(filteredContacts);
    } catch (e) {
      console.log(e);
    }
  };

  const handleAddContact = () => {
    if (contacts.length >= 10) {
      Alert.alert("You have reached the maximum of 10 contacts. You will need to remove a contact before adding more.");
    } else {
      navigation.navigate('AddContact');
    }
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text>Contact: {item.name}</Text>
        <Text>Frequency: {item.frequency}</Text>
        <Text>Last contacted: {item.lastContacted ? format(new Date(item.lastContacted), 'PP') : 'N/A'}</Text>
        <Text>Next reminder: {item.nextReminder ? format(new Date(item.nextReminder), 'PP') : 'N/A'}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => removeContact(item.id)}>
        <Text>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts.slice(page * contactsPerPage, (page + 1) * contactsPerPage)}
        keyExtractor={item => item.id.toString()}
        renderItem={renderContact}
        contentContainerStyle={{ alignItems: 'stretch' }}
      />
      <View style={styles.navigation}>
        <Button title="Prev" onPress={() => setPage(Math.max(0, page - 1))} disabled={page === 0} />
        <Button title="Next" onPress={() => setPage(page + 1)} disabled={contacts.length <= (page + 1) * contactsPerPage} />
      </View>
      <Button
        title="Add Contact"
        onPress={handleAddContact}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginVertical: 5,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  contactInfo: {
    flex: 1,
  },
  removeButton: {
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
});

export default MyTribeScreen;