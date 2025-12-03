import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Define Colors first (no dependencies)
const ColorsObject = {
  primaryStart: '#6C63FF',
  primaryEnd: '#059669',
  primary: '#4e48d1ff',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  secondary: '#059669',
  accent: '#10B981',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  cardLight: '#F0FDF4',
  cardMint: '#DCFCE7',
  text: '#2D3436',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  activeGreen: '#10B981',
  activeBg: '#D1FAE5',
  border: '#E5E7EB',
  borderLight: '#EEF2F7',
  white: '#FFFFFF',
  black: '#000000',
};

export const Colors = ColorsObject;
export const COLORS = ColorsObject;

// Typography (uses Colors)
const TypographyObject = {
  heading: { fontSize: 24, fontWeight: 'bold', color: ColorsObject.text },
  title: { fontSize: 20, fontWeight: '600', color: ColorsObject.text },
  subheading: { fontSize: 16, fontWeight: '600', color: ColorsObject.text },
  body: { fontSize: 14, fontWeight: '400', color: ColorsObject.text },
  caption: { fontSize: 12, fontWeight: '400', color: ColorsObject.textSecondary },
  small: { fontSize: 11, fontWeight: '400', color: ColorsObject.textSecondary },
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40, color: ColorsObject.text },
  h2: { fontSize: 28, fontWeight: '700', lineHeight: 36, color: ColorsObject.text },
  h3: { fontSize: 22, fontWeight: '600', lineHeight: 28, color: ColorsObject.text },
  h4: { fontSize: 18, fontWeight: '600', lineHeight: 24, color: ColorsObject.text },
};

export const Typography = TypographyObject;
export const TYPOGRAPHY = TypographyObject;

// Spacing
const SpacingObject = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Spacing = SpacingObject;
export const SPACING = SpacingObject;

// BorderRadius
const BorderRadiusObject = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const BorderRadius = BorderRadiusObject;

// Shadows
const ShadowsObject = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Shadows = ShadowsObject;
export const SHADOWS = ShadowsObject;

// Screen
const ScreenObject = { width, height };
export const Screen = ScreenObject;

// Default export
export default {
  Colors: ColorsObject,
  Typography: TypographyObject,
  Spacing: SpacingObject,
  BorderRadius: BorderRadiusObject,
  Shadows: ShadowsObject,
  Screen: ScreenObject,
  COLORS: ColorsObject,
  TYPOGRAPHY: TypographyObject,
  SPACING: SpacingObject,
  SHADOWS: ShadowsObject,
};