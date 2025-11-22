import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { ArrowLeft, Plus, CheckCircle, AlertTriangle, User, X } from 'lucide-react-native';
import CreditStorage from '../utils/CreditStorage';
import InventoryStorage from '../utils/InventoryStorage';

const CreditManagerScreen = ({ navigation }) => {
    const [credits, setCredits] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [inventory, setInventory] = useState([]);

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.title}>Credit Manager</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                    <Plus size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={credits}
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
            <Modal visible={showAdd} animationType="slide">
                <View style={styles.modal}>
                    <Text style={styles.modalTitle}>New Credit Entry</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Customer Name"
                        value={form.customerName}
                        onChangeText={t => setForm(f => ({ ...f, customerName: t }))}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone (optional)"
                        keyboardType="phone-pad"
                        value={form.phone}
                        onChangeText={t => setForm(f => ({ ...f, phone: t }))}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Item / Product"
                        value={form.itemName}
                        onChangeText={t => setForm(f => ({ ...f, itemName: t, inventoryItemId: null }))}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder="Quantity"
                            keyboardType="numeric"
                            value={form.quantity}
                            onChangeText={t => setForm(f => ({ ...f, quantity: t }))}
                        />
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder="Unit Price"
                            keyboardType="numeric"
                            value={form.unitPrice}
                            onChangeText={t => setForm(f => ({ ...f, unitPrice: t }))}
                        />
                    </View>
                    <TextInput
                        style={[styles.input, { height: 90 }]}
                        placeholder="Notes (optional)"
                        multiline
                        value={form.notes}
                        onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                    />
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

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={addCredit}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
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
                                            Alert.prompt('Partial Payment', 'Enter amount paid', async val => {
                                                if (!val) return;
                                                const num = Number(val);
                                                if (isNaN(num) || num <= 0) return;
                                                await recordPayment(num, 'Partial');
                                            });
                                        }}
                                    >
                                        <Text style={styles.partialText}>Partial Pay</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.clearBtn} onPress={clearCredit}>
                                        <Text style={styles.clearText}>Mark Cleared</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: Colors.surface },
    addBtn: {
        width: 40, height: 40, backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center'
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
    creditName: { fontSize: 13, fontWeight: '600', color: Colors.text },
    creditItem: { fontSize: 11, color: Colors.textSecondary },
    creditDate: { fontSize: 10, color: Colors.textLight },
    creditAmount: { fontSize: 14, fontWeight: '700' },
    empty: { alignItems: 'center', padding: Spacing.lg },
    emptyText: { fontSize: 15, fontWeight: '600', color: Colors.text },
    emptySub: { fontSize: 11, color: Colors.textSecondary },
    modal: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.surface },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
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
    modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    cancelBtn: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border
    },
    cancelText: { fontSize: 14, fontWeight: '600', color: Colors.text },
    saveBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center'
    },
    saveText: { fontSize: 14, fontWeight: '600', color: Colors.surface },
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
    detailName: { fontSize: 16, fontWeight: '700', color: Colors.text },
    detailLine: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
    detailNotes: { fontSize: 12, color: Colors.text, fontStyle: 'italic', marginVertical: 6 },
    payHeader: { fontSize: 13, fontWeight: '600', marginTop: Spacing.sm, marginBottom: 4 },
    noPayments: { fontSize: 11, color: Colors.textSecondary },
    paymentLine: { fontSize: 11, color: Colors.text },
    payActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    partialBtn: {
        flex: 1, backgroundColor: Colors.background,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border
    },
    partialText: { fontSize: 12, fontWeight: '600', color: Colors.text },
    clearBtn: {
        flex: 1, backgroundColor: Colors.success,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        alignItems: 'center'
    },
    clearText: { fontSize: 12, fontWeight: '600', color: Colors.surface }
});

export default CreditManagerScreen;