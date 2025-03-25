import React, { useState } from 'react';
import { View, Modal, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useTheme } from './src/ThemeContext';
import { CustomText as Text } from './components/CustomText';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  action: 'contacted' | 'dismiss';
};

const ActionModal = ({ visible, onClose, onSubmit, action }: Props) => {
  const [notes, setNotes] = useState('');
  const { currentTheme } = useTheme();

  const handleSubmit = () => {
    onSubmit(notes);
    setNotes('');
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <SafeAreaView style={styles.safeArea}>
          <View 
            style={[
              styles.modalView, 
              { backgroundColor: currentTheme.colors.background }
            ]}
          >
            <View style={styles.contentContainer}>
              <Text style={[styles.title, { color: currentTheme.colors.onSurface }]}>
                {action === 'contacted' ? 'Add notes about the contact' : 'Oh no 🥺 Why are you dismissing?'}
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  mode="outlined"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Enter your notes here..."
                  multiline={true}
                  textAlignVertical="top"
                  style={styles.input}
                  outlineColor={currentTheme.colors.outline}
                  activeOutlineColor={currentTheme.colors.primary}
                  textColor={currentTheme.colors.onSurface}
                />
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  textColor={currentTheme.colors.error}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  buttonColor={currentTheme.colors.primary}
                  textColor={currentTheme.colors.onPrimary}
                >
                  Submit
                </Button>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
  },
  modalView: {
    flex: 1,
    margin: 0,
    borderRadius: 8,
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    marginVertical: 20,
  },
  input: {
    flex: 1,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default ActionModal; 