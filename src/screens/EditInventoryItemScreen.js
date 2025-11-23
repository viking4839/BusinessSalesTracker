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
import { ArrowLeft, Trash2, Plus, Minus, Calendar, TrendingUp } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InventoryStorage from '../utils/InventoryStorage';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../styles/Theme';

const EditInventoryItemScreen = ({ route, navigation }) => {
    const { item } = route.params;

    const [name, setName] = useState(item.name);
    const [category, setCategory] = useState(item.category);
    const [quantity, setQuantity] = useState(String(item.quantity));
    const [unitPrice, setUnitPrice] = useState(String(item.unitPrice));
    const [wholesalePrice, setWholesalePrice] = useState(String(item.wholesalePrice || item.unitPrice)); // NEW
    const [supplier, setSupplier] = useState(item.supplier || ''); // NEW
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

    // NEW: Profit calculation functions
    const calculateProfitMargin = () => {
        if (!unitPrice || !wholesalePrice) return null;
        const retail = parseFloat(unitPrice);
        const wholesale = parseFloat(wholesalePrice);
        if (retail <= wholesale) return 0;
        return ((retail - wholesale) / retail * 100).toFixed(1);
    };

    const calculateProfitPerUnit = () => {
        if (!unitPrice || !wholesalePrice) return null;
        const retail = parseFloat(unitPrice);
        const wholesale = parseFloat(wholesalePrice);
        return (retail - wholesale).toFixed(2);
    };

    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter item name');
            return;
        }

        if (!quantity || Number(quantity) < 0) {
            Alert.alert('Invalid Quantity', 'Please enter valid quantity');
            return;
        }

        if (!unitPrice || Number(unitPrice) <= 0) {
            Alert.alert('Invalid Price', 'Please enter valid retail price');
            return;
        }

        if (!wholesalePrice || Number(wholesalePrice) <= 0) {
            Alert.alert('Invalid Price', 'Please enter valid wholesale price');
            return;
        }

        const retail = Number(unitPrice);
        const wholesale = Number(wholesalePrice);
        
        if (wholesale >= retail) {
            Alert.alert(
                'Low Profit Margin', 
                'Wholesale price is higher than retail price. This item will be sold at a loss.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue Anyway', onPress: () => saveItem(retail, wholesale) }
                ]
            );
            return;
        }

        saveItem(retail, wholesale);
    };

    const saveItem = async (retail, wholesale) => {
        try {
            console.log('=== SAVE STARTED ===');
            console.log('Original item ID:', item.id);
            console.log('Original item:', item);

            const updates = {
                name: name.trim(),
                category,
                quantity: Number(quantity),
                unitPrice: retail,
                wholesalePrice: wholesale, // NEW
                supplier: supplier.trim(), // NEW
                expiryDate: expiryDate ? expiryDate.toISOString() : null,
                lowStockThreshold: Number(lowStockThreshold) || 5,
            };

            console.log('Updates to apply:', updates);

            // Direct approach: Load all items, find, update, save
            const allItemsRaw = await AsyncStorage.getItem('@inventory_items');
            console.log('Raw storage data:', allItemsRaw);

            const allItems = allItemsRaw ? JSON.parse(allItemsRaw) : [];
            console.log('Parsed items count:', allItems.length);
            console.log('All item IDs:', allItems.map(i => i.id));

            const index = allItems.findIndex(i => i.id === item.id);
            console.log('Found at index:', index);

            if (index === -1) {
                Alert.alert('Error', 'Item not found in storage');
                console.error('Item ID not found:', item.id);
                return;
            }

            console.log('Original stored item:', allItems[index]);

            // Update the item
            allItems[index] = {
                ...allItems[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            console.log('Updated item:', allItems[index]);

            // Save back to storage
            await AsyncStorage.setItem('@inventory_items', JSON.stringify(allItems));
            console.log('✅ Saved to AsyncStorage');

            // Verify save
            const verification = await AsyncStorage.getItem('@inventory_items');
            const verifyItems = JSON.parse(verification);
            const verifyItem = verifyItems.find(i => i.id === item.id);
            console.log('Verification - item after save:', verifyItem);

            Alert.alert('✅ Saved', 'Changes saved successfully', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Pass updated item back
                        navigation.navigate('Inventory', {
                            refresh: Date.now(),
                            updatedItem: allItems[index]
                        });
                    }
                }
            ]);

            console.log('=== SAVE COMPLETED ===');

        } catch (error) {
            console.error('=== SAVE ERROR ===');
            console.error('Error:', error);
            console.error('Stack:', error.stack);
            Alert.alert('Error', 'Failed to save: ' + error.message);
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
                            navigation.navigate('Inventory', { refresh: Date.now() });
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

    const profitMargin = calculateProfitMargin();
    const profitPerUnit = calculateProfitPerUnit();

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

                {/* NEW: Supplier */}
                <View style={styles.section}>
                    <Text style={styles.label}>Supplier (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={supplier}
                        onChangeText={setSupplier}
                        placeholder="Supplier name"
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

                {/* NEW: Prices Row - Wholesale & Retail */}
                <View style={styles.section}>
                    <Text style={styles.label}>Pricing</Text>
                    <View style={styles.pricesRow}>
                        <View style={styles.priceInputContainer}>
                            <Text style={styles.priceLabel}>Wholesale (Ksh)</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={wholesalePrice}
                                onChangeText={setWholesalePrice}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>

                        <View style={styles.priceInputContainer}>
                            <Text style={styles.priceLabel}>Retail (Ksh)</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={unitPrice}
                                onChangeText={setUnitPrice}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>
                    </View>

                    {/* NEW: Profit Preview */}
                    {profitMargin !== null && profitPerUnit !== null && (
                        <View style={styles.profitPreview}>
                            <View style={styles.profitRow}>
                                <TrendingUp size={14} color={profitMargin > 0 ? Colors.success : Colors.error} />
                                <Text style={[
                                    styles.profitText,
                                    { color: profitMargin > 0 ? Colors.success : Colors.error }
                                ]}>
                                    Profit: Ksh {profitPerUnit} per unit ({profitMargin}%)
                                </Text>
                            </View>
                            {quantity && (
                                <Text style={styles.totalProfitText}>
                                    Total Potential Profit: Ksh {(Number(quantity) * profitPerUnit).toLocaleString()}
                                </Text>
                            )}
                        </View>
                    )}
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
    // NEW: Prices row styles
    pricesRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    priceInputContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    priceInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 15,
        color: Colors.text,
    },
    // NEW: Profit preview styles
    profitPreview: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    profitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: 4,
    },
    profitText: {
        fontSize: 12,
        fontWeight: '600',
    },
    totalProfitText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
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