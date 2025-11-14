import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import Button from './Button';

const AddCashSaleButton = ({ onAddSale }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'general',
    customerName: '',
  });

  const handleSubmit = () => {
    console.log('💰 CASH BUTTON - Submit pressed, form data:', formData);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      console.log('❌ Invalid amount:', formData.amount);
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!formData.description) {
      console.log('❌ Missing description');
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    const sale = {
      ...formData,
      amount: parseFloat(formData.amount),
      timestamp: new Date(),
      type: 'cash',
      bank: 'Cash Sale',
      sender: formData.customerName || 'Walk-in Customer',
      isBusinessTransaction: true,
      score: 100,
      confidence: 'High'
    };

    console.log('💰 CASH SALE - Created sale object:', sale);

    if (onAddSale) {
      console.log('📞 Calling onAddSale callback');
      onAddSale(sale);
    } else {
      console.log('❌ No onAddSale callback provided!');
    }

    Alert.alert(
      'Success!',
      `Cash sale of Ksh ${parseFloat(formData.amount).toLocaleString()} recorded`
    );

    setFormData({
      amount: '',
      description: '',
      category: 'general',
      customerName: '',
    });
    setModalVisible(false);
    console.log('✅ Cash sale form reset and modal closed');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('💰 FAB BUTTON - Cash sale button pressed');
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>💰</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Cash Sale</Text>
                <Text style={styles.modalSubtitle}>Record a manual cash transaction</Text>
              </View>

              <View style={styles.form}>
                {/* Amount */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount (Ksh) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="e.g., Product sale, Service payment..."
                    multiline
                    numberOfLines={3}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                  />
                </View>

                {/* Customer Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Customer Name (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., John Kamau"
                    value={formData.customerName}
                    onChangeText={(text) => setFormData({ ...formData, customerName: text })}
                  />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                    style={styles.actionButton}
                  />
                  <Button
                    title="Record Sale"
                    onPress={handleSubmit}
                    variant="primary"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.md,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default AddCashSaleButton;