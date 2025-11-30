import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Platform, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { ArrowLeft, Plus, CheckCircle, AlertTriangle, User, X, Search, DollarSign, Clock } from 'lucide-react-native';
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
    const [showSearch, setShowSearch] = useState(false);
    const [searchText, setSearchText] = useState('');

    // new: inline collapsible search
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchWidth] = useState(new Animated.Value(40));

    const toggleSearch = () => {
        if (searchExpanded) {
            Animated.timing(searchWidth, {
                toValue: 40,
                duration: 300,
                useNativeDriver: false,
            }).start(() => {
                setSearchExpanded(false);
                setSearchQuery('');
            });
        } else {
            setSearchExpanded(true);
            Animated.timing(searchWidth, {
                toValue: 160,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

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

        // Check for overdue credits
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
            Alert.alert('Missing', 'Customer and Item are required');
            return;
        }
        const unit = Number(form.unitPrice);
        const qty = Number(form.quantity);
        if (isNaN(unit) || unit <= 0 || isNaN(qty) || qty <= 0) {
            Alert.alert('Invalid', 'Enter valid quantity and unit price');
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
        // Optional stock deduction
        if (credit.inventoryItemId) {
            await InventoryStorage.updateItem(credit.inventoryItemId, {
                quantity: (inventory.find(i => i.id === credit.inventoryItemId)?.quantity || 0) - qty
            });
        }
        setShowAdd(false);
        setForm({ customerName: '', itemName: '', inventoryItemId: null, quantity: '1', unitPrice: '', phone: '', notes: '' });
        load();
    };

    const renderCredit = ({ item }) => {
        const pending = item.status === 'pending';
        return (
            <TouchableOpacity
                style={styles.creditRow}
                onPress={() => setShowDetail(item)}
                onLongPress={() => {
                    Alert.alert('Delete', 'Remove this credit entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => { await CreditStorage.deleteCredit(item.id); load(); } }
                    ]);
                }}
            >
                <View style={styles.creditLeft}>
                    <View style={[styles.statusBadge, pending ? styles.pendingBadge : styles.clearedBadge]}>
                        {pending ? <AlertTriangle size={14} color={Colors.surface} /> : <CheckCircle size={14} color={Colors.surface} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.creditName} numberOfLines={1}>{item.customerName}</Text>
                        <Text style={styles.creditItem} numberOfLines={1}>{item.itemName} • Qty {item.quantity}</Text>
                        <Text style={styles.creditDate}>{new Date(item.dateCreated).toLocaleDateString()}</Text>
                    </View>
                </View>
                <Text style={[styles.creditAmount, { color: pending ? Colors.error : Colors.success }]}>
                    Ksh {item.remainingBalance.toLocaleString()}
                </Text>
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

    // Filter credits for search
    const filteredCredits = (searchQuery.trim() || searchText.trim())
        ? (credits || []).filter(c =>
            (searchQuery || searchText).toLowerCase()
                ? (c.customerName.toLowerCase().includes((searchQuery || searchText).toLowerCase()) ||
                    c.itemName.toLowerCase().includes((searchQuery || searchText).toLowerCase()))
                : true
        )
        : credits;

    // Calculate summary statistics
    const getSummaryStats = () => {
        const pendingCredits = credits.filter(c => c.status === 'pending');
        const totalPending = pendingCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
        const overdueCredits = pendingCredits.filter(c => {
            const daysOld = (new Date() - new Date(c.dateCreated)) / (1000 * 60 * 60 * 24);
            return daysOld > 7; // Overdue if older than 7 days
        });

        return {
            totalPending: totalPending,
            pendingCount: pendingCredits.length,
            overdueCount: overdueCredits.length,
            totalCustomers: new Set(credits.map(c => c.customerName)).size
        };
    };

    const stats = getSummaryStats();

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
                                onPress={toggleSearch} // This animates and closes the search pill
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
                        <Clock size={20} color={Colors.warning} />
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

            <FlatList
                data={filteredCredits}
                keyExtractor={c => c.id}
                renderItem={renderCredit}
                contentContainerStyle={credits.length === 0 && { flexGrow: 1, justifyContent: 'center' }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No credit entries</Text>
                        <Text style={styles.emptySub}>Add a customer who took items on credit</Text>
                    </View>
                }
            />

            {/* Add Credit Modal */}
            <Modal
                visible={showAdd}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAdd(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerLeft}>
                                <View style={styles.iconContainer}>
                                    <AlertTriangle size={20} color={Colors.primary} />
                                </View>
                                <Text style={styles.modalTitle}>Add Credit Entry</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeButton}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                            {/* Form fields */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Customer Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Customer Name"
                                    value={form.customerName}
                                    onChangeText={t => setForm(f => ({ ...f, customerName: t }))}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone"
                                    keyboardType="phone-pad"
                                    value={form.phone}
                                    onChangeText={t => setForm(f => ({ ...f, phone: t }))}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Item / Product *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Item / Product"
                                    value={form.itemName}
                                    onChangeText={t => setForm(f => ({ ...f, itemName: t, inventoryItemId: null }))}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                                    <Text style={styles.label}>Quantity *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        value={form.quantity}
                                        onChangeText={t => setForm(f => ({ ...f, quantity: t }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textLight}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Unit Price *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        value={form.unitPrice}
                                        onChangeText={t => setForm(f => ({ ...f, unitPrice: t }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textLight}
                                    />
                                </View>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Notes (optional)</Text>
                                <TextInput
                                    style={[styles.input, { height: 90 }]}
                                    placeholder="Notes"
                                    multiline
                                    value={form.notes}
                                    onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                                    placeholderTextColor={Colors.textLight}
                                />
                            </View>
                            <View style={styles.inventoryStrip}>
                                <Text style={styles.invLabel}>Pick from inventory:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {inventory.map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.invChip,
                                                form.inventoryItemId === item.id && styles.invChipActive
                                            ]}
                                            onPress={() => handleSelectInventory(item)}
                                        >
                                            <Text style={styles.invChipText}>{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowAdd(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.addButton]}
                                onPress={addCredit}
                            >
                                <Text style={styles.addButtonText}>Add Credit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Detail Modal */}
            <Modal visible={!!showDetail} animationType="fade" transparent>
                <View style={styles.overlay}>
                    {showDetail && (
                        <View style={styles.detailCard}>
                            <TouchableOpacity style={styles.closeX} onPress={() => setShowDetail(null)}>
                                <X size={20} color={Colors.text} />
                            </TouchableOpacity>
                            <View style={styles.detailHeader}>
                                <User size={20} color={Colors.primary} />
                                <Text style={styles.detailName}>{showDetail.customerName}</Text>
                            </View>
                            <Text style={styles.detailLine}>Item: {showDetail.itemName} (Qty {showDetail.quantity})</Text>
                            <Text style={styles.detailLine}>Total: Ksh {showDetail.totalAmount.toLocaleString()}</Text>
                            <Text style={styles.detailLine}>Remaining: Ksh {showDetail.remainingBalance.toLocaleString()}</Text>
                            <Text style={styles.detailLine}>Status: {showDetail.status}</Text>
                            {showDetail.notes ? <Text style={styles.detailNotes}>{showDetail.notes}</Text> : null}
                            <Text style={styles.payHeader}>Payments</Text>
                            {showDetail.payments.length === 0 ? (
                                <Text style={styles.noPayments}>No payments yet</Text>
                            ) : (
                                showDetail.payments.map(p => (
                                    <Text key={p.id} style={styles.paymentLine}>
                                        • Ksh {p.amount.toLocaleString()} on {new Date(p.date).toLocaleDateString()}
                                        {p.note ? ` (${p.note})` : ''}
                                    </Text>
                                ))
                            )}
                            {showDetail.status === 'pending' && (
                                <View style={styles.payActions}>
                                    <TouchableOpacity
                                        style={styles.partialBtn}
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
                                        <Text style={styles.partialText}>Partial Pay</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.clearBtn} onPress={clearCredit}>
                                        <Text style={styles.clearText}>Mark Cleared</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <View style={styles.deleteActions}>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => {
                                        Alert.alert(
                                            'Delete Credit',
                                            'Are you sure you want to delete this credit entry?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete', style: 'destructive', onPress: async () => {
                                                        await CreditStorage.deleteCredit(showDetail.id);
                                                        setShowDetail(null);
                                                        load();
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.deleteText}>Delete Credit</Text>
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
                <View style={styles.overlay}>
                    <View style={[styles.detailCard, { padding: 24 }]}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Partial Payment</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            value={partialAmount}
                            onChangeText={setPartialAmount}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setShowPartialPay(false);
                                    setPartialAmount('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.addButton]}
                                onPress={async () => {
                                    const num = Number(partialAmount);
                                    if (isNaN(num) || num <= 0) return;
                                    await recordPayment(num, 'Partial');
                                    setShowPartialPay(false);
                                    setPartialAmount('');
                                }}
                            >
                                <Text style={styles.addButtonText}>Pay</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Search Modal */}
            <Modal
                visible={showSearch}
                animationType="fade"
                transparent
                onRequestClose={() => setShowSearch(false)}
            >
                <View style={styles.overlay}>
                    <View style={[styles.detailCard, { padding: 24 }]}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Search Credits</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="Search by customer or item"
                            value={searchText}
                            onChangeText={setSearchText}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => {
                                setShowSearch(false);
                                setSearchText('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Floating Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowAdd(true)}
                activeOpacity={0.8}
            >
                <View style={styles.fabCircle}>
                    <Plus size={28} color={Colors.surface} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.surface,
    },
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg + 10,
        zIndex: 10,
    },
    fabCircle: {
        backgroundColor: Colors.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    creditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border
    },
    creditLeft: { flexDirection: 'row', flex: 1, alignItems: 'center', gap: Spacing.sm },
    statusBadge: {
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center'
    },
    pendingBadge: { backgroundColor: '#F59E0B' },
    clearedBadge: { backgroundColor: Colors.success },
    creditName: { fontSize: 15, fontWeight: '600', color: Colors.text },
    creditItem: { fontSize: 12, color: Colors.textSecondary },
    creditDate: { fontSize: 12, color: Colors.textLight },
    creditAmount: { fontSize: 15, fontWeight: '700' },
    empty: { alignItems: 'center', padding: Spacing.lg },
    emptyText: { fontSize: 15, fontWeight: '600', color: Colors.text },
    emptySub: { fontSize: 11, color: Colors.textSecondary },
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
    closeButton: {
        padding: Spacing.xs,
    },
    scrollView: {
        padding: Spacing.md,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        fontSize: 14,
        color: Colors.text
    },
    row: { flexDirection: 'row', gap: Spacing.sm },
    half: { flex: 1 },
    inventoryStrip: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm
    },
    invLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
    invChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 20,
        marginRight: 6
    },
    invChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    invChipText: { fontSize: 11, color: Colors.text },
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
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg
    },
    detailCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg
    },
    closeX: { position: 'absolute', top: 10, right: 10 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    detailName: { fontSize: 17, fontWeight: '700', color: Colors.text },
    detailLine: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
    detailNotes: { fontSize: 13, color: Colors.text, fontStyle: 'italic', marginVertical: 6 },
    payHeader: { fontSize: 14, fontWeight: '600', marginTop: Spacing.sm, marginBottom: 4 },
    noPayments: { fontSize: 11, color: Colors.textSecondary },
    paymentLine: { fontSize: 13, color: Colors.text },
    payActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    partialBtn: {
        flex: 1, backgroundColor: Colors.background,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border
    },
    partialText: { fontSize: 14, fontWeight: '600', color: Colors.text },
    clearBtn: {
        flex: 1, backgroundColor: Colors.success,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        alignItems: 'center'
    },
    clearText: { fontSize: 14, fontWeight: '600', color: Colors.surface },
    deleteActions: {
        marginTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.md
    },
    deleteBtn: {
        backgroundColor: Colors.error,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center'
    },
    deleteText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface
    },
    searchBtn: {
        width: 25,
        height: 40,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.xs,
        height: 40,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        padding: 0,
    },
    statsContainer: {
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.md,
    },
    statsContent: {
        paddingRight: Spacing.md,
        gap: Spacing.sm,
    },
    statCard: {
        width: 140,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginRight: Spacing.sm,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        marginTop: Spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});

export default CreditManagerScreen;