import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert
} from 'react-native';
import {
    X,
    DollarSign,
    User,
    Tag,
    Calendar,
    Clock
} from 'lucide-react-native';

// Replace the component signature to accept both props
const AddCashSaleDialog = (props) => {
    const { visible, onClose, onAddSale, onSubmit } = props;
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        category: 'general',
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
    });

    const handleSubmit = () => {
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!formData.description) {
            Alert.alert('Error', 'Please add a description');
            return;
        }

        // Safely resolve handler: prefer onAddSale, fallback to onSubmit
        const handler =
            typeof onAddSale === 'function'
                ? onAddSale
                : typeof onSubmit === 'function'
                    ? onSubmit
                    : null;

        if (!handler) {
            Alert.alert('Error', 'Cash sale handler is not connected.');
            return;
        }

        handler(formData);

        // Reset form
        setFormData({
            amount: '',
            description: '',
            category: 'general',
            customerName: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
        });

        onClose();
    };

    const categories = [
        { value: 'general', label: 'General Sale' },
        { value: 'retail', label: 'Retail' },
        { value: 'wholesale', label: 'Wholesale' },
        { value: 'service', label: 'Service' },
        { value: 'consultation', label: 'Consultation' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Cash Sale</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalDescription}>
                        Record a manual cash transaction for your business
                    </Text>

                    <ScrollView style={styles.formContainer}>
                        {/* Amount */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount (Ksh) *</Text>
                            <View style={styles.inputWithIcon}>
                                <DollarSign size={16} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="e.g., Product sale, Service payment..."
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        {/* Customer Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Customer Name (Optional)</Text>
                            <View style={styles.inputWithIcon}>
                                <User size={16} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., John Kamau"
                                    value={formData.customerName}
                                    onChangeText={(text) => setFormData({ ...formData, customerName: text })}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>

                        {/* Category */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.inputWithIcon}>
                                <Tag size={16} color="#6b7280" style={styles.inputIcon} />
                                <View style={styles.select}>
                                    <Text style={styles.selectText}>
                                        {categories.find(cat => cat.value === formData.category)?.label || 'Select category'}
                                    </Text>
                                </View>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                {categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.value}
                                        style={[
                                            styles.categoryChip,
                                            formData.category === category.value && styles.categoryChipActive
                                        ]}
                                        onPress={() => setFormData({ ...formData, category: category.value })}
                                    >
                                        <Text style={[
                                            styles.categoryChipText,
                                            formData.category === category.value && styles.categoryChipTextActive
                                        ]}>
                                            {category.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Date and Time */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.flex]}>
                                <Text style={styles.label}>Date</Text>
                                <View style={styles.inputWithIcon}>
                                    <Calendar size={16} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.date}
                                        onChangeText={(text) => setFormData({ ...formData, date: text })}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, styles.flex, styles.timeInput]}>
                                <Text style={styles.label}>Time</Text>
                                <View style={styles.inputWithIcon}>
                                    <Clock size={16} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={formData.time}
                                        onChangeText={(text) => setFormData({ ...formData, time: text })}
                                        placeholder="HH:MM"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.submitButton]}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitButtonText}>Record Sale</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    modalDescription: {
        fontSize: 14,
        color: '#6b7280',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    inputWithIcon: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        paddingLeft: 40,
        fontSize: 16,
        backgroundColor: '#ffffff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    select: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        paddingLeft: 40,
        backgroundColor: '#ffffff',
    },
    selectText: {
        fontSize: 16,
        color: '#111827',
    },
    categoryScroll: {
        marginTop: 8,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: '#2563eb',
    },
    categoryChipText: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '500',
    },
    categoryChipTextActive: {
        color: '#ffffff',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    flex: {
        flex: 1,
    },
    timeInput: {
        flex: 0.8,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    submitButton: {
        backgroundColor: '#16a34a',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});

export default AddCashSaleDialog;