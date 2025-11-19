import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    StatusBar,
    Platform,
} from 'react-native';
import { ArrowLeft, Trash2, Plus, Minus, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import InventoryStorage from '../utils/InventoryStorage';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../styles/Theme';

const EditInventoryItemScreen = ({ route, navigation }) => {
    const { item } = route.params;

    const [name, setName] = useState(item.name);
    const [category, setCategory] = useState(item.category);
    const [quantity, setQuantity] = useState(String(item.quantity));
    const [unitPrice, setUnitPrice] = useState(String(item.unitPrice));
    const [expiryDate, setExpiryDate] = useState(
        item.expiryDate ? new Date(item.expiryDate) : null
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [categories, setCategories] = useState([]);
    const [lowStockThreshold, setLowStockThreshold] = useState(
        String(item.lowStockThreshold || 5)
    );

    React.useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await InventoryStorage.loadCategories();
        setCategories(cats);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter item name');
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
            const updates = {
                name: name.trim(),
                category,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
                expiryDate: expiryDate ? expiryDate.toISOString() : null,
                lowStockThreshold: Number(lowStockThreshold) || 5,
            };

            const success = await InventoryStorage.updateItem(item.id, updates);

            if (success) {
                Alert.alert('Success', 'Item updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', 'Failed to update item');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', 'Failed to update item');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Item',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await InventoryStorage.deleteItem(item.id);
                        if (success) {
                            navigation.goBack();
                        }
                    },
                },
            ]
        );
    };

    const adjustQuantity = (delta) => {
        const current = Number(quantity) || 0;
        const newQty = Math.max(0, current + delta);
        setQuantity(String(newQty));
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setExpiryDate(selectedDate);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Item</Text>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Trash2 size={20} color={Colors.error} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Item Name */}
                <View style={styles.section}>
                    <Text style={styles.label}>Item Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Item name"
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Category */}
                <View style={styles.section}>
                    <Text style={styles.label}>Category</Text>
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

                {/* Quantity Adjuster */}
                <View style={styles.section}>
                    <Text style={styles.label}>Quantity</Text>
                    <View style={styles.quantityAdjuster}>
                        <TouchableOpacity
                            style={styles.adjustButton}
                            onPress={() => adjustQuantity(-1)}
                        >
                            <Minus size={20} color={Colors.primary} />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.quantityInput}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            textAlign="center"
                        />

                        <TouchableOpacity
                            style={styles.adjustButton}
                            onPress={() => adjustQuantity(1)}
                        >
                            <Plus size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Unit Price */}
                <View style={styles.section}>
                    <Text style={styles.label}>Unit Price (Ksh)</Text>
                    <TextInput
                        style={styles.input}
                        value={unitPrice}
                        onChangeText={setUnitPrice}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Low Stock Threshold */}
                <View style={styles.section}>
                    <Text style={styles.label}>Low Stock Alert At</Text>
                    <TextInput
                        style={styles.input}
                        value={lowStockThreshold}
                        onChangeText={setLowStockThreshold}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Expiry Date */}
                <View style={styles.section}>
                    <Text style={styles.label}>Expiry Date (Optional)</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Calendar size={16} color={Colors.textSecondary} />
                        <Text style={styles.dateButtonText}>
                            {expiryDate
                                ? expiryDate.toLocaleDateString()
                                : 'Select expiry date'}
                        </Text>
                    </TouchableOpacity>
                    {expiryDate && (
                        <TouchableOpacity
                            onPress={() => setExpiryDate(null)}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearText}>Clear</Text>
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

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.surface,
        flex: 1,
        textAlign: 'center',
    },
    deleteButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    scrollView: {
        flex: 1,
        padding: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 15,
        color: Colors.text,
    },
    categoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
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
    quantityAdjuster: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    adjustButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    quantityInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        paddingVertical: Spacing.sm,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        gap: Spacing.xs,
    },
    dateButtonText: {
        fontSize: 14,
        color: Colors.text,
    },
    clearButton: {
        marginTop: Spacing.xs,
        alignSelf: 'flex-start',
    },
    clearText: {
        fontSize: 12,
        color: Colors.error,
        fontWeight: '600',
    },
    footer: {
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.surface,
    },
});

export default EditInventoryItemScreen;