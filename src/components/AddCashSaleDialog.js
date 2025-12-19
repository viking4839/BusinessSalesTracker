import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    DeviceEventEmitter,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { X, DollarSign, User, Package, Trash2, Plus, Minus, Search, Tag, AlertCircle, Receipt, Clock, Save, Percent, Calendar, CreditCard as CardIcon, Smartphone as PhoneIcon, MessageCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InventoryStorage from '../utils/InventoryStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import { Colors, Spacing, BorderRadius, Typography } from '../styles/Theme';

const { width } = Dimensions.get('window');

const AddCashSaleDialog = ({ visible, onClose, onAddSale, navigation }) => {
    const [amount, setAmount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Split payment support
    const [useSplitPayment, setUseSplitPayment] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [mpesaAmount, setMpesaAmount] = useState('');
    const [bankAmount, setBankAmount] = useState('');

    const [inventoryItems, setInventoryItems] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Quick actions
    const [showQuickDiscount, setShowQuickDiscount] = useState(false);
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState('');

    // New state for better UX
    const [activeTab, setActiveTab] = useState('items'); // 'items' or 'manual'
    const [showCustomerSection, setShowCustomerSection] = useState(false);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            loadInventoryAndCategories();
            loadRecentCustomers();
            resetForm();
            Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(0);
        }
    }, [visible]);

    const loadInventoryAndCategories = async () => {
        try {
            const items = await InventoryStorage.loadInventory();
            setInventoryItems(items.filter(item => item.quantity > 0));

            const catList = await InventoryStorage.loadCategories();
            if (catList && catList.length > 0) {
                setCategories(['All', ...catList]);
            }
        } catch (error) {
            console.error('Load inventory error:', error);
        }
    };

    const loadRecentCustomers = async () => {
        try {
            const transactions = await AsyncStorage.getItem('transactions');
            if (transactions) {
                const parsed = JSON.parse(transactions);
                const customers = [...new Set(parsed
                    .filter(t => t.customerName && t.customerName !== 'Unknown')
                    .map(t => t.customerName)
                    .slice(0, 10))];
                setRecentCustomers(customers);
            }
        } catch (error) {
            console.error('Load recent customers error:', error);
        }
    };

    const resetForm = () => {
        setAmount('');
        setCustomerName('');
        setCustomerPhone('');
        setNotes('');
        setPaymentMethod('Cash');
        setUseSplitPayment(false);
        setCashAmount('');
        setMpesaAmount('');
        setBankAmount('');
        setCart([]);
        setSearchQuery('');
        setSelectedCategory('All');
        setShowQuickDiscount(false);
        setDiscountValue('');
        setDiscountType('percent');
        setActiveTab('items');
        setShowCustomerSection(false);
    };

    // Filter inventory based on search and category
    const getFilteredInventory = () => {
        let filtered = inventoryItems;

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.category && item.category.toLowerCase().includes(query))
            );
        }

        return filtered;
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

    const getSubtotal = () => cart.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0);

    const getDiscount = () => {
        if (!showQuickDiscount || !discountValue) return 0;
        const subtotal = getSubtotal();
        if (discountType === 'percent') {
            const percent = Math.min(100, Math.max(0, Number(discountValue) || 0));
            return (subtotal * percent) / 100;
        } else {
            return Math.min(subtotal, Number(discountValue) || 0);
        }
    };

    const getCartTotal = () => {
        const subtotal = getSubtotal();
        const discount = getDiscount();
        return subtotal - discount;
    };

    const getSplitTotal = () => {
        const cash = Number(cashAmount) || 0;
        const mpesa = Number(mpesaAmount) || 0;
        const bank = Number(bankAmount) || 0;
        return cash + mpesa + bank;
    };

    const handleSubmit = async () => {
        const totalAmount = activeTab === 'items' ? getCartTotal() : Number(amount);

        if (!totalAmount || totalAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount or add items to cart');
            return;
        }

        // Validate split payment
        if (useSplitPayment) {
            const splitTotal = getSplitTotal();

            // Check if at least one payment method has amount > 0
            const hasValidPayment = Number(cashAmount) > 0 || Number(mpesaAmount) > 0 || Number(bankAmount) > 0;

            if (!hasValidPayment) {
                Alert.alert('Split Payment Required', 'Please enter at least one payment amount greater than 0');
                return;
            }

            if (splitTotal === 0) {
                Alert.alert('Invalid Payment', 'Please enter valid payment amounts');
                return;
            }

            // Allow small rounding differences (0.01)
            if (Math.abs(splitTotal - totalAmount) > 0.01) {
                Alert.alert(
                    'Payment Mismatch',
                    `Total: Ksh ${totalAmount.toLocaleString()}\nSplit payments: Ksh ${splitTotal.toLocaleString()}\n\nPlease adjust payment amounts.`,
                    [
                        {
                            text: 'Auto-correct',
                            onPress: () => {
                                // Auto-correct by distributing difference to cash
                                const difference = totalAmount - splitTotal;
                                setCashAmount(String(Number(cashAmount || 0) + difference));
                            }
                        },
                        { text: 'I\'ll fix it' }
                    ]
                );
                return;
            }
        }

        if (activeTab === 'items' && cart.length > 0) {
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
        const saleData = {
            amount: finalAmount,
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone || '',
            notes: notes || '',
            timestamp: new Date().toISOString(),
            items: [],
            isMultiItem: false,
            paymentMethod: paymentMethod, // Keep the original payment method as fallback
        };

        // Add payment info
        if (useSplitPayment) {
            saleData.isSplitPayment = true;
            saleData.splitPayments = {
                cash: Number(cashAmount) || 0,
                mpesa: Number(mpesaAmount) || 0,
                bank: Number(bankAmount) || 0
            };

            // Also include total from split payments for verification
            saleData.splitTotal = getSplitTotal();

            // Set payment method to "Split" instead of "Split Payment" for consistency
            saleData.paymentMethod = 'Split';

            // Include individual payment method details
            saleData.paymentBreakdown = [];

            if (Number(cashAmount) > 0) {
                saleData.paymentBreakdown.push({
                    method: 'Cash',
                    amount: Number(cashAmount)
                });
            }
            if (Number(mpesaAmount) > 0) {
                saleData.paymentBreakdown.push({
                    method: 'M-Pesa',
                    amount: Number(mpesaAmount)
                });
            }
            if (Number(bankAmount) > 0) {
                saleData.paymentBreakdown.push({
                    method: 'Bank',
                    amount: Number(bankAmount)
                });
            }
        } else {
            // Single payment method
            saleData.isSplitPayment = false;
            saleData.paymentMethod = paymentMethod;

            // For single payment, include the amount in breakdown too
            saleData.paymentBreakdown = [{
                method: paymentMethod,
                amount: finalAmount
            }];
        }

        // Rest of your existing code for items and discount...
        if (activeTab === 'items' && cart.length > 0) {
            // Update inventory for item-based sales
            for (const ci of cart) {
                const success = await InventoryStorage.adjustQuantity(ci.id, -ci.quantity);
                if (!success) {
                    Alert.alert('Error', `Failed to update inventory for ${ci.name}`);
                    return;
                }
            }

            saleData.items = cart.map(ci => ({
                id: ci.id,
                name: ci.name,
                quantity: ci.quantity,
                unitPrice: ci.unitPrice,
                wholesalePrice: ci.wholesalePrice || ci.unitPrice,
                total: ci.unitPrice * ci.quantity
            }));
            saleData.isMultiItem = cart.length > 1;
            if (cart.length === 1) {
                saleData.linkedInventoryId = cart[0].id;
                saleData.linkedInventoryName = cart[0].name;
                saleData.saleQuantity = cart[0].quantity;
            }
        }

        // Add discount info
        if (showQuickDiscount && discountValue) {
            saleData.discount = {
                type: discountType,
                value: Number(discountValue),
                amount: getDiscount()
            };
            saleData.subtotal = getSubtotal();
        }

        // Debug log to see what's being sent
        console.log('Sale Data being sent:', JSON.stringify(saleData, null, 2));

        onAddSale(saleData);
        resetForm();
        onClose();

        setTimeout(() => {
            Alert.alert(
                '✅ Sale Recorded',
                `Sale of Ksh ${finalAmount.toLocaleString()} has been recorded successfully.`,
                [{ text: 'Great!' }]
            );
        }, 300);

        await ProfitReportStorage.refreshTodaysReport();
        DeviceEventEmitter.emit('profitReportUpdated');

        // Navigate to profit report
        navigation.navigate('ProfitMarginReport');
    };

    const renderInventoryItem = ({ item }) => {
        const inCart = cart.find(ci => ci.id === item.id);
        const cartQuantity = inCart?.quantity || 0;
        const stockLevel = item.quantity <= 5 ? 'low' : item.quantity <= 15 ? 'medium' : 'high';

        return (
            <TouchableOpacity
                style={[
                    styles.inventoryCard,
                    inCart && styles.inventoryCardSelected,
                    stockLevel === 'low' && styles.lowStockCard
                ]}
                onPress={() => addToCart(item)}
                activeOpacity={0.7}
            >
                <View style={styles.inventoryCardHeader}>
                    <Package size={16} color={inCart ? Colors.primary : Colors.textSecondary} />
                    {cartQuantity > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cartQuantity}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.inventoryName} numberOfLines={2}>{item.name}</Text>
                {item.category && (
                    <View style={styles.categoryBadge}>
                        <Tag size={10} color={Colors.textSecondary} />
                        <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
                    </View>
                )}
                <Text style={styles.inventoryPrice}>Ksh {item.unitPrice.toLocaleString()}</Text>
                <View style={styles.stockContainer}>
                    <Text style={[
                        styles.inventoryStock,
                        stockLevel === 'low' && styles.lowStockText
                    ]}>
                        Stock: {item.quantity}
                    </Text>
                    {stockLevel === 'low' && (
                        <View style={styles.lowStockIndicator} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderCartItem = ({ item }) => (
        <View style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>
                    Ksh {item.unitPrice.toLocaleString()} × {item.quantity}
                </Text>
                <Text style={styles.cartItemTotal}>
                    Ksh {(item.unitPrice * item.quantity).toLocaleString()}
                </Text>
            </View>
            <View style={styles.cartItemControls}>
                <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                >
                    <Minus size={14} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                >
                    <Plus size={14} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeFromCart(item.id)}
                >
                    <Trash2 size={14} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const filteredInventory = getFilteredInventory();
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const total = activeTab === 'items' ? getCartTotal() : Number(amount) || 0;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconCircle}>
                            <DollarSign size={20} color={Colors.primary} strokeWidth={2.5} />
                        </View>
                        <View>
                            <Text style={styles.title}>Record Sale</Text>
                            <Text style={styles.subtitle}>Add transaction details</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'items' && styles.activeTab]}
                        onPress={() => setActiveTab('items')}
                    >
                        <Package size={16} color={activeTab === 'items' ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.tabText, activeTab === 'items' && styles.activeTabText]}>
                            With Items
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
                        onPress={() => setActiveTab('manual')}
                    >
                        <DollarSign size={16} color={activeTab === 'manual' ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
                            Manual Amount
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Cart Summary - Always Visible */}
                {(activeTab === 'items' && cart.length > 0) || (activeTab === 'manual' && amount) ? (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>
                                {activeTab === 'items' ? `${cart.length} Items` : 'Manual Sale'}
                            </Text>
                            {activeTab === 'items' && (
                                <TouchableOpacity onPress={() => setCart([])}>
                                    <Text style={styles.clearText}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {activeTab === 'items' && cart.length > 0 && (
                            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                                {cart.map(item => (
                                    <View key={item.id}>
                                        {renderCartItem({ item })}
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        <View style={styles.summaryDetails}>
                            {activeTab === 'items' && (
                                <>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                                        <Text style={styles.summaryValue}>Ksh {subtotal.toLocaleString()}</Text>
                                    </View>
                                    {showQuickDiscount && discount > 0 && (
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: Colors.success }]}>
                                                Discount:
                                            </Text>
                                            <Text style={[styles.summaryValue, { color: Colors.success }]}>
                                                -Ksh {discount.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                            <View style={[styles.summaryRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Total:</Text>
                                <Text style={styles.totalValue}>Ksh {total.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyCart}>
                        <Package size={48} color={Colors.border} />
                        <Text style={styles.emptyCartText}>
                            {activeTab === 'items' ? 'Add items from inventory' : 'Enter sale amount'}
                        </Text>
                    </View>
                )}

                {/* Main Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Customer Section */}
                    <TouchableOpacity
                        style={styles.customerToggle}
                        onPress={() => setShowCustomerSection(!showCustomerSection)}
                    >
                        <View style={styles.customerToggleHeader}>
                            <User size={18} color={Colors.primary} />
                            <Text style={styles.customerToggleText}>
                                {showCustomerSection ? '▼ Customer Details' : '▶ Add Customer Details (Optional)'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {showCustomerSection && (
                        <View style={styles.customerSection}>
                            <Text style={styles.label}>Customer Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={18} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Customer name"
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>

                            <Text style={styles.label}>Phone Number (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <PhoneIcon size={18} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="07XX XXX XXX"
                                    value={customerPhone}
                                    onChangeText={setCustomerPhone}
                                    keyboardType="phone-pad"
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>

                            {recentCustomers.length > 0 && (
                                <View style={styles.recentCustomers}>
                                    <Text style={styles.recentCustomersTitle}>Recent Customers:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {recentCustomers.map((name, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.recentCustomerChip}
                                                onPress={() => setCustomerName(name)}
                                            >
                                                <Text style={styles.recentCustomerText}>{name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Manual Amount Input */}
                    {activeTab === 'manual' && (
                        <View style={styles.section}>
                            <Text style={styles.label}>Sale Amount (Ksh)</Text>
                            <View style={styles.amountInputContainer}>
                                <DollarSign size={24} color={Colors.primary} />
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                            <View style={styles.quickAmounts}>
                                {[500, 1000, 2000, 5000].map(amt => (
                                    <TouchableOpacity
                                        key={amt}
                                        style={styles.quickAmountButton}
                                        onPress={() => setAmount(String(amt))}
                                    >
                                        <Text style={styles.quickAmountText}>Ksh {amt.toLocaleString()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Payment Method */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment Method</Text>

                        {/* Payment Method Cards */}
                        <View style={styles.paymentCards}>
                            {[
                                { method: 'Cash', icon: DollarSign, color: '#10B981' },
                                { method: 'M-Pesa', icon: PhoneIcon, color: '#4F46E5' },
                                { method: 'Bank', icon: CardIcon, color: '#F59E0B' },
                            ].map(({ method, icon: Icon, color }) => (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.paymentCard,
                                        !useSplitPayment && paymentMethod === method && { borderColor: color, backgroundColor: color + '10' }
                                    ]}
                                    onPress={() => {
                                        if (useSplitPayment) {
                                            Alert.alert(
                                                'Split Payment Active',
                                                'Please disable split payment to use single payment method',
                                                [{ text: 'OK' }]
                                            );
                                            return;
                                        }
                                        setPaymentMethod(method);
                                    }}
                                    disabled={useSplitPayment}
                                >
                                    <Icon size={24} color={!useSplitPayment && paymentMethod === method ? color : Colors.textSecondary} />
                                    <Text style={[
                                        styles.paymentCardText,
                                        !useSplitPayment && paymentMethod === method && { color: color, fontWeight: '700' }
                                    ]}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Split Payment Toggle */}
                        <TouchableOpacity
                            style={[
                                styles.splitPaymentToggle,
                                useSplitPayment && styles.splitPaymentToggleActive
                            ]}
                            onPress={() => {
                                setUseSplitPayment(!useSplitPayment);
                                if (!useSplitPayment) {
                                    // Switching to split payment
                                    setCashAmount('');
                                    setMpesaAmount('');
                                    setBankAmount('');
                                } else {
                                    // Switching back to single payment
                                    setCashAmount('');
                                    setMpesaAmount('');
                                    setBankAmount('');
                                    setPaymentMethod('Cash');
                                }
                            }}
                        >
                            <Receipt size={18} color={useSplitPayment ? Colors.surface : Colors.primary} />
                            <Text style={[
                                styles.splitPaymentToggleText,
                                useSplitPayment && styles.splitPaymentToggleTextActive
                            ]}>
                                {useSplitPayment ? 'Split Payment Active' : 'Use Split Payment'}
                            </Text>
                        </TouchableOpacity>

                        {/* Split Payment Inputs */}
                        {useSplitPayment && (
                            <View style={styles.splitPaymentContainer}>
                                <View style={styles.splitPaymentHeader}>
                                    <Text style={styles.splitPaymentTitle}>Split Payment Amounts</Text>
                                    <TouchableOpacity onPress={() => {
                                        const remaining = total - getSplitTotal();
                                        if (remaining > 0) {
                                            setCashAmount(String(Number(cashAmount || 0) + remaining));
                                        }
                                    }}>
                                        <Text style={styles.autoFillText}>Auto-fill</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.splitPaymentGrid}>
                                    <View style={styles.splitPaymentInputGroup}>
                                        <View style={[styles.splitPaymentIcon, { backgroundColor: '#DCFCE7' }]}>
                                            <DollarSign size={16} color={Colors.success} />
                                        </View>
                                        <Text style={styles.splitLabel}>Cash</Text>
                                        <TextInput
                                            style={styles.splitInput}
                                            placeholder="0"
                                            value={cashAmount}
                                            onChangeText={setCashAmount}
                                            keyboardType="numeric"
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                    <View style={styles.splitPaymentInputGroup}>
                                        <View style={[styles.splitPaymentIcon, { backgroundColor: '#DBEAFE' }]}>
                                            <PhoneIcon size={16} color={Colors.primary} />
                                        </View>
                                        <Text style={styles.splitLabel}>M-Pesa</Text>
                                        <TextInput
                                            style={styles.splitInput}
                                            placeholder="0"
                                            value={mpesaAmount}
                                            onChangeText={setMpesaAmount}
                                            keyboardType="numeric"
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                    <View style={styles.splitPaymentInputGroup}>
                                        <View style={[styles.splitPaymentIcon, { backgroundColor: '#FEF3C7' }]}>
                                            <CardIcon size={16} color="#F59E0B" />
                                        </View>
                                        <Text style={styles.splitLabel}>Bank</Text>
                                        <TextInput
                                            style={styles.splitInput}
                                            placeholder="0"
                                            value={bankAmount}
                                            onChangeText={setBankAmount}
                                            keyboardType="numeric"
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                </View>

                                {/* Split Payment Summary */}
                                <View style={styles.splitSummary}>
                                    <Text style={styles.splitSummaryLabel}>Split Total:</Text>
                                    <Text style={[
                                        styles.splitSummaryValue,
                                        Math.abs(getSplitTotal() - total) > 0.01 && styles.splitSummaryError
                                    ]}>
                                        Ksh {getSplitTotal().toLocaleString()}
                                    </Text>
                                </View>
                                {Math.abs(getSplitTotal() - total) > 0.01 && total > 0 && (
                                    <View style={styles.splitWarning}>
                                        <AlertCircle size={14} color={Colors.error} />
                                        <Text style={styles.splitWarningText}>
                                            Difference: Ksh {Math.abs(total - getSplitTotal()).toLocaleString()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Notes Section - Collapsible */}
                    <View style={styles.section}>
                        <View style={styles.notesHeader}>
                            <MessageCircle size={18} color={Colors.textSecondary} />
                            <Text style={styles.notesTitle}>Add Notes (Optional)</Text>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g., Customer preferences, special instructions, delivery details..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            placeholderTextColor={Colors.textLight}
                        />
                        <View style={styles.quickNotes}>
                            {['Regular Customer', 'Paid on Delivery', 'Credit Sale', 'Urgent Order'].map((note) => (
                                <TouchableOpacity
                                    key={note}
                                    style={styles.quickNoteButton}
                                    onPress={() => setNotes(prev => prev ? `${prev}, ${note}` : note)}
                                >
                                    <Text style={styles.quickNoteText}>{note}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Inventory Section - Only for Items Tab */}
                    {activeTab === 'items' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Items</Text>

                            {/* Search and Filter */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchBar}>
                                    <Search size={18} color={Colors.textSecondary} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search inventory..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholderTextColor={Colors.textLight}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <X size={18} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Quick Actions */}
                                <View style={styles.quickActions}>
                                    {showQuickDiscount ? (
                                        <View style={styles.discountInputRow}>
                                            <TouchableOpacity
                                                style={[styles.discountTypeBtn, discountType === 'percent' && styles.discountTypeBtnActive]}
                                                onPress={() => setDiscountType('percent')}
                                            >
                                                <Percent size={14} color={discountType === 'percent' ? Colors.surface : Colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.discountTypeBtn, discountType === 'amount' && styles.discountTypeBtnActive]}
                                                onPress={() => setDiscountType('amount')}
                                            >
                                                <DollarSign size={14} color={discountType === 'amount' ? Colors.surface : Colors.text} />
                                            </TouchableOpacity>
                                            <TextInput
                                                style={styles.discountInput}
                                                placeholder={discountType === 'percent' ? '0%' : '0'}
                                                value={discountValue}
                                                onChangeText={setDiscountValue}
                                                keyboardType="numeric"
                                                placeholderTextColor={Colors.textLight}
                                            />
                                            <TouchableOpacity onPress={() => {
                                                setShowQuickDiscount(false);
                                                setDiscountValue('');
                                            }}>
                                                <X size={18} color={Colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.addDiscountButton}
                                            onPress={() => setShowQuickDiscount(true)}
                                        >
                                            <Percent size={16} color={Colors.primary} />
                                            <Text style={styles.addDiscountText}>Add Discount</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Category Filter */}
                            {categories.length > 1 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.categoriesScroll}
                                    contentContainerStyle={styles.categoriesContent}
                                >
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.categoryChip,
                                                selectedCategory === cat && styles.categoryChipActive
                                            ]}
                                            onPress={() => setSelectedCategory(cat)}
                                        >
                                            <Text style={[
                                                styles.categoryChipText,
                                                selectedCategory === cat && styles.categoryChipTextActive
                                            ]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Inventory Grid */}
                            <View style={styles.inventoryContainer}>
                                {filteredInventory.length > 0 ? (
                                    <FlatList
                                        data={filteredInventory}
                                        renderItem={renderInventoryItem}
                                        keyExtractor={(item) => item.id}
                                        numColumns={3}
                                        columnWrapperStyle={styles.inventoryRow}
                                        scrollEnabled={false}
                                        nestedScrollEnabled={true}
                                    />
                                ) : (
                                    <View style={styles.emptyInventory}>
                                        <Package size={48} color={Colors.border} />
                                        <Text style={styles.emptyInventoryText}>
                                            {searchQuery || selectedCategory !== 'All'
                                                ? 'No items match your search'
                                                : 'No items in inventory'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitButton, total <= 0 && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={total <= 0}
                    >
                        <Save size={20} color={Colors.surface} />
                        <Text style={styles.submitButtonText}>
                            Record Sale (Ksh {total.toLocaleString()})
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    activeTab: {
        backgroundColor: Colors.primary + '10',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.primary,
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        maxHeight: 250,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    clearText: {
        fontSize: 13,
        color: Colors.error,
        fontWeight: '600',
    },
    cartList: {
        maxHeight: 150,
    },
    summaryDetails: {
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    summaryLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.success,
    },
    emptyCart: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    emptyCartText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    customerToggle: {
        marginTop: Spacing.md,
    },
    customerToggleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    customerToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    customerSection: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: Spacing.xs,
    },
    recentCustomers: {
        marginTop: Spacing.sm,
    },
    recentCustomersTitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    recentCustomerChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    recentCustomerText: {
        fontSize: 12,
        color: Colors.text,
    },
    section: {
        marginTop: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
        paddingVertical: Spacing.md,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.primary + '30',
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text,
        paddingVertical: Spacing.md,
    },
    quickAmounts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    quickAmountButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickAmountText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    paymentCards: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    paymentCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        gap: Spacing.xs,
    },
    paymentCardText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 4,
    },
    splitPaymentToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
        marginBottom: Spacing.sm,
    },
    splitPaymentToggleActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    splitPaymentToggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    splitPaymentToggleTextActive: {
        color: Colors.surface,
    },
    splitPaymentContainer: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.sm,
    },
    splitPaymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    splitPaymentTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    autoFillText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
    },
    splitPaymentGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    splitPaymentInputGroup: {
        flex: 1,
        alignItems: 'center',
    },
    splitPaymentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    splitLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    splitInput: {
        width: '100%',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
    },
    splitSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    splitSummaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    splitSummaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    splitSummaryError: {
        color: Colors.error,
    },
    splitWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: Colors.error + '10',
        borderRadius: BorderRadius.md,
    },
    splitWarningText: {
        fontSize: 13,
        color: Colors.error,
        fontWeight: '600',
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    textArea: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 14,
        color: Colors.text,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    quickNotes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    quickNoteButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickNoteText: {
        fontSize: 12,
        color: Colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    searchBar: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        paddingVertical: Spacing.sm,
    },
    quickActions: {
        flex: 1,
    },
    addDiscountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
    },
    addDiscountText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    discountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.xs,
    },
    discountTypeBtn: {
        padding: Spacing.xs,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.background,
    },
    discountTypeBtnActive: {
        backgroundColor: Colors.primary,
    },
    discountInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        paddingVertical: Spacing.sm,
        textAlign: 'center',
    },
    categoriesScroll: {
        marginBottom: Spacing.sm,
    },
    categoriesContent: {
        gap: Spacing.xs,
        paddingRight: Spacing.md,
    },
    categoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    categoryChipTextActive: {
        color: Colors.surface,
    },
    inventoryContainer: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        padding: Spacing.sm,
        minHeight: 300,
    },
    inventoryRow: {
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    inventoryCard: {
        flex: 1,
        backgroundColor: '#caf1ddff',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
    },
    inventoryCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    lowStockCard: {
        borderColor: Colors.error + '30',
        backgroundColor: Colors.error + '05',
    },
    inventoryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        position: 'relative',
        width: 40,
        height: 40,
    },
    cartBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.surface,
    },
    inventoryName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
        textAlign: 'center',
        minHeight: 36,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: Spacing.sm,
    },
    categoryText: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    inventoryPrice: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.success,
        marginBottom: 4,
    },
    stockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    inventoryStock: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    lowStockText: {
        color: Colors.error,
        fontWeight: '700',
    },
    lowStockIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error,
    },
    emptyInventory: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
    },
    emptyInventoryText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.xs,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    cartItemPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    cartItemTotal: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.success,
    },
    cartItemControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    quantityBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        minWidth: 24,
        textAlign: 'center',
    },
    deleteBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.error + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.xs,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    submitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.success,
    },
    submitButtonDisabled: {
        backgroundColor: Colors.textLight,
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.surface,
    },
});

export default AddCashSaleDialog;