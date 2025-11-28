import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Shield, Check } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import SecureStorage from '../security/SecureStorage';

const PinSetupScreen = ({ navigation, route }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('create'); // 'create' or 'confirm'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const isChangingPin = route.params?.isChangingPin || false;
  const oldPin = route.params?.oldPin || null;

  React.useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const { available } = await SecureStorage.checkBiometricAvailability();
    setBiometricAvailable(available);
  };

  const handleNumberPress = (num) => {
    setError('');
    
    if (step === 'create') {
      if (pin.length < 4) {
        setPin(pin + num);
        if (pin.length === 3) {
          // Auto-advance to confirm step
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        
        if (newConfirm.length === 4) {
          // Auto-verify
          setTimeout(() => verifyPin(newConfirm), 300);
        }
      }
    }
  };

  const handleDelete = () => {
    setError('');
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const verifyPin = async (finalConfirm) => {
    if (pin !== finalConfirm) {
      setError('PINs do not match');
      Vibration.vibrate([0, 100, 100, 100]);
      setConfirmPin('');
      return;
    }

    setLoading(true);

    try {
      if (isChangingPin && oldPin) {
        // Changing existing PIN
        const result = await SecureStorage.changePin(oldPin, pin);
        if (result.success) {
          Alert.alert(
            'Success',
            'PIN changed successfully',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          setError(result.error || 'Failed to change PIN');
          setLoading(false);
        }
      } else {
        // Setting up new PIN
        await SecureStorage.setPin(pin, enableBiometric);
        
        // Migrate existing data
        const migrationResult = await SecureStorage.migratePlainData();
        
        if (migrationResult.success) {
          Alert.alert(
            'Success',
            'Security enabled! Your data is now protected.',
            [{ text: 'OK', onPress: () => navigation.replace('Home') }]
          );
        } else {
          Alert.alert(
            'Warning',
            'PIN set but data migration had issues. Some data may need to be re-entered.',
            [{ text: 'OK', onPress: () => navigation.replace('Home') }]
          );
        }
      }
    } catch (error) {
      console.error('PIN setup error:', error);
      setError('Failed to set PIN. Please try again.');
      setLoading(false);
    }
  };

  const renderPinDots = (currentPin) => {
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled
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
      ['', '0', 'del']
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
                  num === '' && styles.numpadButtonEmpty
                ]}
                onPress={() => {
                  if (num === 'del') {
                    handleDelete();
                  } else if (num !== '') {
                    handleNumberPress(num);
                  }
                }}
                disabled={num === '' || loading}
              >
                {num === 'del' ? (
                  <Text style={styles.numpadDeleteText}>⌫</Text>
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
          <Shield size={48} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>
          {isChangingPin ? 'Change PIN' : 'Set Up Security PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? 'Create a 4-digit PIN to secure your data'
            : 'Confirm your PIN'}
        </Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinSection}>
        {renderPinDots(step === 'create' ? pin : confirmPin)}
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* Biometric Option (only on initial setup) */}
      {!isChangingPin && biometricAvailable && step === 'create' && (
        <TouchableOpacity
          style={styles.biometricOption}
          onPress={() => setEnableBiometric(!enableBiometric)}
        >
          <View style={styles.checkboxContainer}>
            <View style={[
              styles.checkbox,
              enableBiometric && styles.checkboxChecked
            ]}>
              {enableBiometric && <Check size={16} color={Colors.surface} />}
            </View>
            <Text style={styles.biometricText}>
              Enable fingerprint/face unlock
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Numpad */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Setting up security...</Text>
        </View>
      ) : (
        renderNumpad()
      )}

      {/* Back button for confirm step */}
      {step === 'confirm' && !loading && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep('create');
            setConfirmPin('');
            setError('');
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xxl,
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
    textAlign: 'center',
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
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  biometricOption: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  biometricText: {
    ...Typography.body,
    color: Colors.text,
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
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default PinSetupScreen;