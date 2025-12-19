import React, { useState, useEffect, useCallback } from 'react';
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
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    X,
    ArrowLeft,
    Calendar,
    Package,
    Filter,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Banknote,
    Smartphone,
    DollarSign,
    Receipt
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { useFocusEffect } from '@react-navigation/native';

const AllTransactionsScreen = ({ navigation }) => {
    const [transactions, setTransactions] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customDays, setCustomDays] = useState(7);

    // Load transactions on mount and when screen focuses
    useEffect(() => {
        loadTransactions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    const loadTransactions = async () => {
        try {
            const data = await AsyncStorage.getItem('transactions');
            const parsed = data ? JSON.parse(data) : [];

            // Sort by timestamp (newest first)
            parsed.sort((a, b) => {
                const dateA = new Date(a.timestamp || a.date || 0);
                const dateB = new Date(b.timestamp || b.date || 0);
                return dateB - dateA;
            });

            setTransactions(parsed);
        } catch (e) {
            console.error('Failed to load transactions', e);
            Alert.alert('Error', 'Failed to load transactions');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const getDateRange = () => {
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

    const filterTransactions = () => {
        const { start, end } = getDateRange();

        let result = transactions.filter(t => {
            const txDate = new Date(t.timestamp || t.date || 0);
            return txDate >= start && txDate <= end;
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.sender || '').toLowerCase().includes(q) ||
                (t.bank || '').toLowerCase().includes(q) ||
                (t.customerName || '').toLowerCase().includes(q) ||
                (t.paymentMethod || '').toLowerCase().includes(q) ||
                String(t.amount || '').includes(q)
            );
        }

        return result;
    };

    const groupByDate = (txns) => {
        const map = new Map();
        txns.forEach(tx => {
            const d = new Date(tx.timestamp || tx.date || 0);
            const key = d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(tx);
        });
        return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
    };

    const getTotals = (txns) => {
        return txns.reduce((acc, t) => {
            const amt = Number(t.amount) || 0;
            if (amt > 0) {
                if (t.isSplitPayment && t.splitPayments) {
                    // For split payments, add components to individual methods
                    const cash = Number(t.splitPayments.cash) || 0;
                    const mpesa = Number(t.splitPayments.mpesa) || 0;
                    const bank = Number(t.splitPayments.bank) || 0;

                    acc.cash += cash;
                    acc.mpesa += mpesa;
                    acc.bank += bank;

                    // Track split payments
                    acc.splitPaymentCount += 1;
                    acc.splitPaymentTotal += amt;
                } else {
                    // For non-split payments, add to individual methods
                    const method = t.paymentMethod || t.bank || 'Cash';
                    const normalizedMethod = method.toLowerCase();

                    if (normalizedMethod.includes('cash') || normalizedMethod === 'cash') {
                        acc.cash += amt;
                    } else if (normalizedMethod.includes('mpesa') || normalizedMethod.includes('m-pesa') || normalizedMethod === 'm-pesa') {
                        acc.mpesa += amt;
                    } else if (normalizedMethod.includes('bank') || normalizedMethod.includes('transfer')) {
                        acc.bank += amt;
                    } else if (normalizedMethod.includes('split')) {
                        // Handle legacy split payments without isSplitPayment flag
                        acc.splitPaymentCount += 1;
                        acc.splitPaymentTotal += amt;
                    } else {
                        // Default to cash for unknown methods
                        acc.cash += amt;
                    }
                }
                acc.in += amt;
            } else {
                acc.out += Math.abs(amt);
            }
            if (t.isBusinessTransaction && amt > 0) acc.business += amt;
            acc.count += 1;
            return acc;
        }, {
            in: 0,
            out: 0,
            business: 0,
            count: 0,
            net: 0,
            cash: 0,
            mpesa: 0,
            bank: 0,
            splitPaymentCount: 0,
            splitPaymentTotal: 0
        });
    };

    const renderSectionHeader = ({ section }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }) => {
        const isIn = Number(item.amount || 0) > 0;

        // Safer inventory match check
        const hasMatch = item.inventoryMatch &&
            typeof item.inventoryMatch === 'object' &&
            !item.inventoryMatch.userConfirmed &&
            !item.inventoryMatch.userDismissed;

        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() => {
                    navigation.navigate('TransactionDetails', {
                        transaction: item,
                        timestamp: Date.now() // Add a unique key to force re-render if same transaction
                    });
                }}
                activeOpacity={0.7}
            >
                <View style={styles.iconWrapper}>
                    <View style={[
                        styles.icon,
                        { backgroundColor: isIn ? '#DCFCE7' : '#FEE2E2' }
                    ]}>
                        {isIn ? (
                            <ArrowDownLeft size={18} color={Colors.success} strokeWidth={2.5} />
                        ) : (
                            <ArrowUpRight size={18} color={Colors.error} strokeWidth={2.5} />
                        )}
                    </View>

                    {hasMatch && (
                        <View style={styles.matchBadge}>
                            <Package size={10} color={Colors.surface} />
                        </View>
                    )}
                </View>

                <View style={styles.details}>
                    <Text style={styles.sender} numberOfLines={1}>
                        {item.customerName || item.sender || item.from || 'Unknown'}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.bank}>
                            {item.isSplitPayment
                                ? 'Split Payment'
                                : (item.paymentMethod || item.bank || 'Unknown')}
                        </Text>
                        {item.isBusinessTransaction && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <View style={styles.bizBadge}>
                                    <Text style={styles.bizBadgeText}>Business</Text>
                                </View>
                            </>
                        )}
                        {item.source === 'manual' && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <View style={[styles.bizBadge, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                                    <Text style={[styles.bizBadgeText, { color: '#6B7280' }]}>Manual</Text>
                                </View>
                            </>
                        )}
                        {item.isSplitPayment && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <View style={[styles.bizBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                                    <Text style={[styles.bizBadgeText, { color: '#D97706' }]}>Split</Text>
                                </View>
                            </>
                        )}
                        {hasMatch && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <View style={[styles.bizBadge, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                                    <Text style={[styles.bizBadgeText, { color: '#F59E0B' }]}>Match</Text>
                                </View>
                            </>
                        )}
                    </View>
                    <Text style={styles.time}>
                        {new Date(item.timestamp || item.date || 0).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>

                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: isIn ? Colors.success : Colors.error }]}>
                        {isIn ? '+' : '-'}Ksh {Math.abs(Number(item.amount) || 0).toLocaleString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTransaction = ({ item }) => {
        const isIncome = item.type === 'sale' || item.type === 'income';
        const isCredit = item.isCredit || item.paymentMethod === 'credit_cleared' || item.paymentMethod === 'credit_payment';

        return (
            <TouchableOpacity
                style={styles.transactionCard}
                onPress={() => setSelectedTransaction(item)}
                activeOpacity={0.7}
            >
                <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                        {/* Icon */}
                        <View style={[
                            styles.transactionIcon,
                            { backgroundColor: isIncome ? '#D1FAE5' : '#FEE2E2' }
                        ]}>
                            {isCredit ? (
                                <CreditCard size={18} color={isIncome ? Colors.success : Colors.error} />
                            ) : isIncome ? (
                                <TrendingUp size={18} color={Colors.success} />
                            ) : (
                                <TrendingDown size={18} color={Colors.error} />
                            )}
                        </View>

                        <View style={styles.transactionDetails}>
                            <View style={styles.transactionTitleRow}>
                                <Text style={styles.transactionTitle} numberOfLines={1}>
                                    {item.description || item.itemName || 'Transaction'}
                                </Text>

                                {/* Credit Badge */}
                                {isCredit && (
                                    <View style={styles.creditBadge}>
                                        <Text style={styles.creditBadgeText}>
                                            {item.creditType === 'cleared' ? 'Credit Cleared' : 'Credit Payment'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Customer Name for Credit */}
                            {isCredit && item.customerName && (
                                <View style={styles.customerRow}>
                                    <User size={12} color={Colors.textSecondary} />
                                    <Text style={styles.customerName}>{item.customerName}</Text>
                                </View>
                            )}

                            <Text style={styles.transactionDate}>
                                {new Date(item.date || item.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </View>

                    <Text style={[
                        styles.transactionAmount,
                        { color: isIncome ? Colors.success : Colors.error }
                    ]}>
                        {isIncome ? '+' : '-'}Ksh {Math.abs(item.amount).toLocaleString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const filtered = filterTransactions();
    const sections = groupByDate(filtered);
    const totals = getTotals(filtered);
    totals.net = totals.in - totals.out;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.title}>All Transactions</Text>
                    <Text style={styles.subtitle}>{filtered.length} transactions</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => setSearchExpanded(!searchExpanded)}
                    >
                        {searchExpanded ? (
                            <X size={20} color={Colors.primary} />
                        ) : (
                            <Search size={20} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            {searchExpanded && (
                <View style={styles.searchBar}>
                    <Search size={18} color={Colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, bank, or amount..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                        placeholderTextColor={Colors.textLight}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Date Filter Chips */}
            <View style={styles.filtersSection}>
                <View style={styles.filterChips}>
                    {['today', 'yesterday', 'week', 'month'].map(val => (
                        <TouchableOpacity
                            key={val}
                            style={[styles.filterChip, dateFilter === val && styles.filterChipActive]}
                            onPress={() => setDateFilter(val)}
                        >
                            <Text style={[styles.filterChipText, dateFilter === val && styles.filterChipTextActive]}>
                                {val === 'today' ? 'Today' :
                                    val === 'yesterday' ? 'Yesterday' :
                                        val === 'week' ? 'Week' : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.filterChip, dateFilter === 'custom' && styles.filterChipActive]}
                        onPress={() => {
                            setDateFilter('custom');
                            setShowDatePicker(true);
                        }}
                    >
                        <Calendar size={14} color={dateFilter === 'custom' ? Colors.surface : Colors.text} />
                        <Text style={[styles.filterChipText, dateFilter === 'custom' && styles.filterChipTextActive]}>
                            Custom
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryIconContainer}>
                        <TrendingUp size={20} color={Colors.success} />
                    </View>
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Money In</Text>
                        <Text style={[styles.summaryValue, { color: Colors.success }]}>
                            Ksh {totals.in.toLocaleString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <View style={[styles.summaryIconContainer, { backgroundColor: '#FEE2E2' }]}>
                        <TrendingDown size={20} color={Colors.error} />
                    </View>
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Money Out</Text>
                        <Text style={[styles.summaryValue, { color: Colors.error }]}>
                            Ksh {totals.out.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Payment Method Breakdown - Includes Split Payments */}
            <View style={styles.paymentBreakdownCard}>
                <Text style={styles.breakdownTitle}>Payment Methods Breakdown</Text>
                <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownIcon, { backgroundColor: '#DCFCE7' }]}>
                            <Banknote size={18} color={Colors.success} />
                        </View>
                        <View style={styles.breakdownInfo}>
                            <Text style={styles.breakdownLabel}>Cash</Text>
                            <Text style={styles.breakdownValue}>Ksh {totals.cash.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownIcon, { backgroundColor: '#DBEAFE' }]}>
                            <Smartphone size={18} color={Colors.primary} />
                        </View>
                        <View style={styles.breakdownInfo}>
                            <Text style={styles.breakdownLabel}>M-Pesa</Text>
                            <Text style={styles.breakdownValue}>Ksh {totals.mpesa.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownIcon, { backgroundColor: '#FEF3C7' }]}>
                            <CreditCard size={18} color="#F59E0B" />
                        </View>
                        <View style={styles.breakdownInfo}>
                            <Text style={styles.breakdownLabel}>Bank</Text>
                            <Text style={styles.breakdownValue}>Ksh {totals.bank.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Split Payments Summary Row */}
                {totals.splitPaymentCount > 0 && (
                    <View style={styles.splitPaymentSummary}>
                        <View style={styles.splitPaymentRow}>
                            <Receipt size={16} color={Colors.primary} />
                            <Text style={styles.splitPaymentLabel}>Split Payments:</Text>
                        </View>
                        <View style={styles.splitPaymentDetails}>
                            <Text style={styles.splitPaymentCount}>{totals.splitPaymentCount} transaction(s)</Text>
                            <Text style={styles.splitPaymentTotal}>Ksh {totals.splitPaymentTotal.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* Total Count Badge */}
                <View style={styles.totalCountRow}>
                    <Text style={styles.totalCountLabel}>Total Transactions:</Text>
                    <View style={styles.totalCountBadge}>
                        <Text style={styles.totalCountText}>{totals.count}</Text>
                    </View>
                </View>
            </View>

            {/* Custom Date Range Modal */}
            <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDatePicker(false)}
                >
                    <Pressable style={styles.datePickerModal} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.datePickerTitle}>Select Time Range</Text>
                        <Text style={styles.datePickerHint}>Choose how many days to view</Text>

                        <View style={styles.datePickerActions}>
                            {[3, 7, 14, 30, 60, 90].map(days => (
                                <TouchableOpacity
                                    key={days}
                                    style={styles.datePickerBtn}
                                    onPress={() => {
                                        setCustomDays(days);
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={styles.datePickerBtnText}>Last {days} Days</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.datePickerBtn, styles.datePickerBtnCancel]}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={[styles.datePickerBtnText, { color: Colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Transaction List */}
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.id || `transaction-${index}`}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Package size={32} color={Colors.textSecondary} />
                            </View>
                            <Text style={styles.emptyTitle}>No Transactions</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery
                                    ? 'No transactions match your search criteria'
                                    : 'No transactions found for this period'}
                            </Text>
                        </View>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.surface,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.surface + 'CC',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        paddingVertical: Spacing.sm,
    },
    filtersSection: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    filterChips: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    filterChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    filterChipTextActive: {
        color: Colors.surface,
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    summaryCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    summaryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    paymentBreakdownCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    breakdownRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    breakdownItem: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    breakdownIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    breakdownInfo: {
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    splitPaymentSummary: {
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    splitPaymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: 4,
    },
    splitPaymentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    splitPaymentDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    splitPaymentCount: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    splitPaymentTotal: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.success,
    },
    totalCountRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.xs,
    },
    totalCountLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    totalCountBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
    },
    totalCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.surface,
    },
    listContent: {
        paddingBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginTop: Spacing.xs,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    sectionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text
    },
    sectionCountBadge: {
        backgroundColor: Colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    sectionCount: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginVertical: 2,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    iconWrapper: {
        position: 'relative',
        marginRight: Spacing.sm,
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    matchBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
        ...Shadows.sm,
    },
    details: {
        flex: 1,
        marginRight: Spacing.sm
    },
    sender: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    bank: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '500'
    },
    dot: {
        fontSize: 10,
        color: Colors.borderLight
    },
    bizBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    bizBadgeText: {
        fontSize: 9,
        color: '#4F46E5',
        fontWeight: '700'
    },
    time: {
        fontSize: 11,
        color: Colors.textLight,
        fontWeight: '500'
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    datePickerModal: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 320,
        ...Shadows.lg,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs,
        textAlign: 'center'
    },
    datePickerHint: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
        textAlign: 'center'
    },
    datePickerActions: {
        gap: Spacing.xs
    },
    datePickerBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    datePickerBtnCancel: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border
    },
    datePickerBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface
    },
    creditBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    creditBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563EB',
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    customerName: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    transactionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
});

export default AllTransactionsScreen;