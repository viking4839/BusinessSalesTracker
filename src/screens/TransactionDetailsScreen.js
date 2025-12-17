import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    Modal, TextInput, Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import {
    ArrowDownLeft, ArrowUpRight, Calendar, Clock, Building2,
    User, MessageSquare, Hash, TrendingUp, Tag, ArrowLeft, Package,
    CheckCircle, XCircle, Plus, Minus, Trash2, Search, X
} from 'lucide-react-native';
import Button from '../components/Button';
import InventoryStorage from '../utils/InventoryStorage';
import TransactionStorage from '../utils/TransactionStorage';
import TransactionInventoryMatcher from '../utils/TransactionInventoryMatcher';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import { DeviceEventEmitter } from 'react-native';

const TransactionDetailsScreen = ({ route, navigation }) => {
    const { transaction } = route.params;
    const [localTransaction, setLocalTransaction] = useState(transaction);
    const [showMultiItemModal, setShowMultiItemModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [showCartModal, setShowCartModal] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchInventory, setSearchInventory] = useState('');
    const isIncoming = Number(localTransaction.amount) > 0;

    // Load inventory when component mounts
    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        const items = await InventoryStorage.loadInventory();
        setInventory(items.filter(item => item.quantity > 0)); // Only show items in stock
    };

    // Handle confirming a single match
    const handleConfirmMatch = async (matchItem, quantity) => {
        try {
            console.log('🔗 Confirming match:', matchItem.name, 'x', quantity);

            await TransactionInventoryMatcher.confirmMatch(
                localTransaction,
                matchItem,
                quantity
            );

            const updated = {
                ...localTransaction,
                inventoryMatch: {
                    ...localTransaction.inventoryMatch,
                    userConfirmed: true,
                    confirmedAt: new Date().toISOString(),
                    confirmedItem: matchItem,
                    confirmedQuantity: quantity
                },
                linkedInventoryId: matchItem.id,
                linkedInventoryName: matchItem.name,
                saleQuantity: quantity,
                stockDeducted: true,
                items: [{
                    id: matchItem.id,
                    name: matchItem.name,
                    quantity: quantity,
                    unitPrice: matchItem.unitPrice,
                    wholesalePrice: matchItem.wholesalePrice || matchItem.unitPrice,
                    total: matchItem.unitPrice * quantity
                }]
            };

            setLocalTransaction(updated);

            const allTransactions = await TransactionStorage.loadTransactions();
            const idx = allTransactions.findIndex(t => t.id === updated.id);
            if (idx !== -1) {
                allTransactions[idx] = updated;
                await TransactionStorage.saveTransactions(allTransactions);
            }

            // Regenerate profit report
            await ProfitReportStorage.refreshTodaysReport();

            DeviceEventEmitter.emit('profitReportUpdated');
            DeviceEventEmitter.emit('transactions:updated');

            Alert.alert(
                '✅ Linked Successfully',
                `Transaction linked to ${matchItem.name}\n${quantity} units deducted from inventory\n\nProfit report has been updated!`,
                [{ text: 'Great!', onPress: () => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' }) }]
            );

        } catch (error) {
            console.error('handleConfirmMatch error:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to link inventory. Please try again.'
            );
        }
    };

    // Handle multiple item selection modal
    const handleOpenMultiItemModal = () => {
        const match = localTransaction.inventoryMatch;
        if (match && match.matchType === 'multiple') {
            const preSelected = match.matches.map(m => ({
                item: m.item,
                quantity: m.suggestedQuantity || 1
            }));
            setSelectedItems(preSelected);
            setShowMultiItemModal(true);
        }
    };

    // Update quantity for a selected item
    const updateItemQuantity = (itemId, change) => {
        setSelectedItems(prev =>
            prev.map(si => {
                if (si.item.id === itemId) {
                    const newQty = Math.max(0, si.quantity + change);
                    return { ...si, quantity: newQty };
                }
                return si;
            })
        );
    };

    // Remove item from selection
    const removeItem = (itemId) => {
        setSelectedItems(prev => prev.filter(si => si.item.id !== itemId));
    };

    // Confirm multiple items
    const handleConfirmMultipleItems = async () => {
        try {
            const validItems = selectedItems.filter(si => si.quantity > 0);

            if (validItems.length === 0) {
                Alert.alert('No Items Selected', 'Please select at least one item with quantity > 0');
                return;
            }

            const totalValue = validItems.reduce((sum, si) =>
                sum + (si.item.unitPrice * si.quantity), 0
            );

            const transactionAmount = Math.abs(Number(localTransaction.amount));
            const difference = Math.abs(totalValue - transactionAmount);

            if (difference > 1) {
                Alert.alert(
                    'Amount Mismatch',
                    `Selected items total: Ksh ${totalValue.toLocaleString()}\n` +
                    `Transaction amount: Ksh ${transactionAmount.toLocaleString()}\n\n` +
                    `Difference: Ksh ${difference.toLocaleString()}\n\n` +
                    `Do you want to proceed anyway?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Proceed', onPress: () => confirmMultipleItemsLink(validItems) }
                    ]
                );
            } else {
                await confirmMultipleItemsLink(validItems);
            }

        } catch (error) {
            console.error('handleConfirmMultipleItems error:', error);
            Alert.alert('Error', 'Failed to link items');
        }
    };

    // Actually link multiple items
    const confirmMultipleItemsLink = async (validItems) => {
        try {
            const inventoryData = await InventoryStorage.loadInventory();

            for (const si of validItems) {
                const itemIndex = inventoryData.findIndex(item => item.id === si.item.id);
                if (itemIndex !== -1) {
                    if (inventoryData[itemIndex].quantity < si.quantity) {
                        throw new Error(`Insufficient stock for ${si.item.name}`);
                    }
                    inventoryData[itemIndex].quantity -= si.quantity;
                }
            }

            await InventoryStorage.saveInventory(inventoryData);

            const updated = {
                ...localTransaction,
                inventoryMatch: {
                    ...localTransaction.inventoryMatch,
                    userConfirmed: true,
                    confirmedAt: new Date().toISOString(),
                },
                isMultiItem: true,
                stockDeducted: true,
                items: validItems.map(si => ({
                    id: si.item.id,
                    name: si.item.name,
                    quantity: si.quantity,
                    unitPrice: si.item.unitPrice,
                    wholesalePrice: si.item.wholesalePrice || si.item.unitPrice,
                    total: si.item.unitPrice * si.quantity
                }))
            };

            const allTransactions = await TransactionStorage.loadTransactions();
            const txIndex = allTransactions.findIndex(t => t.id === localTransaction.id);
            if (txIndex !== -1) {
                allTransactions[txIndex] = updated;
                await TransactionStorage.saveTransactions(allTransactions);
            }

            // Regenerate profit report with linked items
            await ProfitReportStorage.refreshTodaysReport();

            setLocalTransaction(updated);
            setShowMultiItemModal(false);

            DeviceEventEmitter.emit('profitReportUpdated');
            DeviceEventEmitter.emit('transactions:updated');

            Alert.alert(
                '✅ Multiple Items Linked',
                `Linked ${validItems.length} items to this transaction\nInventory and profit report updated!`,
                [{ text: 'Great!', onPress: () => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' }) }]
            );

        } catch (error) {
            console.error('confirmMultipleItemsLink error:', error);
            Alert.alert('Error', error.message || 'Failed to link items');
        }
    };

    // Handle dismissing a match suggestion
    const handleDismissMatch = async () => {
        try {
            console.log('❌ Dismissing match for transaction:', localTransaction.id);

            await TransactionInventoryMatcher.dismissMatch(localTransaction);

            const updated = {
                ...localTransaction,
                inventoryMatch: {
                    ...localTransaction.inventoryMatch,
                    userDismissed: true,
                    dismissedAt: new Date().toISOString()
                }
            };

            setLocalTransaction(updated);

            Alert.alert(
                'Match Dismissed',
                'This suggestion won\'t show again for this transaction.',
                [{ text: 'OK', onPress: () => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' }) }]
            );

        } catch (error) {
            console.error('handleDismissMatch error:', error);
            Alert.alert('Error', 'Failed to dismiss match');
        }
    };

    // === CART FEATURE FUNCTIONS ===

    // Add item to cart
    const addToCart = (inventoryItem) => {
        const existingIndex = cartItems.findIndex(ci => ci.id === inventoryItem.id);

        if (existingIndex !== -1) {
            const updated = [...cartItems];
            updated[existingIndex].quantity += 1;
            setCartItems(updated);
        } else {
            setCartItems([...cartItems, {
                id: inventoryItem.id,
                name: inventoryItem.name,
                unitPrice: inventoryItem.unitPrice,
                wholesalePrice: inventoryItem.wholesalePrice || inventoryItem.unitPrice,
                availableStock: inventoryItem.quantity,
                quantity: 1
            }]);
        }
    };

    // Update cart item quantity
    const updateCartItemQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(itemId);
            return;
        }

        const updated = cartItems.map(ci => {
            if (ci.id === itemId) {
                return { ...ci, quantity: Math.min(newQuantity, ci.availableStock) };
            }
            return ci;
        });
        setCartItems(updated);
    };

    // Remove item from cart
    const removeFromCart = (itemId) => {
        setCartItems(cartItems.filter(ci => ci.id !== itemId));
    };

    // Calculate cart totals
    const getCartTotal = () => {
        return cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    // Check if cart total matches transaction amount
    const cartMatchesTransaction = () => {
        const cartTotal = getCartTotal();
        const transactionAmount = Math.abs(Number(localTransaction.amount));
        const difference = Math.abs(cartTotal - transactionAmount);
        return difference <= 1;
    };

    // Link cart items to transaction
    const handleLinkCart = async () => {
        try {
            const cartTotal = getCartTotal();
            const transactionAmount = Math.abs(Number(localTransaction.amount));
            const difference = Math.abs(cartTotal - transactionAmount);

            if (difference > 1) {
                Alert.alert(
                    'Amount Mismatch',
                    `Cart total: Ksh ${cartTotal.toLocaleString()}\n` +
                    `Transaction amount: Ksh ${transactionAmount.toLocaleString()}\n` +
                    `Difference: Ksh ${difference.toLocaleString()}\n\n` +
                    `Please adjust quantities to match the transaction amount.`,
                    [{ text: 'OK' }]
                );
                return;
            }

            if (cartItems.length === 0) {
                Alert.alert('Empty Cart', 'Please add items to the cart first');
                return;
            }

            const inventoryData = await InventoryStorage.loadInventory();

            for (const cartItem of cartItems) {
                const itemIndex = inventoryData.findIndex(item => item.id === cartItem.id);
                if (itemIndex !== -1) {
                    if (inventoryData[itemIndex].quantity < cartItem.quantity) {
                        throw new Error(`Insufficient stock for ${cartItem.name}`);
                    }
                    inventoryData[itemIndex].quantity -= cartItem.quantity;
                }
            }

            await InventoryStorage.saveInventory(inventoryData);

            const updated = {
                ...localTransaction,
                isMultiItem: true,
                stockDeducted: true,
                cartLinked: true,
                items: cartItems.map(ci => ({
                    id: ci.id,
                    name: ci.name,
                    quantity: ci.quantity,
                    unitPrice: ci.unitPrice,
                    wholesalePrice: ci.wholesalePrice,
                    total: ci.unitPrice * ci.quantity
                }))
            };

            const allTransactions = await TransactionStorage.loadTransactions();
            const txIndex = allTransactions.findIndex(t => t.id === localTransaction.id);
            if (txIndex !== -1) {
                allTransactions[txIndex] = updated;
                await TransactionStorage.saveTransactions(allTransactions);
            }

            // Regenerate profit report with new cart-linked transaction
            await ProfitReportStorage.refreshTodaysReport();

            setLocalTransaction(updated);
            setShowCartModal(false);
            setCartItems([]);

            DeviceEventEmitter.emit('profitReportUpdated');
            DeviceEventEmitter.emit('transactions:updated');

            Alert.alert(
                '✅ Cart Linked Successfully',
                `Linked ${cartItems.length} items to this transaction\nTotal: Ksh ${cartTotal.toLocaleString()}\n\nInventory and profit report updated!`,
                [{ text: 'Great!', onPress: () => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' }) }]
            );

        } catch (error) {
            console.error('handleLinkCart error:', error);
            Alert.alert('Error', error.message || 'Failed to link cart items');
        }
    };

    // Render single match suggestion
    const renderSingleMatchSuggestion = () => {
        const match = localTransaction.inventoryMatch;
        if (!match || match.matchType !== 'single') return null;
        if (match.userConfirmed || match.userDismissed) return null;

        return (
            <View style={[styles.section, styles.suggestionCard]}>
                <View style={styles.suggestionHeader}>
                    <Package size={20} color={Colors.primary} />
                    <Text style={styles.suggestionTitle}>Inventory Match Found!</Text>
                </View>
                <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionItemName}>{match.item.name}</Text>
                    <Text style={styles.suggestionDetails}>
                        {match.suggestedQuantity} × Ksh {match.item.unitPrice.toLocaleString()} = Ksh {Math.abs(Number(localTransaction.amount)).toLocaleString()}
                    </Text>
                    <Text style={styles.suggestionStock}>
                        Stock available: {match.item.quantity} units
                    </Text>
                </View>
                <View style={styles.suggestionActions}>
                    <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={handleDismissMatch}
                    >
                        <XCircle size={16} color={Colors.textSecondary} />
                        <Text style={styles.dismissText}>Not this item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirmMatch(match.item, match.suggestedQuantity)}
                    >
                        <CheckCircle size={16} color={Colors.surface} />
                        <Text style={styles.confirmText}>Link & Update Stock</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render multiple match suggestion
    const renderMultipleMatchSuggestion = () => {
        const match = localTransaction.inventoryMatch;
        if (!match || match.matchType !== 'multiple') return null;
        if (match.userConfirmed || match.userDismissed) return null;

        return (
            <View style={[styles.section, styles.suggestionCard, { backgroundColor: '#fef3c7' }]}>
                <View style={styles.suggestionHeader}>
                    <Package size={20} color="#f59e0b" />
                    <Text style={styles.suggestionTitle}>
                        {match.matches.length} Possible Matches
                    </Text>
                </View>
                <Text style={styles.suggestionSubtitle}>
                    Select one item or multiple items that were sold:
                </Text>
                {match.matches.slice(0, 3).map((m, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.matchOption}
                        onPress={() => handleConfirmMatch(m.item, m.suggestedQuantity)}
                    >
                        <View style={styles.matchOptionContent}>
                            <Text style={styles.matchOptionName}>{m.item.name}</Text>
                            <Text style={styles.matchOptionDetails}>
                                {m.suggestedQuantity} × Ksh {m.item.unitPrice} • {m.item.quantity} in stock
                            </Text>
                        </View>
                        <ArrowUpRight size={18} color={Colors.primary} />
                    </TouchableOpacity>
                ))}

                <View style={styles.suggestionActions}>
                    <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={handleDismissMatch}
                    >
                        <XCircle size={16} color={Colors.textSecondary} />
                        <Text style={styles.dismissText}>None of these</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleOpenMultiItemModal}
                    >
                        <Plus size={16} color={Colors.surface} />
                        <Text style={styles.confirmText}>Link Multiple Items</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render cart option button
    const renderCartOption = () => {
        if (localTransaction.linkedInventoryId || localTransaction.items || !isIncoming) return null;

        return (
            <View style={[styles.section, styles.cartOptionCard]}>
                <View style={styles.cartOptionHeader}>
                    <View>
                        <Text style={styles.cartOptionTitle}>Multiple Items Purchase?</Text>
                        <Text style={styles.cartOptionSubtitle}>
                            Add cart items to match the transaction amount
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => setShowCartModal(true)}
                    >
                        <Package size={18} color={Colors.surface} />
                        <Text style={styles.cartButtonText}>Add Cart</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render confirmed linked inventory
    const renderLinkedInventory = () => {
        if (!localTransaction.linkedInventoryId && !localTransaction.items) return null;

        return (
            <View style={[styles.section, styles.inventorySection]}>
                <View style={styles.sectionHeader}>
                    <Package size={18} color={Colors.success} />
                    <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Linked Inventory</Text>
                </View>
                <View style={styles.card}>
                    {localTransaction.isMultiItem && localTransaction.items ? (
                        <>
                            <Text style={styles.multiItemHeader}>
                                {localTransaction.items.length} items linked
                            </Text>
                            {localTransaction.items.map((item, idx) => (
                                <View key={idx} style={styles.linkedItem}>
                                    <View style={styles.linkedItemLeft}>
                                        <Text style={styles.linkedItemName}>{item.name}</Text>
                                        <Text style={styles.linkedItemQty}>
                                            {item.quantity} × Ksh {item.unitPrice.toLocaleString()}
                                        </Text>
                                    </View>
                                    <Text style={styles.linkedItemTotal}>
                                        Ksh {item.total.toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.linkedItemTotal}>
                                <Text style={styles.linkedTotalLabel}>Total:</Text>
                                <Text style={styles.linkedTotalValue}>
                                    Ksh {localTransaction.items.reduce((s, i) => s + i.total, 0).toLocaleString()}
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Item</Text>
                                <Text style={styles.detailValue}>{localTransaction.linkedInventoryName}</Text>
                            </View>
                            {localTransaction.saleQuantity && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Quantity</Text>
                                    <Text style={styles.detailValue}>{localTransaction.saleQuantity} units</Text>
                                </View>
                            )}
                        </>
                    )}
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stock Updated</Text>
                        <Text style={[styles.detailValue, { color: Colors.success }]}>
                            {localTransaction.stockDeducted ? '✓ Yes' : '✗ No'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render Cart Modal
    const renderCartModal = () => {
        const filteredInventory = searchInventory
            ? inventory.filter(item =>
                item.name.toLowerCase().includes(searchInventory.toLowerCase())
            )
            : inventory;

        const cartTotal = getCartTotal();
        const transactionAmount = Math.abs(Number(localTransaction.amount));
        const remaining = transactionAmount - cartTotal;
        const isMatch = cartMatchesTransaction();

        return (
            <Modal
                visible={showCartModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowCartModal(false)}
            >
                <View style={styles.cartModalContainer}>
                    {/* Header */}
                    <View style={styles.cartModalHeader}>
                        <View>
                            <Text style={styles.cartModalTitle}>Build Transaction Cart</Text>
                            <Text style={styles.cartModalSubtitle}>
                                Transaction: Ksh {transactionAmount.toLocaleString()}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowCartModal(false)}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Cart Summary Bar */}
                    <View style={[styles.cartSummaryBar, isMatch && styles.cartSummaryBarMatch]}>
                        <View style={styles.cartSummaryLeft}>
                            <Text style={styles.cartSummaryLabel}>Cart Total:</Text>
                            <Text style={[styles.cartSummaryValue, isMatch && { color: Colors.success }]}>
                                Ksh {cartTotal.toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.cartSummaryRight}>
                            <Text style={styles.cartSummaryLabel}>
                                {remaining >= 0 ? 'Remaining:' : 'Over by:'}
                            </Text>
                            <Text style={[
                                styles.cartSummaryValue,
                                { color: remaining >= 0 ? '#F59E0B' : Colors.error }
                            ]}>
                                Ksh {Math.abs(remaining).toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Current Cart Items */}
                    {cartItems.length > 0 && (
                        <View style={styles.cartItemsSection}>
                            <Text style={styles.cartSectionTitle}>
                                Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {cartItems.map((item, idx) => (
                                    <View key={idx} style={styles.cartItemChip}>
                                        <View style={styles.cartItemChipContent}>
                                            <Text style={styles.cartItemChipName} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text style={styles.cartItemChipQty}>
                                                {item.quantity} × {item.unitPrice}
                                            </Text>
                                        </View>
                                        <View style={styles.cartItemChipActions}>
                                            <TouchableOpacity
                                                style={styles.cartItemChipBtn}
                                                onPress={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                            >
                                                <Minus size={12} color={Colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.cartItemChipBtn}
                                                onPress={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                                            >
                                                <Plus size={12} color={Colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.cartItemChipRemove}
                                                onPress={() => removeFromCart(item.id)}
                                            >
                                                <Trash2 size={12} color={Colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Search Inventory */}
                    <View style={styles.cartSearchSection}>
                        <Text style={styles.cartSectionTitle}>Add Items from Inventory</Text>
                        <View style={styles.cartSearchBar}>
                            <Search size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.cartSearchInput}
                                placeholder="Search inventory..."
                                value={searchInventory}
                                onChangeText={setSearchInventory}
                                placeholderTextColor={Colors.textLight}
                            />
                            {searchInventory.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchInventory('')}>
                                    <X size={18} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Inventory List */}
                    <ScrollView style={styles.cartInventoryList}>
                        {filteredInventory.length === 0 ? (
                            <View style={styles.cartEmptyState}>
                                <Package size={40} color={Colors.textLight} />
                                <Text style={styles.cartEmptyText}>
                                    {searchInventory ? 'No items found' : 'No inventory items available'}
                                </Text>
                            </View>
                        ) : (
                            filteredInventory.map((item, idx) => {
                                const inCart = cartItems.find(ci => ci.id === item.id);
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.cartInventoryItem, inCart && styles.cartInventoryItemInCart]}
                                        onPress={() => addToCart(item)}
                                    >
                                        <View style={styles.cartInventoryItemLeft}>
                                            <Text style={styles.cartInventoryItemName}>{item.name}</Text>
                                            <Text style={styles.cartInventoryItemDetails}>
                                                Ksh {item.unitPrice.toLocaleString()} • {item.quantity} in stock
                                            </Text>
                                        </View>
                                        {inCart ? (
                                            <View style={styles.cartInventoryBadge}>
                                                <Text style={styles.cartInventoryBadgeText}>
                                                    {inCart.quantity} in cart
                                                </Text>
                                            </View>
                                        ) : (
                                            <Plus size={20} color={Colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Link Cart Button */}
                    <View style={styles.cartModalFooter}>
                        <TouchableOpacity
                            style={styles.cartCancelBtn}
                            onPress={() => setShowCartModal(false)}
                        >
                            <Text style={styles.cartCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cartLinkBtn, !isMatch && styles.cartLinkBtnDisabled]}
                            onPress={handleLinkCart}
                            disabled={!isMatch}
                        >
                            <CheckCircle size={18} color={Colors.surface} />
                            <Text style={styles.cartLinkText}>
                                Link Cart ({cartItems.length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await TransactionStorage.deleteTransaction(localTransaction.id);
                            DeviceEventEmitter.emit('transactions:updated');

                            Alert.alert('Deleted', 'Transaction removed', [
                                { text: 'OK', onPress: () => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' }) }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete transaction');
                        }
                    }
                }
            ]
        );
    };

    const DetailRow = ({ icon: Icon, label, value, color }) => (
        <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
                <Icon size={18} color={color || Colors.textSecondary} style={{ marginRight: 10 }} />
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Transactions', { screen: 'AllTransactionsMain' })}
                >
                    <ArrowLeft size={22} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Transaction Details</Text>
            </View>

            {/* Amount Card */}
            <View style={[styles.amountCard, { backgroundColor: isIncoming ? '#ecfdf5' : '#fef2f2' }]}>
                <View style={styles.amountIcon}>
                    {isIncoming ? (
                        <ArrowDownLeft size={32} color={Colors.success} />
                    ) : (
                        <ArrowUpRight size={32} color={Colors.error} />
                    )}
                </View>
                <Text style={styles.amountLabel}>
                    {isIncoming ? 'Received' : 'Sent'}
                </Text>
                <Text style={[styles.amountValue, { color: isIncoming ? Colors.success : Colors.error }]}>
                    {isIncoming ? '+' : '-'} KSh {Math.abs(Number(localTransaction.amount) || 0).toLocaleString()}
                </Text>
                {localTransaction.isBusinessTransaction && (
                    <View style={styles.businessBadge}>
                        <TrendingUp size={14} color={Colors.primary} />
                        <Text style={styles.businessBadgeText}>Business Transaction</Text>
                    </View>
                )}
            </View>

            {/* Match Suggestions */}
            {renderSingleMatchSuggestion()}
            {renderMultipleMatchSuggestion()}

            {/* Cart Option */}
            {renderCartOption()}

            {/* Linked Inventory */}
            {renderLinkedInventory()}

            {/* Transaction Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Details</Text>
                <View style={styles.card}>
                    <DetailRow
                        icon={User}
                        label="From/To"
                        value={localTransaction.sender || localTransaction.from || 'Unknown'}
                    />
                    <DetailRow
                        icon={Building2}
                        label="Bank/Source"
                        value={localTransaction.bank || 'Manual Entry'}
                    />
                    <DetailRow
                        icon={Calendar}
                        label="Date"
                        value={new Date(localTransaction.timestamp || localTransaction.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    />
                    <DetailRow
                        icon={Clock}
                        label="Time"
                        value={new Date(localTransaction.timestamp || localTransaction.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    />
                    <DetailRow
                        icon={Hash}
                        label="Transaction ID"
                        value={localTransaction.id || 'N/A'}
                    />
                    <DetailRow
                        icon={Tag}
                        label="Source"
                        value={localTransaction.isManual ? 'Manual Entry' : 'SMS Parsed'}
                        color={localTransaction.isManual ? '#f59e0b' : '#06b6d4'}
                    />
                </View>
            </View>

            {/* Message/Description */}
            {localTransaction.message && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.card}>
                        <View style={styles.messageContainer}>
                            <MessageSquare size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
                            <Text style={styles.messageText}>{localTransaction.message}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Actions */}
            <View style={styles.section}>
                <Button
                    title="Delete Transaction"
                    onPress={handleDelete}
                    variant="outline"
                    style={{ borderColor: Colors.error }}
                    textStyle={{ color: Colors.error }}
                />
            </View>

            <View style={{ height: 40 }} />

            {/* Multi-Item Selection Modal */}
            <Modal
                visible={showMultiItemModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowMultiItemModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowMultiItemModal(false)}
                >
                    <Pressable
                        style={styles.multiItemModal}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Multiple Items</Text>
                            <TouchableOpacity onPress={() => setShowMultiItemModal(false)}>
                                <XCircle size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {selectedItems.map((si, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{si.item.name}</Text>
                                        <Text style={styles.itemPrice}>
                                            Ksh {si.item.unitPrice.toLocaleString()} each
                                        </Text>
                                    </View>
                                    <View style={styles.quantityControls}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateItemQuantity(si.item.id, -1)}
                                        >
                                            <Minus size={16} color={Colors.text} />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{si.quantity}</Text>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateItemQuantity(si.item.id, 1)}
                                        >
                                            <Plus size={16} color={Colors.text} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={() => removeItem(si.item.id)}
                                        >
                                            <Trash2 size={16} color={Colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.totalSection}>
                                <Text style={styles.totalLabel}>Total Selected:</Text>
                                <Text style={styles.totalValue}>
                                    Ksh {selectedItems.reduce((sum, si) =>
                                        sum + (si.item.unitPrice * si.quantity), 0
                                    ).toLocaleString()}
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={() => setShowMultiItemModal(false)}
                            >
                                <Text style={styles.cancelModalText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmModalBtn}
                                onPress={handleConfirmMultipleItems}
                            >
                                <Text style={styles.confirmModalText}>
                                    Link {selectedItems.filter(si => si.quantity > 0).length} Items
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Cart Modal */}
            {renderCartModal()}
        </ScrollView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    backButton: { marginRight: 16 },
    screenTitle: { ...Typography.subheading, color: Colors.text, fontWeight: '600' },
    amountCard: {
        margin: Spacing.md,
        padding: Spacing.xl,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.md,
    },
    amountIcon: { marginBottom: 12 },
    amountLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 8 },
    amountValue: { ...Typography.title, fontSize: 36, fontWeight: '800' },
    businessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#ede9fe',
        borderRadius: BorderRadius.md,
    },
    businessBadgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
    section: { padding: Spacing.md },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: { ...Typography.subheading, color: Colors.text, marginBottom: Spacing.sm },
    card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.sm },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    detailLabel: { ...Typography.body, color: Colors.textSecondary },
    detailValue: { ...Typography.body, color: Colors.text, fontWeight: '600', textAlign: 'right', flex: 1 },
    messageContainer: { flexDirection: 'row', alignItems: 'flex-start' },
    messageText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 20 },
    // Match suggestion styles
    suggestionCard: {
        backgroundColor: '#fefce8',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.xs,
    },
    suggestionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    suggestionSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    suggestionContent: {
        marginVertical: Spacing.sm,
    },
    suggestionItemName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    suggestionDetails: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    suggestionStock: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    suggestionActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    dismissBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dismissText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    confirmBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
    },
    confirmText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface,
    },
    matchOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    matchOptionContent: {
        flex: 1,
    },
    matchOptionName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    matchOptionDetails: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    inventorySection: {
        backgroundColor: '#ecfdf5',
        borderLeftWidth: 4,
        borderLeftColor: Colors.success,
    },
    multiItemHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
        paddingBottom: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    linkedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    linkedItemLeft: {
        flex: 1,
    },
    linkedItemName: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    linkedItemQty: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    linkedItemTotal: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    linkedTotalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 2,
        borderTopColor: Colors.border,
    },
    linkedTotalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.success,
        marginTop: 4,
    },

    // Multi-Item Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    multiItemModal: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '80%',
        ...Shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    modalContent: {
        padding: Spacing.md,
        maxHeight: 400,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 30,
        textAlign: 'center',
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.xs,
    },
    totalSection: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
    },
    modalActions: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelModalBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cancelModalText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    confirmModalBtn: {
        flex: 2,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    confirmModalText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },

    // Cart Option Card
    cartOptionCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: BorderRadius.lg,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    cartOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cartOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    cartOptionSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    cartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    cartButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface,
    },

    // Cart Modal
    cartModalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    cartModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    cartModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    cartModalSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    cartSummaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: '#FEF3C7',
        borderBottomWidth: 2,
        borderBottomColor: '#FCD34D',
    },
    cartSummaryBarMatch: {
        backgroundColor: '#D1FAE5',
        borderBottomColor: Colors.success,
    },
    cartSummaryLeft: {
        flex: 1,
    },
    cartSummaryRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    cartSummaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    cartSummaryValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
    },
    cartItemsSection: {
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    cartSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    cartItemChip: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 140,
    },
    cartItemChipContent: {
        marginBottom: Spacing.xs,
    },
    cartItemChipName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    cartItemChipQty: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    cartItemChipActions: {
        flexDirection: 'row',
        gap: 4,
    },
    cartItemChipBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartItemChipRemove: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartSearchSection: {
        padding: Spacing.md,
        backgroundColor: Colors.surface,
    },
    cartSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    cartSearchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    cartInventoryList: {
        flex: 1,
        padding: Spacing.md,
    },
    cartInventoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cartInventoryItemInCart: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.primary,
    },
    cartInventoryItemLeft: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    cartInventoryItemName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    cartInventoryItemDetails: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    cartInventoryBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    cartInventoryBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.surface,
    },
    cartEmptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    cartEmptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    cartModalFooter: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cartCancelBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cartCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    cartLinkBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
    },
    cartLinkBtnDisabled: {
        backgroundColor: Colors.border,
        opacity: 0.5,
    },
    cartLinkText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
});
export default TransactionDetailsScreen;