import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import {
    ArrowDownLeft, ArrowUpRight, Calendar, Clock, Building2,
    User, MessageSquare, Hash, TrendingUp, Tag, ArrowLeft, Package, CheckCircle, XCircle
} from 'lucide-react-native';
import Button from '../components/Button';
import InventoryStorage from '../utils/InventoryStorage';
import TransactionStorage from '../utils/TransactionStorage';
// At the top with other imports, add:
import TransactionInventoryMatcher from '../utils/TransactionInventoryMatcher';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import { DeviceEventEmitter } from 'react-native';

const TransactionDetailsScreen = ({ route, navigation }) => {
    const { transaction } = route.params;
    const [localTransaction, setLocalTransaction] = useState(transaction);
    const isIncoming = Number(localTransaction.amount) > 0;

    const handleConfirmMatch = async (matchItem, quantity) => {
        try {
            console.log('🔗 Confirming match:', matchItem.name, 'x', quantity);

            // Use the new TransactionInventoryMatcher
            await TransactionInventoryMatcher.confirmMatch(
                localTransaction,
                matchItem,
                quantity
            );

            // Update local state with the confirmed match
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

            // Notify HomeScreen to refresh profit stats
            DeviceEventEmitter.emit('profitReportUpdated');
            // Notify all transactions screen to refresh
            DeviceEventEmitter.emit('transactions:updated');

            Alert.alert(
                '✅ Linked Successfully',
                `Transaction linked to ${matchItem.name}\n${quantity} units deducted from inventory\n\nProfit report has been updated!`,
                [{ text: 'Great!', onPress: () => navigation.goBack() }]
            );

        } catch (error) {
            console.error('handleConfirmMatch error:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to link inventory. Please try again.'
            );
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
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );

        } catch (error) {
            console.error('handleDismissMatch error:', error);
            Alert.alert('Error', 'Failed to dismiss match');
        }
    };

    // Render match suggestion card (single match)
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

    // Render match suggestion card (multiple matches)
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
                <Text style={styles.suggestionSubtitle}>Select the item that was sold:</Text>
                {match.matches.map((m, idx) => (
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
                <TouchableOpacity
                    style={[styles.dismissBtn, { marginTop: Spacing.sm }]}
                    onPress={handleDismissMatch}
                >
                    <XCircle size={16} color={Colors.textSecondary} />
                    <Text style={styles.dismissText}>None of these</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render confirmed linked inventory
    const renderLinkedInventory = () => {
        if (!localTransaction.linkedInventoryId) return null;

        return (
            <View style={[styles.section, styles.inventorySection]}>
                <View style={styles.sectionHeader}>
                    <Package size={18} color={Colors.success} />
                    <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Linked Inventory</Text>
                </View>
                <View style={styles.card}>
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
                            const allTransactions = await TransactionStorage.loadTransactions();
                            const updated = allTransactions.filter(t => t.id !== localTransaction.id);
                            await TransactionStorage.saveTransactions(updated);
                            Alert.alert('Deleted', 'Transaction removed', [
                                { text: 'OK', onPress: () => navigation.goBack() }
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
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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

            {/* NEW: Match Suggestions (show before other details) */}
            {renderSingleMatchSuggestion()}
            {renderMultipleMatchSuggestion()}

            {/* NEW: Linked Inventory (after confirmation) */}
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

            {/* Business Score */}
            {localTransaction.score !== undefined && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Business Score</Text>
                    <View style={styles.card}>
                        <View style={styles.scoreContainer}>
                            <View style={styles.scoreCircle}>
                                <Text style={styles.scoreValue}>{localTransaction.score}</Text>
                                <Text style={styles.scoreLabel}>/ 100</Text>
                            </View>
                            <View style={styles.scoreInfo}>
                                <Text style={styles.scoreTitle}>
                                    {localTransaction.score >= 70 ? 'High Confidence' :
                                        localTransaction.score >= 40 ? 'Medium Confidence' : 'Low Confidence'}
                                </Text>
                                <Text style={styles.scoreSubtitle}>
                                    {localTransaction.score >= 70 ? 'Likely a business transaction' :
                                        localTransaction.score >= 40 ? 'Possibly a business transaction' : 'Likely a personal transaction'}
                                </Text>
                            </View>
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
    scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreValue: { ...Typography.title, fontSize: 28, color: Colors.primary, fontWeight: '800' },
    scoreLabel: { ...Typography.caption, color: Colors.primary },
    scoreInfo: { flex: 1 },
    scoreTitle: { ...Typography.body, color: Colors.text, fontWeight: '600', marginBottom: 4 },
    scoreSubtitle: { ...Typography.caption, color: Colors.textSecondary },

    // NEW: Match suggestion styles
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
});

export default TransactionDetailsScreen;