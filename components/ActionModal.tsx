import React, { useState } from 'react';
import { 
  Modal, 
  StyleSheet, 
  View, 
  TouchableWithoutFeedback, 
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { CustomText as Text } from './CustomText';
import { useTheme } from '../src/ThemeContext';

type Props = {
  visible: boolean;
  action: 'contacted' | 'dismiss';
  onSubmit: (notes: string) => void;
  onDismiss: () => void;
};

const ActionModal = ({ visible, action, onSubmit, onDismiss }: Props): JSX.Element => {
  const { currentTheme } = useTheme();
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit(notes);
    setNotes('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={[styles.centeredView, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalView, { backgroundColor: currentTheme.colors.background }]}>
              <Text style={[styles.title, { color: currentTheme.colors.onSurface }]}>
                {action === 'contacted' ? "Hey, what did you discuss? " : "Oh no 🥺 why's that?"}
              </Text>
              <TextInput
                mode="outlined"
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter your notes here..."
                multiline={true}
                textAlignVertical="top"
                style={styles.input}
                numberOfLines={10}
                outlineColor={currentTheme.colors.outline}
                activeOutlineColor={currentTheme.colors.primary}
                textColor={currentTheme.colors.onSurface}
              />
              <View style={styles.buttons}>
                <Button 
                  mode="outlined" 
                  onPress={onDismiss}
                  textColor={currentTheme.colors.error}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit}
                  buttonColor={currentTheme.colors.primary}
                >
                  Save
                </Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    borderRadius: 8,
    padding: 24,
    width: '90%',
    elevation: 5,
    maxHeight: '80%', // Limit height to ensure it fits on screen with keyboard
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    minHeight: 120,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default ActionModal; 