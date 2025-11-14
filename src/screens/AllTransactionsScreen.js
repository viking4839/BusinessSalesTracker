import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';

const AllTransactionsScreen = ({ navigation }) => {
    const [transactions, setTransactions] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showBusinessOnly, setShowBusinessOnly] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadTransactions();
        }, [])
    );

    const loadTransactions = async () => {
        try {
            const data = await AsyncStorage.getItem('transactions');
            const parsed = data ? JSON.parse(data) : [];
            // Sort newest first
            parsed.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
            setTransactions(parsed);
        } catch (e) {
            console.error('Failed to load transactions', e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const filtered = showBusinessOnly
        ? transactions.filter(t => t.isBusinessTransaction)
        : transactions;

    const renderItem = ({ item }) => {
        const isIn = Number(item.amount) > 0;
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('TransactionDetails', { transaction: item })}
                activeOpacity={0.7}
            >
                <View style={[styles.icon, { backgroundColor: Colors.background }]}>
                    {isIn ? (
                        <ArrowDownLeft size={16} color={Colors.success} />
                    ) : (
                        <ArrowUpRight size={16} color={Colors.error} />
                    )}
                </View>

                <View style={styles.details}>
                    <Text style={styles.sender} numberOfLines={1}>
                        {item.sender || item.from || 'Unknown'}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.bank}>{item.bank || 'Unknown Bank'}</Text>
                        {item.isBusinessTransaction && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <View style={styles.bizBadge}>
                                    <Text style={styles.bizBadgeText}>Business</Text>
                                </View>
                            </>
                        )}
                    </View>
                    <Text style={styles.time}>
                        {new Date(item.timestamp || item.date).toLocaleString()}
                    </Text>
                </View>

                <Text
                    style={[
                        styles.amount,
                        { color: isIn ? Colors.success : Colors.error },
                    ]}
                >
                    {isIn ? '+' : '-'} Ksh {Math.abs(Number(item.amount) || 0).toLocaleString()}
                </Text>
            </TouchableOpacity>
        );
    };

    const totalBusinessRevenue = filtered
        .filter(t => t.isBusinessTransaction && Number(t.amount) > 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>All Transactions</Text>
                    <Text style={styles.subtitle}>
                        {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={() => setShowBusinessOnly(v => !v)}
                >
                    <Filter size={16} color={Colors.primary} />
                    <Text style={styles.filterText}>
                        {showBusinessOnly ? 'Business Only' : 'All'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Business Revenue (Listed)</Text>
                <Text style={styles.summaryValue}>Ksh {totalBusinessRevenue.toLocaleString()}</Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item, index) => String(item.id || index)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>No transactions</Text>
                        <Text style={styles.emptySubtitle}>They will appear here as they’re recorded</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    title: { fontSize: 20, fontWeight: '700', color: Colors.text },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
    summaryCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
    summaryValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    sep: { height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.md + 32 + 8 },
    icon: {
        width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
        marginRight: Spacing.sm,
    },
    details: { flex: 1, marginRight: Spacing.sm },
    sender: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    bank: { fontSize: 11, color: Colors.textSecondary },
    dot: { fontSize: 11, color: Colors.borderLight },
    bizBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    bizBadgeText: { fontSize: 9, color: '#4F46E5', fontWeight: '700' },
    time: { fontSize: 11, color: Colors.textLight },
    amount: { fontSize: 14, fontWeight: '700' },
    emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
    empty: { alignItems: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
    emptySubtitle: { fontSize: 12, color: Colors.textSecondary },
});

export default AllTransactionsScreen;