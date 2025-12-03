import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Platform, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { ArrowLeft, Plus, CheckCircle, AlertTriangle, User, X, Search, DollarSign, Clock, Calendar, Phone, FileText } from 'lucide-react-native';
import CreditStorage from '../utils/CreditStorage';
import InventoryStorage from '../utils/InventoryStorage';
import NotificationService from '../services/NotificationService';

const CreditManagerScreen = ({ navigation }) => {
    const [credits, setCredits] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [showPartialPay, setShowPartialPay] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'overdue', 'cleared'
    const [searchExpanded, setSearchExpanded] = useState(false);
    const searchWidth = useRef(new Animated.Value(44)).current; // pill width

    const [form, setForm] = useState({
        customerName: '',
        itemName: '',
        inventoryItemId: null,
        quantity: '1',
        unitPrice: '',
        phone: '',
        notes: ''
    });

    const load = async () => {
        const list = await CreditStorage.loadCredits();
        setCredits(list);
        await NotificationService.checkCreditAlerts();
    };

    const loadInventory = async () => {
        const items = await InventoryStorage.loadInventory();
        setInventory(items);
    };

    useEffect(() => {
        load();
        loadInventory();
    }, []);

    const handleSelectInventory = (item) => {
        setForm(f => ({
            ...f,
            inventoryItemId: item.id,
            itemName: item.name,
            unitPrice: String(item.unitPrice)
        }));
    };

    const addCredit = async () => {
        if (!form.customerName.trim() || !form.itemName.trim()) {
            Alert.alert('Missing Info', 'Customer name and item are required');
            return;
        }
        const unit = Number(form.unitPrice);
        const qty = Number(form.quantity);
        if (isNaN(unit) || unit <= 0 || isNaN(qty) || qty <= 0) {
            Alert.alert('Invalid Input', 'Please enter valid quantity and unit price');
            return;
        }
        const credit = await CreditStorage.addCredit({
            customerName: form.customerName,
            itemName: form.itemName,
            inventoryItemId: form.inventoryItemId,
            quantity: qty,
            unitPrice: unit,
            phone: form.phone,
            notes: form.notes
        });
        if (credit.inventoryItemId) {
            await InventoryStorage.updateItem(credit.inventoryItemId, {
                quantity: (inventory.find(i => i.id === credit.inventoryItemId)?.quantity || 0) - qty
            });
        }
        setShowAdd(false);
        setForm({ customerName: '', itemName: '', inventoryItemId: null, quantity: '1', unitPrice: '', phone: '', notes: '' });
        load();
    };

    const getDaysOverdue = (dateCreated) => {
        const days = Math.floor((new Date() - new Date(dateCreated)) / (1000 * 60 * 60 * 24));
        return days;
    };

    const renderCredit = ({ item }) => {
        const pending = item.status === 'pending';
        const daysOld = getDaysOverdue(item.dateCreated);
        const isOverdue = pending && daysOld > 7;

        return (
            <TouchableOpacity
                style={[styles.creditCard, isOverdue && styles.overdueCard]}
                onPress={() => setShowDetail(item)}
                activeOpacity={0.7}
            >
                {/* Status Badge */}
                <View style={styles.cardHeader}>
                    <View style={styles.customerInfo}>
                        <View style={[
                            styles.avatarCircle,
                            { backgroundColor: pending ? (isOverdue ? '#FEE2E2' : '#FEF3C7') : '#D1FAE5' }
                        ]}>
                            <Text style={[
                                styles.avatarText,
                                { color: pending ? (isOverdue ? Colors.error : '#F59E0B') : Colors.success }
                            ]}>
                                {item.customerName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.nameSection}>
                            <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
                            <View style={styles.metaRow}>
                                <Calendar size={12} color={Colors.textSecondary} />
                                <Text style={styles.metaText}>
                                    {new Date(item.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                                {isOverdue && (
                                    <>
                                        <Text style={styles.metaDot}>•</Text>
                                        <Text style={styles.overdueText}>{daysOld} days overdue</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                    <View style={[
                        styles.statusPill,
                        pending ? (isOverdue ? styles.overduePill : styles.pendingPill) : styles.clearedPill
                    ]}>
                        {pending ? (
                            isOverdue ? <AlertTriangle size={12} color={Colors.error} /> : <Clock size={12} color="#F59E0B" />
                        ) : (
                            <CheckCircle size={12} color={Colors.success} />
                        )}
                        <Text style={[
                            styles.statusText,
                            { color: pending ? (isOverdue ? Colors.error : '#F59E0B') : Colors.success }
                        ]}>
                            {pending ? (isOverdue ? 'Overdue' : 'Pending') : 'Cleared'}
                        </Text>
                    </View>
                </View>

                {/* Item Details */}
                <View style={styles.itemSection}>
                    <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Item:</Text>
                        <Text style={styles.itemValue} numberOfLines={1}>{item.itemName}</Text>
                    </View>
                    <View style={styles.itemRow}>
                        <Text style={styles.itemLabel}>Qty:</Text>
                        <Text style={styles.itemValue}>{item.quantity}</Text>
                    </View>
                </View>

                {/* Amount Section */}
                <View style={styles.amountSection}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Total Amount</Text>
                        <Text style={styles.totalAmount}>Ksh {item.totalAmount.toLocaleString()}</Text>
                    </View>
                    {item.remainingBalance < item.totalAmount && (
                        <View style={styles.paidRow}>
                            <Text style={styles.paidLabel}>Paid: Ksh {(item.totalAmount - item.remainingBalance).toLocaleString()}</Text>
                        </View>
                    )}
                    <View style={styles.remainingRow}>
                        <Text style={styles.remainingLabel}>Balance Due</Text>
                        <Text style={[styles.remainingAmount, { color: pending ? Colors.error : Colors.success }]}>
                            Ksh {item.remainingBalance.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar */}
                {item.remainingBalance < item.totalAmount && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${((item.totalAmount - item.remainingBalance) / item.totalAmount) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round(((item.totalAmount - item.remainingBalance) / item.totalAmount) * 100)}% paid
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const recordPayment = async (amount, note) => {
        const ok = await CreditStorage.recordPayment(showDetail.id, amount, note);
        if (ok) {
            const updated = await CreditStorage.loadCredits();
            setCredits(updated);
            setShowDetail(updated.find(c => c.id === showDetail.id));
        }
    };

    const clearCredit = async () => {
        await CreditStorage.clearCredit(showDetail.id, 'Cleared');
        const updated = await CreditStorage.loadCredits();
        setCredits(updated);
        setShowDetail(updated.find(c => c.id === showDetail.id));
    };

    // Filter credits
    const getFilteredCredits = () => {
        let filtered = credits;

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(c =>
                c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.itemName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply status filter
        if (activeFilter === 'pending') {
            filtered = filtered.filter(c => c.status === 'pending');
        } else if (activeFilter === 'overdue') {
            filtered = filtered.filter(c => {
                const daysOld = getDaysOverdue(c.dateCreated);
                return c.status === 'pending' && daysOld > 7;
            });
        } else if (activeFilter === 'cleared') {
            filtered = filtered.filter(c => c.status === 'cleared');
        }

        return filtered;
    };

    // Calculate summary statistics
    const getSummaryStats = () => {
        const pendingCredits = credits.filter(c => c.status === 'pending');
        const totalPending = pendingCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
        const overdueCredits = pendingCredits.filter(c => getDaysOverdue(c.dateCreated) > 7);

        return {
            totalPending: totalPending,
            pendingCount: pendingCredits.length,
            overdueCount: overdueCredits.length,
            totalCustomers: new Set(credits.map(c => c.customerName)).size
        };
    };

    const stats = getSummaryStats();
    const filteredCredits = getFilteredCredits();

    const toggleSearch = () => {
        Animated.timing(searchWidth, {
            toValue: searchExpanded ? 44 : 220, // collapsed/expanded width
            duration: 200,
            useNativeDriver: false,
        }).start(() => setSearchExpanded(!searchExpanded));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.title}>Credit Manager</Text>
                <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
                    {searchExpanded ? (
                        <>
                            <Search size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search credits..."
                                placeholderTextColor={Colors.textLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={toggleSearch}
                            >
                                <X size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.searchBtn} onPress={toggleSearch}>
                            <Search size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            {/* Horizontal Stat Cards */}
            {credits.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsContainer}
                    contentContainerStyle={styles.statsContent}
                >
                    <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                        <DollarSign size={20} color={Colors.primary} />
                        <Text style={styles.statValue}>Ksh {stats.totalPending.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Pending Balance</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                        <Clock size={20} color={Colors.warning || '#F59E0B'} />
                        <Text style={styles.statValue}>{stats.pendingCount}</Text>
                        <Text style={styles.statLabel}>Pending Credits</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                        <AlertTriangle size={20} color={Colors.error} />
                        <Text style={styles.statValue}>{stats.overdueCount}</Text>
                        <Text style={styles.statLabel}>Overdue</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                        <User size={20} color={Colors.success} />
                        <Text style={styles.statValue}>{stats.totalCustomers}</Text>
                        <Text style={styles.statLabel}>Customers</Text>
                    </View>
                </ScrollView>
            )}

            {/* Credit List */}
            <FlatList
                data={filteredCredits}
                keyExtractor={c => c.id}
                renderItem={renderCredit}
                contentContainerStyle={[
                    styles.listContent,
                    credits.length === 0 && styles.emptyListContent
                ]}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <AlertTriangle size={40} color={Colors.textLight} />
                        </View>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No matching credits found' : 'No credit entries yet'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Tap the + button to add a customer who took items on credit'}
                        </Text>
                    </View>
                }
            />

            {/* Add Credit Modal - Enhanced */}
            <Modal
                visible={showAdd}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAdd(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={styles.modalIconContainer}>
                                    <Plus size={20} color={Colors.primary} />
                                </View>
                                <Text style={styles.modalTitle}>New Credit Entry</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.modalCloseBtn}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Customer Info Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Customer Information</Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Customer Name *</Text>
                                    <View style={styles.inputContainer}>
                                        <User size={18} color={Colors.textSecondary} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter customer name"
                                            value={form.customerName}
                                            onChangeText={t => setForm(f => ({ ...f, customerName: t }))}
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                                    <View style={styles.inputContainer}>
                                        <Phone size={18} color={Colors.textSecondary} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter phone number"
                                            keyboardType="phone-pad"
                                            value={form.phone}
                                            onChangeText={t => setForm(f => ({ ...f, phone: t }))}
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Item Info Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Item Details</Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Item / Product *</Text>
                                    <View style={styles.inputContainer}>
                                        <FileText size={18} color={Colors.textSecondary} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter item name"
                                            value={form.itemName}
                                            onChangeText={t => setForm(f => ({ ...f, itemName: t, inventoryItemId: null }))}
                                            placeholderTextColor={Colors.textLight}
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginRight: Spacing.sm }]}>
                                        <Text style={styles.inputLabel}>Quantity *</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={[styles.textInput, { paddingLeft: Spacing.sm }]}
                                                placeholder="0"
                                                value={form.quantity}
                                                onChangeText={t => setForm(f => ({ ...f, quantity: t }))}
                                                keyboardType="numeric"
                                                placeholderTextColor={Colors.textLight}
                                            />
                                        </View>
                                    </View>

                                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Unit Price *</Text>
                                        <View style={styles.inputContainer}>
                                            <Text style={styles.currencySymbol}>Ksh</Text>
                                            <TextInput
                                                style={[styles.textInput, { paddingLeft: Spacing.xs }]}
                                                placeholder="0"
                                                value={form.unitPrice}
                                                onChangeText={t => setForm(f => ({ ...f, unitPrice: t }))}
                                                keyboardType="numeric"
                                                placeholderTextColor={Colors.textLight}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Quick Select from Inventory */}
                                {inventory.length > 0 && (
                                    <View style={styles.inventorySection}>
                                        <Text style={styles.inventoryLabel}>Or select from inventory:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {inventory.map(item => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        styles.inventoryChip,
                                                        form.inventoryItemId === item.id && styles.inventoryChipActive
                                                    ]}
                                                    onPress={() => handleSelectInventory(item)}
                                                >
                                                    <Text style={[
                                                        styles.inventoryChipText,
                                                        form.inventoryItemId === item.id && styles.inventoryChipTextActive
                                                    ]}>
                                                        {item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Notes Section */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
                                <View style={[styles.inputContainer, { alignItems: 'flex-start', paddingTop: Spacing.sm }]}>
                                    <TextInput
                                        style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                        placeholder="Add any notes or comments..."
                                        multiline
                                        value={form.notes}
                                        onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                                        placeholderTextColor={Colors.textLight}
                                    />
                                </View>
                            </View>

                            {/* Total Preview */}
                            {form.quantity && form.unitPrice && !isNaN(Number(form.quantity)) && !isNaN(Number(form.unitPrice)) && (
                                <View style={styles.totalPreview}>
                                    <Text style={styles.totalPreviewLabel}>Total Credit Amount</Text>
                                    <Text style={styles.totalPreviewValue}>
                                        Ksh {(Number(form.quantity) * Number(form.unitPrice)).toLocaleString()}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={() => setShowAdd(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.saveBtn]}
                                onPress={addCredit}
                            >
                                <Text style={styles.saveBtnText}>Add Credit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Detail Modal - Enhanced */}
            <Modal visible={!!showDetail} animationType="slide" transparent>
                <View style={styles.detailOverlay}>
                    {showDetail && (
                        <View style={styles.detailModal}>
                            {/* Header */}
                            <View style={styles.detailHeader}>
                                <View style={styles.detailHeaderLeft}>
                                    <View style={[
                                        styles.detailAvatar,
                                        { backgroundColor: showDetail.status === 'pending' ? '#FEF3C7' : '#D1FAE5' }
                                    ]}>
                                        <Text style={[
                                            styles.detailAvatarText,
                                            { color: showDetail.status === 'pending' ? '#F59E0B' : Colors.success }
                                        ]}>
                                            {showDetail.customerName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.detailCustomerName}>{showDetail.customerName}</Text>
                                        <View style={styles.detailMetaRow}>
                                            <Calendar size={14} color={Colors.textSecondary} />
                                            <Text style={styles.detailMetaText}>
                                                {new Date(showDetail.dateCreated).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setShowDetail(null)} style={styles.detailCloseBtn}>
                                    <X size={24} color={Colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                                {/* Item Details */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Item Details</Text>
                                    <View style={styles.detailInfoCard}>
                                        <View style={styles.detailInfoRow}>
                                            <Text style={styles.detailInfoLabel}>Product</Text>
                                            <Text style={styles.detailInfoValue}>{showDetail.itemName}</Text>
                                        </View>
                                        <View style={styles.detailInfoRow}>
                                            <Text style={styles.detailInfoLabel}>Quantity</Text>
                                            <Text style={styles.detailInfoValue}>{showDetail.quantity} units</Text>
                                        </View>
                                        <View style={styles.detailInfoRow}>
                                            <Text style={styles.detailInfoLabel}>Unit Price</Text>
                                            <Text style={styles.detailInfoValue}>Ksh {showDetail.unitPrice.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Amount Summary */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Amount Summary</Text>
                                    <View style={styles.amountSummaryCard}>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Total Amount</Text>
                                            <Text style={styles.summaryValue}>Ksh {showDetail.totalAmount.toLocaleString()}</Text>
                                        </View>
                                        {showDetail.remainingBalance < showDetail.totalAmount && (
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: Colors.success }]}>Amount Paid</Text>
                                                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                                                    Ksh {(showDetail.totalAmount - showDetail.remainingBalance).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.balanceLabel}>Balance Due</Text>
                                            <Text style={[
                                                styles.balanceValue,
                                                { color: showDetail.status === 'pending' ? Colors.error : Colors.success }
                                            ]}>
                                                Ksh {showDetail.remainingBalance.toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Payment History */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Payment History</Text>
                                    {showDetail.payments.length === 0 ? (
                                        <View style={styles.noPaymentsCard}>
                                            <DollarSign size={32} color={Colors.textLight} />
                                            <Text style={styles.noPaymentsText}>No payments recorded yet</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.paymentsCard}>
                                            {showDetail.payments.map(p => (
                                                <View key={p.id} style={styles.paymentItem}>
                                                    <View style={styles.paymentLeft}>
                                                        <View style={styles.paymentIcon}>
                                                            <CheckCircle size={16} color={Colors.success} />
                                                        </View>
                                                        <View>
                                                            <Text style={styles.paymentAmount}>Ksh {p.amount.toLocaleString()}</Text>
                                                            <Text style={styles.paymentDate}>
                                                                {new Date(p.date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                })}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {p.note && (
                                                        <Text style={styles.paymentNote}>{p.note}</Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Notes */}
                                {showDetail.notes && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Notes</Text>
                                        <View style={styles.notesCard}>
                                            <Text style={styles.notesText}>{showDetail.notes}</Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Action Buttons */}
                            {showDetail.status === 'pending' && (
                                <View style={styles.detailActions}>
                                    <TouchableOpacity
                                        style={styles.partialPayBtn}
                                        onPress={() => {
                                            if (Platform.OS === 'ios') {
                                                Alert.prompt('Partial Payment', 'Enter amount paid', async val => {
                                                    if (!val) return;
                                                    const num = Number(val);
                                                    if (isNaN(num) || num <= 0) return;
                                                    await recordPayment(num, 'Partial');
                                                });
                                            } else {
                                                setShowPartialPay(true);
                                            }
                                        }}
                                    >
                                        <DollarSign size={18} color={Colors.primary} />
                                        <Text style={styles.partialPayBtnText}>Record Payment</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.clearFullBtn} onPress={clearCredit}>
                                        <CheckCircle size={18} color={Colors.surface} />
                                        <Text style={styles.clearFullBtnText}>Mark as Cleared</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Delete Button */}
                            <View style={styles.detailDeleteSection}>
                                <TouchableOpacity
                                    style={styles.detailDeleteBtn}
                                    onPress={() => {
                                        Alert.alert(
                                            'Delete Credit Entry',
                                            'Are you sure you want to delete this credit entry? This action cannot be undone.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        await CreditStorage.deleteCredit(showDetail.id);
                                                        setShowDetail(null);
                                                        load();
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.detailDeleteBtnText}>Delete Credit Entry</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Partial Payment Modal */}
            <Modal
                visible={showPartialPay}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPartialPay(false)}
            >
                <View style={styles.partialOverlay}>
                    <View style={styles.partialModal}>
                        <Text style={styles.partialTitle}>Record Payment</Text>
                        <Text style={styles.partialSubtitle}>Enter the amount paid by the customer</Text>
                        <View style={styles.partialInputContainer}>
                            <Text style={styles.partialCurrency}>Ksh</Text>
                            <TextInput
                                style={styles.partialInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={partialAmount}
                                onChangeText={setPartialAmount}
                                autoFocus
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>
                        <View style={styles.partialActions}>
                            <TouchableOpacity
                                style={[styles.partialActionBtn, styles.partialCancelBtn]}
                                onPress={() => {
                                    setShowPartialPay(false);
                                    setPartialAmount('');
                                }}
                            >
                                <Text style={styles.partialCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.partialActionBtn, styles.partialConfirmBtn]}
                                onPress={async () => {
                                    const num = Number(partialAmount);
                                    if (isNaN(num) || num <= 0) {
                                        Alert.alert('Invalid Amount', 'Please enter a valid amount');
                                        return;
                                    }
                                    await recordPayment(num, 'Partial payment');
                                    setShowPartialPay(false);
                                    setPartialAmount('');
                                }}
                            >
                                <Text style={styles.partialConfirmText}>Record Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Floating Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowAdd(true)}
                activeOpacity={0.8}
            >
                <Plus size={28} color={Colors.surface} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 24,
        paddingHorizontal: 0,
        justifyContent: 'space-between',
    },
    backBtn: {
        padding: 8,
        marginLeft: 12,
    },
    title: {
        flex: 1,
        color: Colors.surface,
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 15,
        height: 44,
        overflow: 'hidden',
        marginRight: 12,
        paddingHorizontal: 10,
    },
    searchBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 25,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: Colors.text,
        fontSize: 15,
        padding: 0,
        backgroundColor: 'transparent',
    },
    closeButton: {
        padding: 6,
        marginLeft: 4,
    },
    statsContainer: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    statsContent: {
        gap: Spacing.sm,
        alignItems: 'center',
    },
    statCard: {
        width: 140,
        borderRadius: 16,
        padding: Spacing.md,
        alignItems: 'center',
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
        textAlign: 'center',
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    creditCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    overdueCard: {
        borderColor: Colors.error,
        borderWidth: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    nameSection: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    metaDot: {
        fontSize: 12,
        color: Colors.textLight,
    },
    overdueText: {
        fontSize: 11,
        color: Colors.error,
        fontWeight: '600',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pendingPill: {
        backgroundColor: '#FEF3C7',
    },
    overduePill: {
        backgroundColor: '#FEE2E2',
    },
    clearedPill: {
        backgroundColor: '#D1FAE5',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    itemSection: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    itemRow: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    amountSection: {
        paddingTop: Spacing.sm,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    amountLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    totalAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    paidRow: {
        marginBottom: 4,
    },
    paidLabel: {
        fontSize: 11,
        color: Colors.success,
    },
    remainingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    remainingLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    remainingAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    progressContainer: {
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    progressBar: {
        height: 6,
        backgroundColor: Colors.background,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.success,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: Colors.textSecondary,
        textAlign: 'right',
    },
    emptyState: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
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
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    modalCloseBtn: {
        padding: Spacing.xs,
    },
    modalScroll: {
        padding: Spacing.md,
    },
    formSection: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    inputWrapper: {
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.sm,
        height: 48,
        gap: Spacing.xs,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    currencySymbol: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    rowInputs: {
        flexDirection: 'row',
    },
    inventorySection: {
        marginTop: Spacing.sm,
    },
    inventoryLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    inventoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 20,
        marginRight: Spacing.xs,
    },
    inventoryChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    inventoryChipText: {
        fontSize: 12,
        color: Colors.text,
        fontWeight: '500',
    },
    inventoryChipTextActive: {
        color: Colors.surface,
    },
    totalPreview: {
        backgroundColor: Colors.primary + '10',
        borderRadius: 12,
        padding: Spacing.md,
        marginTop: Spacing.sm,
        alignItems: 'center',
    },
    totalPreviewLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    totalPreviewValue: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
    },
    modalActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
    detailOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    detailModal: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    detailHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    detailAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailAvatarText: {
        fontSize: 24,
        fontWeight: '700',
    },
    detailCustomerName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    detailMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    detailMetaText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    detailCloseBtn: {
        padding: Spacing.xs,
    },
    detailScroll: {
        padding: Spacing.md,
    },
    detailSection: {
        marginBottom: Spacing.lg,
    },
    detailSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    detailInfoCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    detailInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailInfoLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    detailInfoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    amountSummaryCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    summaryLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    balanceLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    noPaymentsCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    noPaymentsText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    paymentsCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    paymentItem: {
        paddingVertical: Spacing.xs,
    },
    paymentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    paymentIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    paymentDate: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    paymentNote: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
        marginLeft: 44,
    },
    notesCard: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
    },
    notesText: {
        fontSize: 13,
        color: Colors.text,
        lineHeight: 20,
    },
    detailActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    partialPayBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.background,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    partialPayBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    clearFullBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.success,
        paddingVertical: Spacing.md,
        borderRadius: 12,
    },
    clearFullBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.surface,
    },
    detailDeleteSection: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.sm,
    },
    detailDeleteBtn: {
        backgroundColor: Colors.error + '10',
        paddingVertical: Spacing.sm,
        borderRadius: 12,
        alignItems: 'center',
    },
    detailDeleteBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },
    partialOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    partialModal: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: Spacing.lg,
    },
    partialTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    partialSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    partialInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 56,
        marginBottom: Spacing.lg,
    },
    partialCurrency: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginRight: Spacing.xs,
    },
    partialInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        padding: 0,
    },
    partialActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    partialActionBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    partialCancelBtn: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    partialCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    partialConfirmBtn: {
        backgroundColor: Colors.primary,
    },
    partialConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg + 10,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.lg,
        elevation: 8,
    },
});

export default CreditManagerScreen;