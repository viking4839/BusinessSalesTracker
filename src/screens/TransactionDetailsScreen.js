import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import {
    ArrowDownLeft, ArrowUpRight, Calendar, Clock, Building2,
    User, MessageSquare, Hash, TrendingUp, Tag
} from 'lucide-react-native';
import Button from '../components/Button';

const TransactionDetailsScreen = ({ route, navigation }) => {
    const { transaction } = route.params;
    const isIncoming = Number(transaction.amount) > 0;

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
                            const data = await AsyncStorage.getItem('transactions');
                            const transactions = data ? JSON.parse(data) : [];
                            const updated = transactions.filter(t => t.id !== transaction.id);
                            await AsyncStorage.setItem('transactions', JSON.stringify(updated));
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
                    {isIncoming ? '+' : '-'} KSh {Math.abs(Number(transaction.amount) || 0).toLocaleString()}
                </Text>
                {transaction.isBusinessTransaction && (
                    <View style={styles.businessBadge}>
                        <TrendingUp size={14} color={Colors.primary} />
                        <Text style={styles.businessBadgeText}>Business Transaction</Text>
                    </View>
                )}
            </View>

            {/* Transaction Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Details</Text>
                <View style={styles.card}>
                    <DetailRow
                        icon={User}
                        label="From/To"
                        value={transaction.sender || transaction.from || 'Unknown'}
                    />
                    <DetailRow
                        icon={Building2}
                        label="Bank/Source"
                        value={transaction.bank || 'Manual Entry'}
                    />
                    <DetailRow
                        icon={Calendar}
                        label="Date"
                        value={new Date(transaction.timestamp || transaction.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    />
                    <DetailRow
                        icon={Clock}
                        label="Time"
                        value={new Date(transaction.timestamp || transaction.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    />
                    <DetailRow
                        icon={Hash}
                        label="Transaction ID"
                        value={transaction.id || 'N/A'}
                    />
                    <DetailRow
                        icon={Tag}
                        label="Source"
                        value={transaction.isManual ? 'Manual Entry' : 'SMS Parsed'}
                        color={transaction.isManual ? '#f59e0b' : '#06b6d4'}
                    />
                </View>
            </View>

            {/* Message/Description */}
            {transaction.message && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.card}>
                        <View style={styles.messageContainer}>
                            <MessageSquare size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
                            <Text style={styles.messageText}>{transaction.message}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Business Score */}
            {transaction.score !== undefined && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Business Score</Text>
                    <View style={styles.card}>
                        <View style={styles.scoreContainer}>
                            <View style={styles.scoreCircle}>
                                <Text style={styles.scoreValue}>{transaction.score}</Text>
                                <Text style={styles.scoreLabel}>/ 100</Text>
                            </View>
                            <View style={styles.scoreInfo}>
                                <Text style={styles.scoreTitle}>
                                    {transaction.score >= 70 ? 'High Confidence' :
                                        transaction.score >= 40 ? 'Medium Confidence' : 'Low Confidence'}
                                </Text>
                                <Text style={styles.scoreSubtitle}>
                                    {transaction.score >= 70 ? 'Likely a business transaction' :
                                        transaction.score >= 40 ? 'Possibly a business transaction' : 'Likely a personal transaction'}
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
});

export default TransactionDetailsScreen;