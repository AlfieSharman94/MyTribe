import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useTheme } from './src/ThemeContext';
import remoteConfig from '@react-native-firebase/remote-config';

interface PromotionMessageProps {
  onDismiss: () => void;
}

interface DisplayWindow {
  start: string;
  end: string;
}

interface PromotionConfig {
  messageTitle: string;
  primaryCopy: string;
  ctaCopy: string;
  ctaLink: string | null;
  ctaWebLink: boolean;
  isForceMessage: boolean;
  msgNumber: number;
  forceReplace: boolean;
  displayWindow: DisplayWindow;
}

const PromotionMessage: React.FC<PromotionMessageProps> = ({ onDismiss }) => {
  const { currentTheme } = useTheme();
  const [showMessage, setShowMessage] = useState(false);
  const [config, setConfig] = useState<PromotionConfig | null>(null);

  useEffect(() => {
    const initializeRemoteConfig = async () => {
      try {
        // Set minimum fetch interval to 0 for testing
        await remoteConfig().setConfigSettings({
          minimumFetchIntervalMillis: 0,
        });

        // Fetch and activate
        await remoteConfig().fetchAndActivate();
        
        // Get promotion config
        const configString = remoteConfig().getValue('promotion_config').asString();
        const promotionConfig: PromotionConfig = JSON.parse(configString);
        
        // Check if message should be shown based on display window
        const now = new Date();
        const startDate = new Date(promotionConfig.displayWindow.start);
        const endDate = new Date(promotionConfig.displayWindow.end);
        
        if (now >= startDate && now <= endDate) {
          setConfig(promotionConfig);
          setShowMessage(true);
        }
      } catch (error) {
        console.error('Remote Config error:', error);
      }
    };

    initializeRemoteConfig();
  }, []);

  const handleCTAPress = async () => {
    if (!config) return;

    if (config.ctaLink) {
      if (config.ctaWebLink) {
        await Linking.openURL(config.ctaLink);
      } else {
        // Handle deep linking here if needed
        console.log('Deep link:', config.ctaLink);
      }
    }
    
    if (!config.isForceMessage) {
      onDismiss();
    }
  };

  if (!showMessage || !config) return null;

  return (
    <Surface style={[styles.container, { backgroundColor: currentTheme.colors.surface }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.colors.onSurface }]}>
          {config.messageTitle}
        </Text>
        <Text style={[styles.copy, { color: currentTheme.colors.onSurface }]}>
          {config.primaryCopy}
        </Text>
        <View style={styles.buttonContainer}>
          {!config.isForceMessage && (
            <Button
              mode="text"
              onPress={onDismiss}
              style={styles.button}
            >
              Close
            </Button>
          )}
        </View>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 8,
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  copy: {
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    minWidth: 100,
  },
});

export default PromotionMessage; 