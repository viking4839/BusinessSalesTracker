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
    DeviceEventEmitter,
} from 'react-native';
import { X, DollarSign, User, Phone, Package, Trash2, Plus, Minus } from 'lucide-react-native';
import InventoryStorage from '../utils/InventoryStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import { Colors, Spacing, BorderRadius } from '../styles/Theme';

const AddCashSaleDialog = ({ visible, onClose, onAddSale, navigation }) => {
    const [amount, setAmount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [linkInventory, setLinkInventory] = useState(true);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [cart, setCart] = useState([]);

    useEffect(() => {
        if (visible) {
            loadInventory();
            resetForm();
        }
    }, [visible]);

    const loadInventory = async () => {
        try {
            const items = await InventoryStorage.loadInventory();
            setInventoryItems(items.filter(item => item.quantity > 0));
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
        setCart([]);
    };

    // Cart management
    const addToCart = (item) => {
        const inCart = cart.find(ci => ci.id === item.id);
        if (inCart) {
            if (inCart.quantity < item.quantity) {
                setCart(cart.map(ci =>
                    ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
                ));
            } else {
                Alert.alert('Insufficient Stock', `Only ${item.quantity} units available`);
            }
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(ci => ci.id !== itemId));
    };

    const updateCartQuantity = (itemId, qty) => {
        if (qty <= 0) {
            removeFromCart(itemId);
            return;
        }
        const inventoryItem = inventoryItems.find(item => item.id === itemId);
        if (inventoryItem && qty > inventoryItem.quantity) {
            Alert.alert('Insufficient Stock', `Only ${inventoryItem.quantity} units available`);
            return;
        }
        setCart(cart.map(ci =>
            ci.id === itemId ? { ...ci, quantity: qty } : ci
        ));
    };

    const getCartTotal = () => cart.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0);

    const handleSubmit = async () => {
        const totalAmount = linkInventory && cart.length > 0 ? getCartTotal() : Number(amount);

        if (!totalAmount || totalAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        if (linkInventory && cart.length > 0) {
            for (const ci of cart) {
                const inventoryItem = inventoryItems.find(item => item.id === ci.id);
                if (!inventoryItem || ci.quantity > inventoryItem.quantity) {
                    Alert.alert('Insufficient Stock', `Not enough stock for ${ci.name}. Only ${inventoryItem?.quantity || 0} units available.`);
                    return;
                }
            }
        }

        await submitSale(totalAmount);
    };

    const submitSale = async (finalAmount) => {
        if (linkInventory && cart.length > 0) {
            // STEP 1: Validate all items have sufficient stock BEFORE any updates
            for (const ci of cart) {
                const inventoryItem = inventoryItems.find(item => item.id === ci.id);
                if (!inventoryItem || ci.quantity > inventoryItem.quantity) {
                    Alert.alert(
                        'Insufficient Stock', 
                        `Not enough stock for ${ci.name}. Only ${inventoryItem?.quantity || 0} units available.`
                    );
                    return;
                }
            }

            // STEP 2: Update inventory for ALL items
            for (const ci of cart) {
                const success = await InventoryStorage.adjustQuantity(ci.id, -ci.quantity);
                if (!success) {
                    Alert.alert('Error', `Failed to update inventory for ${ci.name}`);
                    return;
                }
            }

            // STEP 3: Create a SINGLE combined sale with ALL items
            const combinedSaleData = {
                amount: finalAmount,
                customerName,
                phone,
                notes: notes || `Sale with ${cart.length} item(s)`,
                paymentMethod,
                timestamp: new Date().toISOString(),
                // CRITICAL: Include ALL items in a single transaction
                items: cart.map(ci => ({
                    id: ci.id,
                    name: ci.name,
                    quantity: ci.quantity,
                    unitPrice: ci.unitPrice,
                    wholesalePrice: ci.wholesalePrice || ci.unitPrice,
                    total: ci.unitPrice * ci.quantity
                })),
                isMultiItem: cart.length > 1,
                // Legacy fields for backward compatibility (use first item)
                linkedInventoryId: cart[0].id,
                linkedInventoryName: cart[0].name,
                saleQuantity: cart[0].quantity,
            };

            console.log(`📦 Recording combined sale with ${cart.length} items:`, 
                        cart.map(item => `${item.name} (${item.quantity})`).join(', '));

            // STEP 4: ONE call to onAddSale with ALL the data
            onAddSale(combinedSaleData);

        } else {
            // Non-inventory sale (manual amount entry)
            const saleData = {
                amount: finalAmount,
                customerName,
                phone,
                notes,
                paymentMethod,
                timestamp: new Date().toISOString(),
                items: [],
                isMultiItem: false,
            };
            onAddSale(saleData);
        }

        // STEP 5: UI cleanup and success notification
        resetForm();
        onClose();

        setTimeout(() => {
            let itemInfo = '';
            if (cart.length > 0) {
                itemInfo = '\n\nItems sold:';
                cart.forEach(item => {
                    itemInfo += `\n• ${item.name} (${item.quantity} × Ksh ${item.unitPrice})`;
                });
            }
            Alert.alert(
                '✅ Sale Recorded',
                `Total Amount: Ksh ${finalAmount.toLocaleString()}${itemInfo}\n\nSale has been added to your transactions.`,
                [{ text: 'Great!', style: 'default' }]
            );
        }, 300);

        // STEP 6: Refresh profit report and navigate
        await ProfitReportStorage.refreshTodaysReport();
        DeviceEventEmitter.emit('profitReportUpdated');
        navigation.navigate('ProfitMarginReport');
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
                            <Text style={styles.label}>
                                Amount (KSh) {linkInventory && cart.length > 0 ? '(Auto-calculated)' : '*'}
                            </Text>
                            <TextInput
                                style={[styles.input, linkInventory && cart.length > 0 && styles.autoCalculatedInput]}
                                placeholder="0"
                                value={linkInventory && cart.length > 0 ? getCartTotal().toString() : amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textLight}
                                editable={!linkInventory || cart.length === 0}
                            />
                            {linkInventory && cart.length > 0 && (
                                <Text style={styles.helperText}>
                                    Amount automatically calculated from cart
                                </Text>
                            )}
                        </View>

                        {/* Link to Inventory Toggle */}
                        <View style={styles.toggleContainer}>
                            <View style={styles.toggleLeft}>
                                <Package size={18} color={Colors.primary} />
                                <Text style={styles.toggleLabel}>Link to inventory items</Text>
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
                                    <Text style={styles.label}>Select Items</Text>
                                    {inventoryItems.length === 0 ? (
                                        <Text style={styles.noItemsText}>
                                            No inventory items available. Add stock first.
                                        </Text>
                                    ) : (
                                        <ScrollView style={styles.itemsList} nestedScrollEnabled>
                                            {inventoryItems.map(item => {
                                                const inCart = cart.find(ci => ci.id === item.id);
                                                const availableStock = item.quantity - (inCart ? inCart.quantity : 0);

                                                return (
                                                    <TouchableOpacity
                                                        key={item.id}
                                                        style={[
                                                            styles.itemChip,
                                                            inCart && styles.itemChipInCart,
                                                        ]}
                                                        onPress={() => addToCart(item)}
                                                    >
                                                        <View style={styles.itemChipContent}>
                                                            <Text style={styles.itemChipName}>
                                                                {item.name}
                                                            </Text>
                                                            <Text style={styles.itemChipPrice}>
                                                                Ksh {item.unitPrice} • {availableStock} available
                                                            </Text>
                                                            {inCart && (
                                                                <Text style={styles.inCartBadge}>
                                                                    In cart: {inCart.quantity}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                </View>

                                {/* Cart Summary */}
                                {cart.length > 0 && (
                                    <View style={styles.cartSection}>
                                        <Text style={styles.cartTitle}>Cart Items</Text>
                                        {cart.map((item) => (
                                            <View key={item.id} style={styles.cartItem}>
                                                <View style={styles.cartItemInfo}>
                                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                                    <Text style={styles.cartItemPrice}>
                                                        Ksh {item.unitPrice} × {item.quantity} = Ksh {(item.unitPrice * item.quantity).toLocaleString()}
                                                    </Text>
                                                </View>
                                                <View style={styles.cartItemActions}>
                                                    <View style={styles.quantityControls}>
                                                        <TouchableOpacity
                                                            style={styles.qtyButton}
                                                            onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                                                        >
                                                            <Minus size={16} color={Colors.text} />
                                                        </TouchableOpacity>
                                                        <Text style={styles.quantityText}>{item.quantity}</Text>
                                                        <TouchableOpacity
                                                            style={styles.qtyButton}
                                                            onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                                                        >
                                                            <Plus size={16} color={Colors.text} />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.removeButton}
                                                        onPress={() => removeFromCart(item.id)}
                                                    >
                                                        <Trash2 size={16} color={Colors.error} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={styles.cartTotal}>
                                            <Text style={styles.cartTotalLabel}>Cart Total:</Text>
                                            <Text style={styles.cartTotalAmount}>
                                                Ksh {getCartTotal().toLocaleString()}
                                            </Text>
                                        </View>
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
                            <Text style={styles.submitButtonText}>
                                Record Sale {cart.length > 0 ? `(${cart.length} items)` : ''}
                            </Text>
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
    autoCalculatedInput: {
        backgroundColor: '#F0F9FF',
        borderColor: Colors.primary,
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
    itemChipInCart: {
        backgroundColor: '#D4E7FF',
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
    itemChipPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    inCartBadge: {
        marginTop: 4,
        fontSize: 12,
        color: Colors.success,
        fontWeight: '500',
    },
    noItemsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: Spacing.md,
        fontStyle: 'italic',
    },
    cartSection: {
        marginTop: Spacing.md,
        padding: Spacing.sm,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    cartItemInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
    cartItemPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    cartItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        marginRight: Spacing.sm,
    },
    qtyButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    removeButton: {
        padding: Spacing.sm,
    },
    cartTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 2,
        borderTopColor: Colors.border,
    },
    cartTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    cartTotalAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.success,
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