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
    Switch,
    Platform,
} from 'react-native';
import { X, DollarSign, User, Phone, FileText, CreditCard, Package } from 'lucide-react-native';
import InventoryStorage from '../utils/InventoryStorage';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../styles/Theme';

const AddCashSaleDialog = ({ visible, onClose, onAddSale }) => {
    // ✅ ALL HOOKS AT THE TOP (before any conditional logic)
    const [amount, setAmount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [linkInventory, setLinkInventory] = useState(true);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [saleQuantity, setSaleQuantity] = useState('1');

    // ✅ useEffect AFTER all useState
    useEffect(() => {
        if (visible) {
            loadInventory();
        }
    }, [visible]);

    const loadInventory = async () => {
        try {
            const items = await InventoryStorage.loadInventory();
            // Only show items with stock > 0
            const available = items.filter(item => item.quantity > 0);
            setInventoryItems(available);
        } catch (error) {
            console.error('Load inventory error:', error);
        }
    };

    const resetForm = () => {
        setAmount('');
        setCustomerName('');
        setPhone('');
        setNotes('');
        setPaymentMethod('Cash');
        setSelectedItem(null);
        setSaleQuantity('1');
    };

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        // If inventory linking is enabled and item selected
        if (linkInventory && selectedItem) {
            const qty = Number(saleQuantity) || 1;

            if (qty > selectedItem.quantity) {
                Alert.alert(
                    'Insufficient Stock',
                    `Only ${selectedItem.quantity} units available`
                );
                return;
            }

            // Verify amount matches (optional warning)
            const expectedAmount = selectedItem.unitPrice * qty;
            if (Number(amount) !== expectedAmount) {
                Alert.alert(
                    'Amount Mismatch',
                    `Expected Ksh ${expectedAmount} for ${qty} × ${selectedItem.name}\nYou entered Ksh ${amount}\n\nContinue anyway?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Continue', onPress: () => submitSale() },
                    ]
                );
                return;
            }
        }

        submitSale();
    };

    const submitSale = async () => {
        const saleData = {
            amount,
            customerName,
            phone,
            notes,
            paymentMethod,
            linkedInventoryId: linkInventory && selectedItem ? selectedItem.id : null,
            linkedInventoryName: linkInventory && selectedItem ? selectedItem.name : null,
            saleQuantity: linkInventory && selectedItem ? Number(saleQuantity) : null,
        };

        // Deduct inventory if linked
        if (linkInventory && selectedItem) {
            const qty = Number(saleQuantity) || 1;
            const success = await InventoryStorage.adjustQuantity(selectedItem.id, -qty);

            if (!success) {
                Alert.alert('Error', 'Failed to update inventory');
                return;
            }
        }

        // Call parent handler
        onAddSale(saleData);

        // Reset form
        resetForm();

        // Close dialog immediately
        onClose();

        // Show success confirmation after dialog closes
        setTimeout(() => {
            const itemInfo = selectedItem
                ? `\n${selectedItem.name} (${saleQuantity} units)`
                : '';

            Alert.alert(
                '✅ Sale Recorded',
                `Amount: Ksh ${Number(amount).toLocaleString()}${itemInfo}\n\nSale has been added to your transactions.`,
                [{ text: 'Great!', style: 'default' }]
            );
        }, 300); // Small delay so dialog closes first
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconContainer}>
                                <DollarSign size={20} color={Colors.success} />
                            </View>
                            <Text style={styles.title}>Record Cash Sale</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Amount */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Amount (KSh) *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>

                        {/* Link to Inventory Toggle */}
                        <View style={styles.toggleContainer}>
                            <View style={styles.toggleLeft}>
                                <Package size={18} color={Colors.primary} />
                                <Text style={styles.toggleLabel}>Link to inventory item</Text>
                            </View>
                            <Switch
                                value={linkInventory}
                                onValueChange={setLinkInventory}
                                trackColor={{ false: '#E5E7EB', true: Colors.primary + '60' }}
                                thumbColor={linkInventory ? Colors.primary : '#F3F4F6'}
                            />
                        </View>

                        {/* Inventory Item Picker (if enabled) */}
                        {linkInventory && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Select Item Sold</Text>
                                    {inventoryItems.length === 0 ? (
                                        <Text style={styles.noItemsText}>
                                            No inventory items available. Add stock first.
                                        </Text>
                                    ) : (
                                        <ScrollView style={styles.itemsList} nestedScrollEnabled>
                                            {inventoryItems.map(item => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        styles.itemChip,
                                                        selectedItem?.id === item.id && styles.itemChipActive,
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedItem(item);
                                                        setAmount(String(item.unitPrice));
                                                    }}
                                                >
                                                    <View style={styles.itemChipContent}>
                                                        <Text
                                                            style={[
                                                                styles.itemChipName,
                                                                selectedItem?.id === item.id && styles.itemChipNameActive,
                                                            ]}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.itemChipPrice,
                                                                selectedItem?.id === item.id && styles.itemChipPriceActive,
                                                            ]}
                                                        >
                                                            Ksh {item.unitPrice} • {item.quantity} in stock
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                {/* Quantity (if item selected) */}
                                {selectedItem && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Quantity Sold</Text>
                                        <View style={styles.quantityRow}>
                                            <TouchableOpacity
                                                style={styles.qtyButton}
                                                onPress={() => {
                                                    const current = Number(saleQuantity) || 1;
                                                    if (current > 1) setSaleQuantity(String(current - 1));
                                                }}
                                            >
                                                <Text style={styles.qtyButtonText}>−</Text>
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.qtyInput}
                                                value={saleQuantity}
                                                onChangeText={setSaleQuantity}
                                                keyboardType="numeric"
                                            />
                                            <TouchableOpacity
                                                style={styles.qtyButton}
                                                onPress={() => {
                                                    const current = Number(saleQuantity) || 0;
                                                    if (current < selectedItem.quantity) {
                                                        setSaleQuantity(String(current + 1));
                                                    }
                                                }}
                                            >
                                                <Text style={styles.qtyButtonText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.helperText}>
                                            Total: Ksh {((Number(saleQuantity) || 1) * selectedItem.unitPrice).toLocaleString()}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Customer Name (Optional) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Customer Name (Optional)</Text>
                            <View style={styles.inputWithIcon}>
                                <User size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.inputWithPadding]}
                                    placeholder="e.g., John Doe"
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                        </View>

                        {/* Phone (Optional) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number (Optional)</Text>
                            <View style={styles.inputWithIcon}>
                                <Phone size={16} color={Colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, styles.inputWithPadding]}
                                    placeholder="e.g., 0712345678"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                        </View>

                        {/* Payment Method */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Payment Method</Text>
                            <View style={styles.paymentMethods}>
                                {['Cash', 'M-Pesa', 'Bank Transfer'].map(method => (
                                    <TouchableOpacity
                                        key={method}
                                        style={[
                                            styles.paymentChip,
                                            paymentMethod === method && styles.paymentChipActive,
                                        ]}
                                        onPress={() => setPaymentMethod(method)}
                                    >
                                        <Text
                                            style={[
                                                styles.paymentText,
                                                paymentMethod === method && styles.paymentTextActive,
                                            ]}
                                        >
                                            {method}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Notes (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Additional notes..."
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.footer}>
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
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    dialog: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    },
    header: {
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
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    content: {
        padding: Spacing.md,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 15,
        color: Colors.text,
    },
    inputWithIcon: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: Spacing.sm,
        top: Spacing.sm + 2,
        zIndex: 1,
    },
    inputWithPadding: {
        paddingLeft: Spacing.xl,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F7F7F7',
    },
    itemsList: {
        maxHeight: 200,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.xs,
    },
    itemChip: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    itemChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    itemChipContent: {
        gap: 4,
    },
    itemChipName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    itemChipNameActive: {
        color: Colors.surface,
    },
    itemChipPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    itemChipPriceActive: {
        color: Colors.surface + 'CC',
    },
    noItemsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.md,
        fontStyle: 'italic',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    qtyButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    qtyButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.primary,
    },
    qtyInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        paddingVertical: Spacing.sm,
    },
    helperText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    paymentMethods: {
        flexDirection: 'row',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    paymentChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 20,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    paymentChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    paymentText: {
        fontSize: 13,
        color: Colors.text,
        fontWeight: '500',
    },
    paymentTextActive: {
        color: Colors.surface,
    },
    footer: {
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
    submitButton: {
        backgroundColor: Colors.success,
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
});

export default AddCashSaleDialog;