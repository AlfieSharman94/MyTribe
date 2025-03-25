import { StyleSheet } from 'react-native';
import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme, MD3TypescaleKey } from 'react-native-paper';

export const globalStyles = StyleSheet.create({
  text: {
    fontSize: 14,
  }
});

const baseFont = {
  fontFamily: '-apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
} as const;

type MD3FontConfig = {
  [key in MD3TypescaleKey]: {
    fontFamily: string;
    lineHeight: number;
    fontSize: number;
    letterSpacing: number;
    fontWeight: '400' | '500';
  };
};

const fontConfig: MD3FontConfig = {
  displayLarge: {
    ...baseFont,
    lineHeight: 64,
    fontSize: 57,
    letterSpacing: 0,
    fontWeight: '400',
  },
  displayMedium: {
    ...baseFont,
    lineHeight: 52,
    fontSize: 45,
    letterSpacing: 0,
    fontWeight: '400',
  },
  displaySmall: {
    ...baseFont,
    lineHeight: 44,
    fontSize: 36,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineLarge: {
    ...baseFont,
    lineHeight: 40,
    fontSize: 32,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineMedium: {
    ...baseFont,
    lineHeight: 36,
    fontSize: 28,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineSmall: {
    ...baseFont,
    lineHeight: 32,
    fontSize: 24,
    letterSpacing: 0,
    fontWeight: '400',
  },
  titleLarge: {
    ...baseFont,
    lineHeight: 28,
    fontSize: 22,
    letterSpacing: 0,
    fontWeight: '400',
  },
  titleMedium: {
    ...baseFont,
    lineHeight: 24,
    fontSize: 16,
    letterSpacing: 0.15,
    fontWeight: '500',
  },
  titleSmall: {
    ...baseFont,
    lineHeight: 20,
    fontSize: 14,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelLarge: {
    ...baseFont,
    lineHeight: 20,
    fontSize: 14,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelMedium: {
    ...baseFont,
    lineHeight: 16,
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  labelSmall: {
    ...baseFont,
    lineHeight: 16,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  bodyLarge: {
    ...baseFont,
    lineHeight: 24,
    fontSize: 16,
    letterSpacing: 0.15,
    fontWeight: '400',
  },
  bodyMedium: {
    ...baseFont,
    lineHeight: 20,
    fontSize: 14,
    letterSpacing: 0.25,
    fontWeight: '400',
  },
  bodySmall: {
    ...baseFont,
    lineHeight: 16,
    fontSize: 14,
    letterSpacing: 0.4,
    fontWeight: '400',
  },
};

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1877F2',     
    onPrimary: '#FFFFFF',
    primaryContainer: '#1877F2',
    onPrimaryContainer: '#FFFFFF',
    secondary: '#42B72A',    
    onSecondary: '#FFFFFF',
    secondaryContainer: '#65676B',
    onSecondaryContainer: '#FFFFFF',
    background: '#FFFFFF',
    onBackground: '#050505',
    surface: '#F0F2F5',  
    onSurface: '#050505',
    surfaceVariant: '#F0F2F5',
    error: '#DC3545',
    onError: '#FFFFFF',
    errorContainer: '#DC3545',
    onErrorContainer: '#FFFFFF',
    outline: '#CED0D4',
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const darkTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: true,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4C9EFF',         // Brighter blue for better contrast
    onPrimary: '#FFFFFF',
    primaryContainer: '#4C9EFF',
    onPrimaryContainer: '#FFFFFF',
    secondary: '#66D653',       // Brighter green for better contrast
    onSecondary: '#FFFFFF',
    secondaryContainer: '#B0B3B8',  // Lighter gray for better contrast
    onSecondaryContainer: '#FFFFFF',
    background: '#18191A',  // Darker color for bottom nav
    onBackground: '#FFFFFF',    // Pure white for maximum contrast
    surface: '#3A3B3C',     // Keep this gray for screens
    onSurface: '#FFFFFF',       // Pure white for maximum contrast
    surfaceVariant: '#3A3B3C',
    onSurfaceVariant: '#E4E6EB',
    error: '#FF4C4C',
    onError: '#FFFFFF',
    errorContainer: '#FF4C4C',
    onErrorContainer: '#FFFFFF',
    outline: '#B0B3B8',
    onSurfaceDisabled: '#B0B3B8',
    inverseOnSurface: '#FFFFFF',
    inverseSurface: '#3A3B3C',
    inversePrimary: '#4C9EFF',
    elevation: {
      level0: 'transparent',
      level1: '#242526',
      level2: '#3A3B3C',
      level3: '#4E4F50',
      level4: '#4E4F50',
      level5: '#4E4F50',
    }
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const customColors = {
  facebookBlue: '#1877F2',
  facebookGreen: '#42B72A',
  textPrimary: '#050505',
  textSecondary: '#65676B',
  background: '#FFFFFF',
  surfaceBackground: '#F0F2F5',
  divider: '#CED0D4',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  touch: 44, // Minimum touch target size
};

export const typography = {
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    lineHeight: 20,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
  },
}; 