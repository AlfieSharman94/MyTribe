import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../src/ThemeContext';

export const CustomText: React.FC<TextProps> = (props) => {
  const { currentTheme } = useTheme();
  
  return (
    <Text
      {...props}
      style={[
        { color: currentTheme.colors.onSurface },  // Default text color from theme
        props.style
      ]}
    />
  );
};