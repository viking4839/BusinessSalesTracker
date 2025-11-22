import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { X, Package, Plus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import InventoryStorage from '../utils/InventoryStorage';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../styles/Theme';

const AddInventoryItemDialog = ({ visible, onClose, onItemAdded }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [expiryDate, setExpiryDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categories, setCategories] = useState([]);
    const [lowStockThreshold, setLowStockThreshold] = useState('5');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        if (visible) {
            loadCategories();
        }
    }, [visible]);

    const loadCategories = async () => {
        const cats = await InventoryStorage.loadCategories();
        setCategories(cats);
        if (cats.length > 0 && !category) {
            setCategory(cats[0]);
        }
    };

    const resetForm = () => {
        setName('');
        setCategory(categories[0] || '');
        setQuantity('');
        setUnitPrice('');
        setExpiryDate(null);
        setLowStockThreshold('5');
        setShowAddCategory(false);
        setNewCategory('');
    };

    const handleAddNewCategory = async () => {
        const trimmed = newCategory.trim();
        if (!trimmed) {
            Alert.alert('Required', 'Please enter category name');
            return;
        }

        if (categories.includes(trimmed)) {
            Alert.alert('Exists', 'This category already exists');
            return;
        }

        // Add to storage
        await InventoryStorage.addCategory(trimmed);

        // Update local state
        const updatedCats = [...categories, trimmed];
        setCategories(updatedCats);
        setCategory(trimmed);
        setNewCategory('');
        setShowAddCategory(false);

        Alert.alert('✅ Success', `Category "${trimmed}" added`);
    };

    const handleAddItem = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter item name');
            return;
        }

        if (!category) {
            Alert.alert('Required', 'Please select or add a category');
            return;
        }

        if (!quantity || Number(quantity) < 0) {
            Alert.alert('Invalid Quantity', 'Please enter valid quantity');
            return;
        }

        if (!unitPrice || Number(unitPrice) <= 0) {
            Alert.alert('Invalid Price', 'Please enter valid unit price');
            return;
        }

        try {
            const itemData = {
                name: name.trim(),
                category,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
                expiryDate: expiryDate ? expiryDate.toISOString() : null,
                lowStockThreshold: Number(lowStockThreshold) || 5,
            };

            const newItem = await InventoryStorage.addItem(itemData);

            if (newItem) {
                Alert.alert('✅ Success', `${name} added to inventory`);
                resetForm();
                onItemAdded && onItemAdded(newItem);
                onClose();
            } else {
                Alert.alert('Error', 'Failed to add item');
            }
        } catch (error) {
            console.error('Add item error:', error);
            Alert.alert('Error', 'Failed to add item to inventory');
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setExpiryDate(selectedDate);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconContainer}>
                                <Package size={20} color={Colors.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Add Stock Item</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Item Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Item Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Coca Cola 500ml"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>

                        {/* Category */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Category *</Text>
                                <TouchableOpacity
                                    onPress={() => setShowAddCategory(!showAddCategory)}
                                    style={styles.addCategoryBtn}
                                >
                                    <Plus size={14} color={Colors.primary} />
                                    <Text style={styles.addCategoryText}>
                                        {showAddCategory ? 'Cancel' : 'New Category'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Add New Category Input */}
                            {showAddCategory && (
                                <View style={styles.addCategoryContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter new category"
                                        value={newCategory}
                                        onChangeText={setNewCategory}
                                        placeholderTextColor={Colors.textLight}
                                    />
                                    <TouchableOpacity
                                        style={styles.addCategorySubmitBtn}
                                        onPress={handleAddNewCategory}
                                    >
                                        <Text style={styles.addCategorySubmitText}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Existing Categories */}
                            {!showAddCategory && (
                                <View style={styles.categoryContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {categories.map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.categoryChip,
                                                    category === cat && styles.categoryChipActive,
                                                ]}
                                                onPress={() => setCategory(cat)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryText,
                                                        category === cat && styles.categoryTextActive,
                                                    ]}
                                                >
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Quantity & Unit Price Row */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                                <Text style={styles.label}>Quantity *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>

                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Unit Price (Ksh) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={unitPrice}
                                    onChangeText={setUnitPrice}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                        </View>

                        {/* Low Stock Threshold */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Low Stock Alert At</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="5"
                                value={lowStockThreshold}
                                onChangeText={setLowStockThreshold}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textLight}
                            />
                            <Text style={styles.helperText}>
                                You'll be notified when stock reaches this level
                            </Text>
                        </View>

                        {/* Expiry Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expiry Date (Optional)</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateButtonText}>
                                    {expiryDate
                                        ? expiryDate.toLocaleDateString()
                                        : 'Select expiry date'}
                                </Text>
                            </TouchableOpacity>
                            {expiryDate && (
                                <TouchableOpacity
                                    onPress={() => setExpiryDate(null)}
                                    style={styles.clearDateButton}
                                >
                                    <Text style={styles.clearDateText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={expiryDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.addButton]}
                            onPress={handleAddItem}
                        >
                            <Text style={styles.addButtonText}>Add Item</Text>
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
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    scrollView: {
        padding: Spacing.md,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    addCategoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addCategoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    addCategoryContainer: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    addCategorySubmitBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
    },
    addCategorySubmitText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 15,
        color: Colors.text,
    },
    helperText: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
    },
    categoryContainer: {
        marginTop: Spacing.xs,
    },
    categoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryText: {
        fontSize: 13,
        color: Colors.text,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: Colors.surface,
    },
    dateButton: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    dateButtonText: {
        fontSize: 14,
        color: Colors.text,
    },
    clearDateButton: {
        marginTop: Spacing.xs,
        alignSelf: 'flex-start',
    },
    clearDateText: {
        fontSize: 12,
        color: Colors.error,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    button: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    addButton: {
        backgroundColor: Colors.primary,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
});

export default AddInventoryItemDialog;