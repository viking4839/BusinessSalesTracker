import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Modal,
    Pressable,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowDownLeft, ArrowUpRight, Filter, Search, X, Download, Calendar } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import PdfExportService from '../services/PdfExportService';

// Rename the class
class AllTransactionsScreenImpl extends React.PureComponent {
    state = {
        transactions: [],
        refreshing: false,
        showBusinessOnly: false,
        // POS features
        searchExpanded: false,
        searchQuery: '',
        dateFilter: 'today', // today | yesterday | week | month | custom
        showDatePicker: false,
        customDays: 7, // for custom quick range (no native picker)
    };

    componentDidMount() {
        this.loadTransactions();
        // Refresh when screen gains focus (no hooks)
        this.unsubscribeFocus = this.props.navigation?.addListener?.('focus', this.loadTransactions);
    }

    componentWillUnmount() {
        this.unsubscribeFocus && this.unsubscribeFocus();
    }

    loadTransactions = async () => {
        try {
            const data = await AsyncStorage.getItem('transactions');
            const parsed = data ? JSON.parse(data) : [];
            parsed.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
            this.setState({ transactions: parsed });
        } catch (e) {
            console.error('Failed to load transactions', e);
        }
    };

    onRefresh = async () => {
        this.setState({ refreshing: true });
        await this.loadTransactions();
        this.setState({ refreshing: false });
    };

    getDateRange = () => {
        const { dateFilter, customDays } = this.state;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'today':
                return { start: today, end: new Date(today.getTime() + 86400000) };
            case 'yesterday': {
                const y = new Date(today.getTime() - 86400000);
                return { start: y, end: today };
            }
            case 'week': {
                const w = new Date(today.getTime() - 7 * 86400000);
                return { start: w, end: new Date() };
            }
            case 'month': {
                const m = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: m, end: new Date() };
            }
            case 'custom': {
                const c = new Date(today.getTime() - customDays * 86400000);
                return { start: c, end: new Date() };
            }
            default:
                return { start: new Date(0), end: new Date() };
        }
    };

    filterTransactions = () => {
        const { transactions, showBusinessOnly, searchQuery } = this.state;
        const { start, end } = this.getDateRange();

        let result = transactions;

        if (showBusinessOnly) {
            result = result.filter(t => t.isBusinessTransaction);
        }

        result = result.filter(t => {
            const txDate = new Date(t.timestamp || t.date);
            return txDate >= start && txDate <= end;
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.sender || '').toLowerCase().includes(q) ||
                (t.bank || '').toLowerCase().includes(q) ||
                String(t.amount).includes(q)
            );
        }

        return result;
    };

    groupByDate = (txns) => {
        const map = new Map();
        txns.forEach(tx => {
            const d = new Date(tx.timestamp || tx.date);
            const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(tx);
        });
        return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
    };

    getTotals = (txns) => {
        return txns.reduce((acc, t) => {
            const amt = Number(t.amount) || 0;
            if (amt > 0) acc.in += amt;
            else acc.out += Math.abs(amt);
            if (t.isBusinessTransaction && amt > 0) acc.business += amt;
            acc.count += 1;
            return acc;
        }, { in: 0, out: 0, business: 0, count: 0, net: 0 });
    };

    handleExport = async (filtered) => {
        const { dateFilter, customDays } = this.state;

        if (filtered.length === 0) {
            Alert.alert('No Data', 'No transactions to export for selected period');
            return;
        }

        const dateText = dateFilter === 'custom' ? `Last_${customDays}_days` : dateFilter;

        Alert.alert(
            'Export Data',
            `Export ${filtered.length} transactions (${dateText.replace(/_/g, ' ')})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export PDF',
                    onPress: async () => {
                        const ok = await PdfExportService.exportTransactionsPdf(
                            filtered,
                            `Transactions_${dateText}`
                        );
                        if (ok) Alert.alert('Success', 'PDF exported successfully');
                    }
                }
            ]
        );
    };

    getDateFilterLabel = () => {
        const { dateFilter, customDays } = this.state;
        return dateFilter === 'custom'
            ? `Last ${customDays} days`
            : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1);
    };

    renderSectionHeader = ({ section }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>
                {section.data.length} {section.data.length === 1 ? 'txn' : 'txns'}
            </Text>
        </View>
    );

    renderItem = ({ item }) => {
        const isIn = Number(item.amount) > 0;
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() => this.props.navigation.navigate('TransactionDetails', { transaction: item })}
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
                        {new Date(item.timestamp || item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>

                <Text style={[styles.amount, { color: isIn ? Colors.success : Colors.error }]}>
                    {isIn ? '+' : ''} Ksh {Math.abs(Number(item.amount) || 0).toLocaleString()}
                </Text>
            </TouchableOpacity>
        );
    };

    render() {
        const {
            refreshing,
            showBusinessOnly,
            searchExpanded,
            searchQuery,
            dateFilter,
            showDatePicker,
            customDays,
        } = this.state;

        const filtered = this.filterTransactions();
        const sections = this.groupByDate(filtered);
        const totals = this.getTotals(filtered);
        totals.net = totals.in - totals.out;

        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Transactions</Text>
                        
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => this.setState({ searchExpanded: !searchExpanded })}
                        >
                            {searchExpanded ? <X size={20} color={Colors.text} /> : <Search size={20} color={Colors.text} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => this.setState({ showBusinessOnly: !showBusinessOnly })}
                        >
                            <Filter size={20} color={showBusinessOnly ? Colors.primary : Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => this.handleExport(filtered)}
                        >
                            <Download size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search (expandable) */}
                {searchExpanded && (
                    <View style={styles.searchBar}>
                        <Search size={16} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name, bank, or amount..."
                            value={searchQuery}
                            onChangeText={(t) => this.setState({ searchQuery: t })}
                            autoFocus
                            placeholderTextColor={Colors.textSecondary}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => this.setState({ searchQuery: '' })}>
                                <X size={16} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Date Filter Pills */}
                <View style={styles.dateFilters}>
                    {['today', 'yesterday', 'week', 'month'].map(val => (
                        <TouchableOpacity
                            key={val}
                            style={[styles.dateFilterBtn, dateFilter === val && styles.dateFilterBtnActive]}
                            onPress={() => this.setState({ dateFilter: val })}
                        >
                            <Text style={[styles.dateFilterText, dateFilter === val && styles.dateFilterTextActive]}>
                                {val === 'today'
                                    ? 'Today'
                                    : val === 'yesterday'
                                        ? 'Yesterday'
                                        : val === 'week'
                                            ? 'Week'
                                            : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.dateFilterBtn, dateFilter === 'custom' && styles.dateFilterBtnActive]}
                        onPress={() => this.setState({ dateFilter: 'custom', showDatePicker: true })}
                    >
                        <Calendar size={14} color={dateFilter === 'custom' ? Colors.surface : Colors.text} />
                        <Text style={[styles.dateFilterText, dateFilter === 'custom' && styles.dateFilterTextActive]}>
                            Custom
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.summaryLabel}>Total In</Text>
                            <Text style={styles.summaryValue}>Ksh {totals.in.toLocaleString()}</Text>
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Total Out</Text>
                            <Text style={styles.summaryValue}>Ksh {totals.out.toLocaleString()}</Text>
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{totals.count}</Text>
                            <Text style={styles.countLabel}>Count</Text>
                        </View>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 8 }]}>
                        <View>
                            <Text style={styles.summaryLabel}>Net</Text>
                            <Text style={[
                                styles.summaryValue,
                                { color: totals.net >= 0 ? Colors.success : Colors.error }
                            ]}>
                                Ksh {totals.net.toLocaleString()}
                            </Text>
                        </View>

                    </View>
                </View>

                {/* Custom quick range modal (no native picker) */}
                <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => this.setState({ showDatePicker: false })}
                >
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => this.setState({ showDatePicker: false })}
                    >
                        <View style={styles.datePickerModal}>
                            <Text style={styles.datePickerTitle}>Select Time Range</Text>
                            <Text style={styles.datePickerHint}>Last {customDays} days</Text>

                            <View style={styles.datePickerActions}>
                                {[3, 7, 14, 30].map(days => (
                                    <TouchableOpacity
                                        key={days}
                                        style={styles.datePickerBtn}
                                        onPress={() => this.setState({ customDays: days, showDatePicker: false })}
                                    >
                                        <Text style={styles.datePickerBtnText}>Last {days} Days</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.datePickerBtn, styles.datePickerBtnCancel]}
                                    onPress={() => this.setState({ showDatePicker: false })}
                                >
                                    <Text style={[styles.datePickerBtnText, { color: Colors.error }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                {/* Grouped list */}
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => String(item.id || index)}
                    renderSectionHeader={this.renderSectionHeader}
                    renderItem={this.renderItem}
                    ItemSeparatorComponent={({ leadingItem }) =>
                        leadingItem ? <View style={styles.sep} /> : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={this.onRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No transactions</Text>
                            <Text style={styles.emptySubtitle}>
                                {this.state.searchQuery ? 'Try a different search' : 'Change date range or filters'}
                            </Text>
                        </View>
                    }
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: { fontSize: 20, fontWeight: '700', color: Colors.text },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
    dateFilters: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        gap: 6,
    },
    dateFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dateFilterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    dateFilterText: { fontSize: 13, fontWeight: '600', color: Colors.text },
    dateFilterTextActive: { color: Colors.surface },
    summaryCard: {
        backgroundColor: '#b1e9c2ff',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
    countBadge: {
        backgroundColor: Colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    countText: { fontSize: 16, fontWeight: '700', color: Colors.text },
    countLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 2 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.text },
    sectionCount: { fontSize: 10, color: Colors.textSecondary },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    sep: { height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.md + 32 + 8 },
    icon: {
        width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
        marginRight: Spacing.sm,
    },
    details: { flex: 1, marginRight: Spacing.sm },
    sender: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    bank: { fontSize: 10, color: Colors.textSecondary },
    dot: { fontSize: 10, color: Colors.borderLight },
    bizBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
    bizBadgeText: { fontSize: 8, color: '#4F46E5', fontWeight: '700' },
    time: { fontSize: 10, color: Colors.textLight },
    amount: { fontSize: 13, fontWeight: '700' },
    emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
    empty: { alignItems: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
    emptySubtitle: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    datePickerModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        width: '80%',
        maxWidth: 300,
    },
    datePickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
    datePickerHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md, textAlign: 'center' },
    datePickerActions: { gap: 8 },
    datePickerBtn: {
        backgroundColor: Colors.primary,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    datePickerBtnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
    datePickerBtnText: { fontSize: 14, fontWeight: '600', color: Colors.surface },
});

// Replace the export with a safe wrapper
export default function AllTransactionsScreen(props) {
    return <AllTransactionsScreenImpl {...props} />;
}