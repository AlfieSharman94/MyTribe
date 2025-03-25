import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Button, TextInput, useTheme as usePaperTheme } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomText as Text } from './components/CustomText';
import { StackScreenProps } from '@react-navigation/stack';
import { Surface } from 'react-native-paper';
import { useTheme } from './src/ThemeContext';
import type { MyTribeStackParamList } from './types/navigation';
import { FrequencyOption } from './types/frequency';
import { calculateNextReminder, scheduleLocalNotification } from './notification';
import { RadioButton } from 'react-native-paper';
const { Android: RadioButtonAndroid } = RadioButton;

type Props = StackScreenProps<MyTribeStackParamList, 'AddContact'>;

const RANDOM_FREQUENCIES = [
  { id: 'r0', label: 'Every 5 minutes (Testing)' },
  { id: 'r1', label: '1-3 days' },
  { id: 'r2', label: '3-7 days' },
  { id: 'r3', label: '7-14 days' },
  { id: 'r4', label: '14-28 days' },
];

const WEEKDAYS = [
  { id: '0', label: 'Sunday' },
  { id: '1', label: 'Monday' },
  { id: '2', label: 'Tuesday' },
  { id: '3', label: 'Wednesday' },
  { id: '4', label: 'Thursday' },
  { id: '5', label: 'Friday' },
  { id: '6', label: 'Saturday' },
];

const AddContactScreen = ({ navigation }: Props): JSX.Element => {
  const { currentTheme } = useTheme();
  const paperTheme = usePaperTheme();
  const [contactName, setContactName] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [interval, setInterval] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly');
  const [frequencyType, setFrequencyType] = useState<'random' | 'weekday'>('random');
  const [randomFrequency, setRandomFrequency] = useState('r1');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setContactName('');
      setSelectedDay(null);
      setInterval('weekly');
      setFrequencyType('random');
      setRandomFrequency('r1');
    });

    return unsubscribe;
  }, [navigation]);

  const getFrequencyId = () => {
    if (frequencyType === 'random') {
      return randomFrequency;
    }
    return selectedDay ? `w${selectedDay}_${interval}` : randomFrequency;
  };

  const saveContact = async () => {
    if (!contactName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const nextReminder = await calculateNextReminder(getFrequencyId());

      const newContact = {
        id: Date.now(),
        name: contactName,
        frequency: getFrequencyId(),
        nextReminder: nextReminder.toISOString(),
        paused: false
      };

      const existingContactsJson = await AsyncStorage.getItem('contacts');
      const existingContacts = existingContactsJson ? JSON.parse(existingContactsJson) : [];
      const updatedContacts = [...existingContacts, newContact];
      await AsyncStorage.setItem('contacts', JSON.stringify(updatedContacts));
      console.log('📝 New contact created:', {
        name: contactName,
        frequency: getFrequencyId(),
        nextReminder: nextReminder.toLocaleString()
      });
      await scheduleLocalNotification(newContact);
      console.log('🔔 Initial reminder scheduled for new contact:', contactName);
      navigation.navigate('MyTribeMain');
    } catch (e) {
      Alert.alert('Error', 'Failed to save the contact');
      console.error(e);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      <Surface style={[styles.formContainer, { backgroundColor: currentTheme.colors.background }]} elevation={1}>
        <Text style={[styles.header, { color: currentTheme.colors.onSurface }]}>
          Add New Contact
        </Text>
        <TextInput
          mode="outlined"
          placeholder="Contact name"
          value={contactName}
          onChangeText={setContactName}
          style={styles.input}
          outlineColor={currentTheme.colors.outline}
          activeOutlineColor={currentTheme.colors.primary}
          textColor={currentTheme.colors.onSurface}
          accessible={true}
          accessibilityLabel="Contact name input"
          accessibilityHint="Enter the name of your contact"
        />
        <Text style={[styles.pickerLabel, { color: currentTheme.colors.onSurface }]}>
          How would you like to keep in touch?
        </Text>
        
        <RadioButton.Group onValueChange={value => {
          setFrequencyType(value as 'random' | 'weekday');
          setSelectedDay(null);
        }} value={frequencyType}>
          <TouchableOpacity 
            onPress={() => setFrequencyType('random')}
            style={styles.radioOption}
          >
            <RadioButtonAndroid
              value="random"
              status={frequencyType === 'random' ? 'checked' : 'unchecked'}
              color={currentTheme.colors.primary}
              uncheckedColor={currentTheme.colors.onSurface}
            />
            <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
              Random intervals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setFrequencyType('weekday')}
            style={styles.radioOption}
          >
            <RadioButtonAndroid
              value="weekday"
              status={frequencyType === 'weekday' ? 'checked' : 'unchecked'}
              color={currentTheme.colors.primary}
              uncheckedColor={currentTheme.colors.onSurface}
            />
            <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
              Specific day
            </Text>
          </TouchableOpacity>
        </RadioButton.Group>

        {frequencyType === 'random' ? (
          <Picker
            selectedValue={randomFrequency}
            onValueChange={setRandomFrequency}
            style={{ color: currentTheme.colors.onSurface }}
            dropdownIconColor={currentTheme.colors.onSurface}
          >
            {RANDOM_FREQUENCIES.map(freq => (
              <Picker.Item 
                key={freq.id} 
                label={freq.label} 
                value={freq.id}
                color={currentTheme.colors.onSurface}
              />
            ))}
          </Picker>
        ) : (
          <>
            <Picker
              selectedValue={selectedDay}
              onValueChange={setSelectedDay}
              style={{ color: currentTheme.colors.onSurface }}
              dropdownIconColor={currentTheme.colors.onSurface}
            >
              <Picker.Item 
                label="Select a day" 
                value={null}
                color={currentTheme.colors.onSurface}
              />
              {WEEKDAYS.map(day => (
                <Picker.Item 
                  key={day.id} 
                  label={day.label} 
                  value={day.id}
                  color={currentTheme.colors.onSurface}
                />
              ))}
            </Picker>

            {selectedDay && (
              <RadioButton.Group onValueChange={value => setInterval(value as typeof interval)} value={interval}>
                <View style={styles.intervalOptions}>
                  {['weekly', 'fortnightly', 'monthly'].map((int) => (
                    <TouchableOpacity 
                      key={int} 
                      onPress={() => setInterval(int as typeof interval)}
                      style={styles.radioOption}
                    >
                      <RadioButtonAndroid
                        value={int}
                        status={interval === int ? 'checked' : 'unchecked'}
                        color={currentTheme.colors.primary}
                        uncheckedColor={currentTheme.colors.onSurface}
                      />
                      <Text style={[styles.radioLabel, { color: currentTheme.colors.onSurface }]}>
                        {int.charAt(0).toUpperCase() + int.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </RadioButton.Group>
            )}
          </>
        )}

        <Button 
          mode="contained"
          onPress={saveContact}
          style={styles.button}
          buttonColor={currentTheme.colors.primary}
          textColor={currentTheme.colors.onPrimary}
          accessibilityLabel="Save contact"
        >
          Save
        </Button>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  input: {
    marginVertical: 4,
  },
  picker: {
    marginVertical: 4,
    marginTop: 0,
  },
  button: {
    marginTop: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pickerLabel: {
    marginBottom: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  intervalOptions: {
    marginTop: 8,
    marginBottom: 16,
  },
});

export default AddContactScreen; 