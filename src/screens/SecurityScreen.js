import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Card from '../components/Card';
import {
  ArrowLeft, Lock, Fingerprint, Clock, Shield,
  Key, Eye, EyeOff, CheckCircle
} from 'lucide-react-native';
import SecureStorage from '../security/SecureStorage';

const SecurityScreen = ({ navigation }) => {
  const [pinSet, setPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const status = await SecureStorage.getSecurityStatus();
      setPinSet(status.pinSet);
      setBiometricEnabled(status.biometricEnabled);
      setAutoLockMinutes(status.autoLockMinutes);

      const bioStatus = await SecureStorage.checkBiometricAvailability();
      setBiometricAvailable(bioStatus.available);
      setBiometricType(bioStatus.biometryType);
    } catch (error) {
      console.error('Load security status error:', error);
    }
  };

  const handleSetPin = async () => {
    // Validate PIN length
    if (pin.length < 4 || pin.length > 6) {
      setPinError('PIN must be 4-6 digits');
      return;
    }

    // Validate PIN contains only numbers
    if (!/^\d+$/.test(pin)) {
      setPinError('PIN must contain only numbers');
      return;
    }

    if (step === 1) {
      // Move to confirmation step
      setStep(2);
      setConfirmPin('');
      setPinError('');
      return;
    }

    if (step === 2) {
      if (pin !== confirmPin) {
        setPinError('PINs do not match');
        setConfirmPin('');
        return;
      }

      setLoading(true);
      setPinError('');

      try {
        // Run in background to prevent UI blocking
        setTimeout(async () => {
          try {
            const result = await SecureStorage.setPin(pin, biometricAvailable);

            setLoading(false);

            if (result.success) {
              setPinSet(true);
              setShowPinModal(false);
              setStep(1);
              setPin('');
              setConfirmPin('');

              Alert.alert(
                'Success',
                'PIN set successfully! Your data is now protected.',
                [{
                  text: 'OK',
                  onPress: () => {
                    loadSecurityStatus();
                    // Trigger migration in background
                    SecureStorage.migratePlainData().catch(console.error);
                  }
                }]
              );
            } else {
              setPinError(result.error || 'Failed to set PIN');
            }
          } catch (error) {
            setLoading(false);
            setPinError('Failed to set PIN: ' + error.message);
          }
        }, 100); // Small delay to let UI update
      } catch (error) {
        setLoading(false);
        setPinError('An error occurred');
      }
    }
  };

  const handleChangePin = async () => {
    if (!oldPin || !newPin) {
      setPinError('Please enter both current and new PIN');
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('New PIN must be 4-6 digits');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN must contain only numbers');
      return;
    }

    setLoading(true);
    setPinError('');

    // Run in background
    setTimeout(async () => {
      try {
        const result = await SecureStorage.changePin(oldPin, newPin);

        setLoading(false);

        if (result.success) {
          setShowChangePinModal(false);
          setOldPin('');
          setNewPin('');
          Alert.alert('Success', 'PIN changed successfully!');
          loadSecurityStatus();
        } else {
          setPinError(result.error || 'Failed to change PIN');
        }
      } catch (error) {
        setLoading(false);
        setPinError('Failed to change PIN: ' + error.message);
      }
    }, 100);
  };

  const handleBiometricToggle = async (value) => {
    if (value) {
      if (!biometricAvailable) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }

      try {
        const result = await SecureStorage.enableBiometric();
        if (result.success) {
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric authentication enabled!');
        } else {
          Alert.alert('Error', result.error);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to enable biometric: ' + error.message);
      }
    } else {
      try {
        const result = await SecureStorage.disableBiometric();
        if (result.success) {
          setBiometricEnabled(false);
          Alert.alert('Success', 'Biometric authentication disabled');
        } else {
          Alert.alert('Error', result.error);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to disable biometric: ' + error.message);
      }
    }
  };

  const handleAutoLockChange = (minutes) => {
    setAutoLockMinutes(minutes);
    SecureStorage.setAutoLockDuration(minutes);
    Alert.alert('Auto-Lock Updated', `App will ${minutes === 0 ? 'never auto-lock' : `auto-lock after ${minutes} minutes of inactivity`}`);
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove PIN protection? This will disable all security features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStorage.resetSecurity();
              setPinSet(false);
              setBiometricEnabled(false);
              Alert.alert('Success', 'PIN protection removed');
              loadSecurityStatus();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove PIN: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const SecurityItem = ({ Icon, title, subtitle, onPress, showArrow = true, rightComponent }) => (
    <TouchableOpacity style={styles.securityItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.securityLeft}>
        <Icon size={20} color={Colors.primary} style={{ marginRight: Spacing.md }} />
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>{title}</Text>
          {subtitle && <Text style={styles.securitySubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showArrow && <Text style={styles.securityArrow}>›</Text>)}
    </TouchableOpacity>
  );

  const SecurityToggle = ({ Icon, title, subtitle, value, onValueChange }) => (
    <View style={styles.securityItem}>
      <View style={styles.securityLeft}>
        <Icon size={20} color={Colors.primary} style={{ marginRight: Spacing.md }} />
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>{title}</Text>
          {subtitle && <Text style={styles.securitySubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d5db', true: Colors.primary + '60' }}
        thumbColor={value ? Colors.primary : '#f3f4f6'}
      />
    </View>
  );

  const PinInput = ({ value, onChange, placeholder, autoFocus = false, editable = true }) => (
    <View style={styles.pinInputContainer}>
      <TextInput
        style={[styles.pinInput, !editable && styles.pinInputDisabled]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        keyboardType="number-pad"
        secureTextEntry={!showPin}
        maxLength={6}
        autoFocus={autoFocus}
        textAlign="center"
        editable={editable && !loading}
      />
      <TouchableOpacity
        style={styles.showPinButton}
        onPress={() => setShowPin(!showPin)}
        disabled={!editable || loading}
      >
        {showPin ? <EyeOff size={20} color={Colors.textSecondary} /> : <Eye size={20} color={Colors.textSecondary} />}
      </TouchableOpacity>
    </View>
  );

  const getBiometricName = () => {
    switch (biometricType) {
      case 'FaceID': return 'Face ID';
      case 'TouchID': return 'Touch ID';
      case 'Biometrics': return 'Biometric';
      default: return 'Biometric';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Security</Text>
      </View>

      {/* PIN Protection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PIN Protection</Text>
        <Card variant="elevated">
          {!pinSet ? (
            <SecurityItem
              Icon={Lock}
              title="Set PIN"
              subtitle="Protect your data with a PIN"
              onPress={() => {
                setShowPinModal(true);
                setStep(1);
                setPin('');
                setConfirmPin('');
                setPinError('');
              }}
            />
          ) : (
            <>
              <SecurityItem
                Icon={CheckCircle}
                title="PIN Protection Active"
                subtitle="Your data is encrypted and secure"
                rightComponent={<CheckCircle size={20} color={Colors.success} />}
                onPress={() => { }}
                showArrow={false}
              />
              <SecurityItem
                Icon={Key}
                title="Change PIN"
                subtitle="Update your security PIN"
                onPress={() => {
                  setShowChangePinModal(true);
                  setOldPin('');
                  setNewPin('');
                  setPinError('');
                }}
              />
              <SecurityItem
                Icon={Shield}
                title="Remove PIN"
                subtitle="Disable PIN protection"
                onPress={handleRemovePin}
              />
            </>
          )}
        </Card>
      </View>

      {/* Biometric Authentication */}
      {biometricAvailable && pinSet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Authentication</Text>
          <Card variant="elevated">
            <SecurityToggle
              Icon={Fingerprint}
              title={`Enable ${getBiometricName()}`}
              subtitle={`Use ${getBiometricName()} to unlock the app`}
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
            />
          </Card>
        </View>
      )}

      {/* Auto-Lock */}
      {pinSet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Lock</Text>
          <Card variant="elevated">
            <SecurityItem
              Icon={Clock}
              title="Auto-Lock Timer"
              subtitle={autoLockMinutes === 0 ? 'Never lock automatically' : `Lock after ${autoLockMinutes} minute${autoLockMinutes > 1 ? 's' : ''} of inactivity`}
              onPress={() => {
                Alert.alert(
                  'Auto-Lock Timer',
                  'Select auto-lock duration:',
                  [
                    { text: '1 minute', onPress: () => handleAutoLockChange(1) },
                    { text: '5 minutes', onPress: () => handleAutoLockChange(5) },
                    { text: '10 minutes', onPress: () => handleAutoLockChange(10) },
                    { text: '30 minutes', onPress: () => handleAutoLockChange(30) },
                    { text: 'Never', onPress: () => handleAutoLockChange(0) },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />
          </Card>
        </View>
      )}

      {/* Security Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Information</Text>
        <Card variant="elevated">
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: pinSet ? Colors.success : Colors.error }]}>
              {pinSet ? 'Protected' : 'Not Protected'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Encryption</Text>
            <Text style={styles.infoValue}>{pinSet ? 'AES-256' : 'None'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Biometric Support</Text>
            <Text style={styles.infoValue}>
              {biometricAvailable ? `${getBiometricName()} Available` : 'Not Available'}
            </Text>
          </View>
        </Card>
      </View>

      {/* Set PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {step === 1 ? 'Set PIN' : 'Confirm PIN'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {step === 1 ? 'Enter a 4-6 digit PIN' : 'Re-enter your PIN to confirm'}
            </Text>

            <PinInput
              value={step === 1 ? pin : confirmPin}
              onChange={step === 1 ? setPin : setConfirmPin}
              placeholder={step === 1 ? "Enter PIN" : "Confirm PIN"}
              autoFocus={true}
              editable={!loading}
            />

            {pinError ? (
              <Text style={styles.errorText}>{pinError}</Text>
            ) : null}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Setting up security...</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!loading) {
                    setShowPinModal(false);
                    setStep(1);
                    setPin('');
                    setConfirmPin('');
                    setPinError('');
                  }
                }}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, loading && styles.disabledText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleSetPin}
                disabled={loading || (step === 1 && pin.length < 4) || (step === 2 && confirmPin.length < 4)}
              >
                <Text style={styles.confirmButtonText}>
                  {step === 1 ? 'Continue' : 'Set PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change PIN Modal */}
      <Modal
        visible={showChangePinModal}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setShowChangePinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change PIN</Text>
            <Text style={styles.modalSubtitle}>Enter your current and new PIN</Text>

            <View style={styles.pinInputGroup}>
              <Text style={styles.pinLabel}>Current PIN</Text>
              <PinInput
                value={oldPin}
                onChange={setOldPin}
                placeholder="Current PIN"
                autoFocus={true}
                editable={!loading}
              />
            </View>

            <View style={styles.pinInputGroup}>
              <Text style={styles.pinLabel}>New PIN</Text>
              <PinInput
                value={newPin}
                onChange={setNewPin}
                placeholder="New PIN"
                editable={!loading}
              />
            </View>

            {pinError ? (
              <Text style={styles.errorText}>{pinError}</Text>
            ) : null}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Changing PIN...</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!loading) {
                    setShowChangePinModal(false);
                    setOldPin('');
                    setNewPin('');
                    setPinError('');
                  }
                }}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, loading && styles.disabledText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, loading && styles.disabledButton]}
                onPress={handleChangePin}
                disabled={loading || !oldPin || !newPin || newPin.length < 4}
              >
                <Text style={styles.confirmButtonText}>Change PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: Spacing.md
  },
  screenTitle: {
    ...Typography.subheading,
    fontWeight: '700',
    color: Colors.text
  },
  section: { padding: Spacing.md },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  securityLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  securityText: { flex: 1 },
  securityTitle: { ...Typography.body, color: Colors.text, fontWeight: '500', marginBottom: 2 },
  securitySubtitle: { ...Typography.caption, color: Colors.textSecondary },
  securityArrow: { ...Typography.heading, fontSize: 24, color: Colors.textSecondary },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  infoLabel: { ...Typography.body, color: Colors.text },
  infoValue: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.xs
  },
  modalSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.xl
  },
  pinInputContainer: {
    position: 'relative',
    marginBottom: Spacing.md
  },
  pinInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 24,
    color: Colors.text,
    fontWeight: '600',
    letterSpacing: 8
  },
  pinInputDisabled: {
    opacity: 0.6
  },
  showPinButton: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    padding: 4
  },
  pinInputGroup: {
    marginBottom: Spacing.lg
  },
  pinLabel: {
    ...Typography.caption,
    color: Colors.text,
    marginBottom: Spacing.xs,
    fontWeight: '500'
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.md
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: Colors.primary
  },
  confirmButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.5
  },
  disabledText: {
    opacity: 0.5
  }
});

export default SecurityScreen;