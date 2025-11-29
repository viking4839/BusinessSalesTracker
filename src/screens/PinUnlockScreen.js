import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
  AppState
} from 'react-native';
import { Lock, Fingerprint } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import SecureStorage from '../security/SecureStorage';

const PinUnlockScreen = ({ navigation, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    checkBiometric();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, try biometric if enabled
        if (biometricEnabled) {
          handleBiometricUnlock();
        }
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, biometricEnabled]);

  useEffect(() => {
    if (lockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockTimeRemaining]);

  const checkBiometric = async () => {
    const enabled = await SecureStorage.isBiometricEnabled();
    setBiometricEnabled(enabled);

    // Auto-trigger biometric on mount if enabled
    if (enabled) {
      setTimeout(() => handleBiometricUnlock(), 300);
    }
  };

  const handleNumberPress = (num) => {
    if (locked) return;

    setError('');
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        setTimeout(() => verifyPin(newPin), 200);
      }
    }
  };

  const handleDelete = () => {
    setError('');
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (enteredPin) => {
    setLoading(true);

    try {
      const result = await SecureStorage.unlock(enteredPin);

      if (result.success) {
        // Unlock successful
        if (onUnlock) {
          onUnlock();
        } else {
          navigation.replace('Home');
        }
      } else if (result.locked) {
        // Account locked due to failed attempts
        setLocked(true);
        setLockTimeRemaining(result.remainingMinutes * 60);
        setError(`Too many attempts. Locked for ${result.remainingMinutes} minute(s)`);
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        // Wrong PIN
        setAttempts(result.attempts || 0);
        setError(`Wrong PIN (${result.attempts}/${result.maxAttempts} attempts)`);
        Vibration.vibrate([0, 100, 50, 100]);
        setPin('');

        if (result.attempts >= 3) {
          Alert.alert(
            'Warning',
            `Wrong PIN. ${result.maxAttempts - result.attempts} attempts remaining before lockout.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Unlock error:', error);
      setError('An error occurred. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (locked) return;

    setLoading(true);
    try {
      const result = await SecureStorage.unlockWithBiometric();

      if (result.success) {
        if (onUnlock) {
          onUnlock();
        } else {
          navigation.replace('Home');
        }
      } else {
        setError(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric unlock error:', error);
      setError('Biometric unlock failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN?',
      'This will permanently delete ALL your data (transactions, inventory, profits, settings) and reset the app completely.\n\nThere is no way to recover the data after this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Reset security (removes PIN + biometric)
              await SecureStorage.resetSecurity();

              // 2. DELETE ALL ENCRYPTED DATA
              const keysToRemove = [
                META_KEY,
                TX_KEY,
                INV_KEY,
                CREDIT_KEY,
                PROFIT_KEY,
                SETTINGS_KEY,
                PROFILE_KEY,
                '@biometric_datakey',
                // Add any other @sec_ keys if you have more
              ];

              await AsyncStorage.multiRemove(keysToRemove);

              Alert.alert(
                'Data Deleted',
                'All data has been permanently erased. The app is now reset.',
                [{ text: 'OK', onPress: () => navigation.replace('PinSetup') }]
              );
            } catch (error) {
              console.error('Failed to wipe data:', error);
              Alert.alert('Error', 'Failed to reset app. Please try again.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
              error && styles.pinDotError
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumpad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      [biometricEnabled ? 'bio' : '', '0', 'del']
    ];

    return (
      <View style={styles.numpad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numpadRow}>
            {row.map((num, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={[
                  styles.numpadButton,
                  num === '' && styles.numpadButtonEmpty,
                  num === 'bio' && styles.numpadButtonBio
                ]}
                onPress={() => {
                  if (num === 'del') {
                    handleDelete();
                  } else if (num === 'bio') {
                    handleBiometricUnlock();
                  } else if (num !== '') {
                    handleNumberPress(num);
                  }
                }}
                disabled={num === '' || loading || locked}
              >
                {num === 'del' ? (
                  <Text style={styles.numpadDeleteText}>⌫</Text>
                ) : num === 'bio' ? (
                  <Fingerprint size={28} color={Colors.primary} />
                ) : (
                  <Text style={styles.numpadText}>{num}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Lock size={48} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>
          {locked
            ? `Locked for ${Math.floor(lockTimeRemaining / 60)}:${String(lockTimeRemaining % 60).padStart(2, '0')}`
            : 'Enter your 4-digit PIN to unlock'
          }
        </Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinSection}>
        {renderPinDots()}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* Numpad */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Unlocking...</Text>
        </View>
      ) : (
        renderNumpad()
      )}

      {/* Forgot PIN */}
      <TouchableOpacity
        style={styles.forgotButton}
        onPress={handleForgotPin}
        disabled={loading}
      >
        <Text style={styles.forgotButtonText}>Forgot PIN?</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Track Biz • Secure Access</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.md,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinDotError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  numpad: {
    paddingHorizontal: Spacing.xxl,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  numpadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  numpadButtonEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  numpadButtonBio: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '30',
  },
  numpadText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.text,
  },
  numpadDeleteText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
  },
  forgotButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});

export default PinUnlockScreen;