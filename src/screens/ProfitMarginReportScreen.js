import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    StatusBar,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Calendar,
    BarChart3,
    ArrowLeft,
    Download,
    AlertTriangle,
    Crown,
    RefreshCw,
    ShoppingBag,
    Percent,
    CreditCard,
    User,  // ADD THIS
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import InventoryStorage from '../utils/InventoryStorage';
import PrintPDF from '../utils/PrintPDF';
import TransactionStorage from '../utils/TransactionStorage';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';

const { width } = Dimensions.get('window');

const ProfitMarginReportScreen = ({ navigation }) => {
    const [todayReport, setTodayReport] = useState(null);
    const [weeklyReports, setWeeklyReports] = useState({});
    const [monthlyReports, setMonthlyReports] = useState({});
    const [inventoryStats, setInventoryStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('today');
    const [exporting, setExporting] = useState(false);
    const [creditTransactions, setCreditTransactions] = useState([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setRefreshing(true);
        try {
            console.log('📄 Loading profit report data...');

            const today = new Date();
            const todayString = today.toISOString().split('T')[0];

            const report = await ProfitReportStorage.loadReport(todayString);
            setTodayReport(report);
            console.log('✅ Today report:', report);

            const weekly = await ProfitReportStorage.getWeeklyReports();
            setWeeklyReports(weekly || {});
            console.log('✅ Weekly reports:', Object.keys(weekly || {}).length);

            const monthly = await ProfitReportStorage.getMonthlyReports();
            setMonthlyReports(monthly || {});
            console.log('✅ Monthly reports:', Object.keys(monthly || {}).length);

            const stats = await InventoryStorage.getInventoryStats();
            setInventoryStats(stats);
            console.log('✅ Inventory stats:', stats);

            // Load credit transactions with safe date handling
            try {
                const allTransactions = await TransactionStorage.loadTransactions();
                const todayCredits = allTransactions.filter(t => {
                    try {
                        if (!t.date && !t.createdAt) return false;
                        const txDate = new Date(t.date || t.createdAt);
                        if (isNaN(txDate.getTime())) return false;
                        const txDateString = txDate.toISOString().split('T')[0];
                        return txDateString === todayString &&
                            (t.isCredit || t.paymentMethod === 'credit_cleared' || t.paymentMethod === 'credit_payment');
                    } catch (e) {
                        return false;
                    }
                });
                setCreditTransactions(todayCredits);
                console.log('✅ Credit transactions:', todayCredits.length);
            } catch (txError) {
                console.error('Error loading credit transactions:', txError);
                setCreditTransactions([]);
            }

        } catch (error) {
            console.error('❌ Error loading profit data:', error);
            Alert.alert('Error', 'Failed to load profit data');
        } finally {
            setRefreshing(false);
        }
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        try {
            const freshReport = await ProfitReportStorage.refreshTodaysReport();
            setTodayReport(freshReport);
            await loadData();
            Alert.alert('✅ Refreshed', 'Profit report updated with latest transactions');
        } catch (error) {
            console.error('Refresh error:', error);
            Alert.alert('Error', 'Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            let pdfPath;

            switch (activeTab) {
                case 'today':
                    if (!todayReport || !todayReport.totalSales) {
                        // Allow export if there are credit transactions even without regular sales
                        if (creditTransactions.length === 0) {
                            Alert.alert('No Data', 'There is no profit data to export for today.');
                            return;
                        }
                    }
                    // Pass credit transactions to the export
                    pdfPath = await PrintPDF.exportDaily(todayReport || {}, inventoryStats, creditTransactions);
                    break;

                case 'weekly':
                    if (!weeklyReports || Object.keys(weeklyReports).length === 0) {
                        Alert.alert('No Data', 'There is no weekly data to export.');
                        return;
                    }
                    pdfPath = await PrintPDF.exportWeekly(weeklyReports);
                    break;

                case 'insights':
                    if (monthlyReports && Object.keys(monthlyReports).length > 0) {
                        pdfPath = await PrintPDF.exportMonthly(monthlyReports);
                    } else if (todayReport) {
                        pdfPath = await PrintPDF.exportDaily(todayReport, inventoryStats, creditTransactions);
                    } else {
                        Alert.alert('No Data', 'There is no data to export for insights.');
                        return;
                    }
                    break;

                default:
                    throw new Error('Invalid tab selected for export');
            }

            console.log('✅ PDF exported successfully:', pdfPath);

        } catch (error) {
            console.error('❌ Export error:', error);

            if (error.message.includes('permission')) {
                Alert.alert(
                    'Permission Required',
                    'Please allow storage permissions to save PDF files.',
                    [{ text: 'OK' }]
                );
            } else if (error.message.includes('cancel')) {
                console.log('User cancelled PDF share');
            } else if (error.message.includes('No data')) {
                Alert.alert('No Data', 'There is no report data available to export.', [{ text: 'OK' }]);
            } else {
                Alert.alert(
                    'Export Failed',
                    error.message || 'Could not generate the PDF report. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (amount) => {
        return `Ksh ${amount?.toLocaleString() || '0'}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const getGrowthColor = (current, previous) => {
        if (!previous || previous === 0) return Colors.success;
        return current >= previous ? Colors.success : Colors.error;
    };

    const calculateWeeklyGrowth = () => {
        const reports = Object.values(weeklyReports);
        if (reports.length < 2) return { profit: 0, sales: 0 };

        const currentWeekProfit = reports[0]?.totalProfit || 0;
        const previousWeekProfit = reports[1]?.totalProfit || 0;
        const currentWeekSales = reports[0]?.totalSales || 0;
        const previousWeekSales = reports[1]?.totalSales || 0;

        return {
            profit: previousWeekProfit ? ((currentWeekProfit - previousWeekProfit) / previousWeekProfit * 100) : 0,
            sales: previousWeekSales ? ((currentWeekSales - previousWeekSales) / previousWeekSales * 100) : 0
        };
    };

    const getMarginColor = (margin) => {
        if (margin >= 30) return Colors.success;
        if (margin >= 20) return '#10B981';
        if (margin >= 10) return '#F59E0B';
        return Colors.error;
    };

    const getMarginLabel = (margin) => {
        if (margin >= 30) return 'Excellent';
        if (margin >= 20) return 'Good';
        if (margin >= 10) return 'Fair';
        return 'Low';
    };

    const renderSummaryCards = () => (
        <View style={styles.summarySection}>
            {/* Hero Card - Today's Profit */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View>
                        <Text style={styles.heroLabel}>Today's Gross Profit</Text>
                        <Text style={styles.heroValue}>{formatCurrency(todayReport?.totalProfit)}</Text>
                    </View>
                    <View style={[
                        styles.marginBadge,
                        { backgroundColor: getMarginColor(todayReport?.margin || 0) + '20' }
                    ]}>
                        <Percent size={16} color={getMarginColor(todayReport?.margin || 0)} />
                        <Text style={[styles.marginValue, { color: getMarginColor(todayReport?.margin || 0) }]}>
                            {todayReport?.margin || 0}%
                        </Text>
                    </View>
                </View>

                <View style={styles.heroFooter}>
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Sales</Text>
                        <Text style={styles.heroStatValue}>{formatCurrency(todayReport?.totalSales)}</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Cost</Text>
                        <Text style={styles.heroStatValue}>{formatCurrency(todayReport?.totalCost)}</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Margin</Text>
                        <Text style={[styles.heroStatValue, { color: getMarginColor(todayReport?.margin || 0) }]}>
                            {getMarginLabel(todayReport?.margin || 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Mini Stats Grid */}
            <View style={styles.miniStatsGrid}>
                <View style={styles.miniStatCard}>
                    <View style={[styles.miniStatIcon, { backgroundColor: '#EFF6FF' }]}>
                        <ShoppingBag size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.miniStatValue}>{todayReport?.transactionCount || 0}</Text>
                    <Text style={styles.miniStatLabel}>Transactions</Text>
                </View>

                <View style={styles.miniStatCard}>
                    <View style={[styles.miniStatIcon, { backgroundColor: '#F0FDF4' }]}>
                        <Package size={18} color={Colors.success} />
                    </View>
                    <Text style={styles.miniStatValue}>{todayReport?.items?.length || 0}</Text>
                    <Text style={styles.miniStatLabel}>Items Sold</Text>
                </View>

                <View style={styles.miniStatCard}>
                    <View style={[styles.miniStatIcon, { backgroundColor: '#FEF3C7' }]}>
                        <BarChart3 size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.miniStatValue}>
                        {todayReport?.totalSales > 0
                            ? formatCurrency(todayReport?.totalSales / (todayReport?.transactionCount || 1))
                            : 'Ksh 0'}
                    </Text>
                    <Text style={styles.miniStatLabel}>Avg. Sale</Text>
                </View>
            </View>
        </View>
    );

    const renderItemBreakdown = () => {
        if (!todayReport?.items || todayReport.items.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Package size={48} color={Colors.textLight} />
                    </View>
                    <Text style={styles.emptyStateText}>No sales recorded today</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Sales will appear here when you make transactions
                    </Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
                        <RefreshCw size={16} color={Colors.primary} />
                        <Text style={styles.refreshButtonText}>Refresh Data</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.breakdownSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sales Breakdown</Text>
                    <View style={styles.transactionBadge}>
                        <Text style={styles.transactionBadgeText}>
                            {todayReport.transactionCount} sales
                        </Text>
                    </View>
                </View>

                <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Item</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Sale</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Profit</Text>
                    </View>

                    {/* Table Rows */}
                    {todayReport.items.map((item, index) => {
                        const profitMargin = ((item.profit / (item.retailPrice * item.sold)) * 100) || 0;
                        return (
                            <View key={index} style={styles.tableRow}>
                                <View style={[styles.tableCell, { flex: 2 }]}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.itemPrice}>
                                        @ {formatCurrency(item.retailPrice)}
                                    </Text>
                                </View>
                                <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                                    <View style={styles.qtyBadge}>
                                        <Text style={styles.qtyText}>{item.sold}</Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                    <Text style={styles.saleAmount}>
                                        {formatCurrency(item.retailPrice * item.sold)}
                                    </Text>
                                    <Text style={styles.costAmount}>
                                        Cost: {formatCurrency(item.wholesalePrice * item.sold)}
                                    </Text>
                                </View>
                                <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>
                                    <Text style={styles.profitAmount}>
                                        {formatCurrency(item.profit)}
                                    </Text>
                                    <Text style={[styles.marginText, { color: getMarginColor(profitMargin) }]}>
                                        {profitMargin.toFixed(1)}% margin
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {/* Table Footer - Totals */}
                    <View style={styles.tableFooter}>
                        <Text style={styles.footerLabel}>Total</Text>
                        <Text style={styles.footerValue}>{formatCurrency(todayReport.totalSales)}</Text>
                        <Text style={styles.footerProfit}>{formatCurrency(todayReport.totalProfit)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderCreditTransactions = () => {
        if (creditTransactions.length === 0) {
            return null;
        }

        const totalCreditAmount = creditTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalCreditProfit = creditTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

        return (
            <View style={styles.creditSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Credit Collections</Text>
                    <View style={styles.creditTotalBadge}>
                        <Text style={styles.creditTotalText}>
                            +Ksh {totalCreditAmount.toLocaleString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.creditListContainer}>
                    {/* Credit Summary Header */}
                    <View style={styles.creditSummaryHeader}>
                        <View style={styles.creditSummaryItem}>
                            <Text style={styles.creditSummaryLabel}>Total Collected</Text>
                            <Text style={styles.creditSummaryValue}>Ksh {totalCreditAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.creditSummaryDivider} />
                        <View style={styles.creditSummaryItem}>
                            <Text style={styles.creditSummaryLabel}>Profit Earned</Text>
                            <Text style={[styles.creditSummaryValue, { color: Colors.success }]}>
                                Ksh {totalCreditProfit.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {creditTransactions.map((transaction, index) => (
                        <View key={transaction.id || `credit-${index}`} style={styles.creditTransactionCard}>
                            <View style={styles.creditTransactionHeader}>
                                <View style={styles.creditIconContainer}>
                                    <CreditCard size={16} color="#2563EB" />
                                </View>
                                <View style={styles.creditTransactionInfo}>
                                    <View style={styles.creditTitleRow}>
                                        <Text style={styles.creditItemName} numberOfLines={1}>
                                            {transaction.itemName || 'Credit Payment'}
                                        </Text>
                                        <View style={[
                                            styles.creditTypeBadge,
                                            transaction.creditType === 'cleared'
                                                ? styles.creditClearedBadge
                                                : styles.creditPaymentBadge
                                        ]}>
                                            <Text style={[
                                                styles.creditTypeBadgeText,
                                                transaction.creditType === 'cleared'
                                                    ? styles.creditClearedText
                                                    : styles.creditPaymentText
                                            ]}>
                                                {transaction.creditType === 'cleared' ? 'Cleared' : 'Partial'}
                                            </Text>
                                        </View>
                                    </View>

                                    {transaction.customerName && (
                                        <View style={styles.creditCustomerRow}>
                                            <User size={12} color={Colors.textSecondary} />
                                            <Text style={styles.creditCustomerName}>
                                                {transaction.customerName}
                                            </Text>
                                        </View>
                                    )}

                                    <Text style={styles.creditTransactionTime}>
                                        {(() => {
                                            try {
                                                const date = new Date(transaction.date || transaction.createdAt);
                                                if (isNaN(date.getTime())) return 'Time unknown';
                                                return date.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                            } catch (e) {
                                                return 'Time unknown';
                                            }
                                        })()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.creditAmountContainer}>
                                <Text style={styles.creditTransactionAmount}>
                                    +Ksh {(transaction.amount || 0).toLocaleString()}
                                </Text>
                                {transaction.profit !== undefined && transaction.profit !== 0 && (
                                    <Text style={styles.creditProfitText}>
                                        Profit: Ksh {(transaction.profit || 0).toLocaleString()}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderInventoryInsights = () => {
        if (!inventoryStats) {
            return (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading inventory insights...</Text>
                </View>
            );
        }

        return (
            <View style={styles.insightsSection}>
                {/* Stock Value Card */}
                <View style={styles.insightCard}>
                    <View style={styles.insightCardHeader}>
                        <View style={styles.insightIconContainer}>
                            <DollarSign size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.insightCardTitle}>Inventory Value</Text>
                    </View>

                    <View style={styles.insightContent}>
                        <View style={styles.insightRow}>
                            <Text style={styles.insightLabel}>Stock Value (Retail)</Text>
                            <Text style={styles.insightValue}>
                                {formatCurrency(inventoryStats.totalStockValue)}
                            </Text>
                        </View>
                        <View style={styles.insightRow}>
                            <Text style={styles.insightLabel}>Total Cost Value</Text>
                            <Text style={styles.insightValue}>
                                {formatCurrency(inventoryStats.totalCostValue)}
                            </Text>
                        </View>
                        <View style={styles.insightDivider} />
                        <View style={styles.insightRow}>
                            <Text style={styles.insightLabelBold}>Potential Profit</Text>
                            <Text style={[styles.insightValueBold, { color: Colors.success }]}>
                                {formatCurrency(inventoryStats.totalPotentialProfit)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Best Performers */}
                {inventoryStats.bestValueItems && inventoryStats.bestValueItems.length > 0 && (
                    <View style={styles.insightCard}>
                        <View style={styles.insightCardHeader}>
                            <View style={[styles.insightIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                <Crown size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.insightCardTitle}>Top Profit Items</Text>
                        </View>

                        <View style={styles.insightContent}>
                            {inventoryStats.bestValueItems.slice(0, 5).map((item, index) => (
                                <View key={item.id || index} style={styles.bestItemRow}>
                                    <View style={styles.bestItemRank}>
                                        <Text style={styles.rankNumber}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.bestItemInfo}>
                                        <Text style={styles.bestItemName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.bestItemStock}>{item.quantity} in stock</Text>
                                    </View>
                                    <View style={styles.bestItemStats}>
                                        <Text style={styles.bestItemProfit}>
                                            +{formatCurrency((item.unitPrice || 0) - (item.wholesalePrice || 0))}
                                        </Text>
                                        <View style={[
                                            styles.marginPill,
                                            { backgroundColor: getMarginColor(item.profitMargin || 0) + '20' }
                                        ]}>
                                            <Text style={[
                                                styles.marginPillText,
                                                { color: getMarginColor(item.profitMargin || 0) }
                                            ]}>
                                                {item.profitMargin || 0}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Low Margin Alerts */}
                {inventoryStats.lowMarginItems && inventoryStats.lowMarginItems.length > 0 && (
                    <View style={[styles.insightCard, styles.warningCard]}>
                        <View style={styles.insightCardHeader}>
                            <View style={[styles.insightIconContainer, { backgroundColor: '#FEE2E2' }]}>
                                <AlertTriangle size={20} color={Colors.error} />
                            </View>
                            <Text style={[styles.insightCardTitle, { color: Colors.error }]}>
                                Low Margin Alert
                            </Text>
                        </View>

                        <View style={styles.insightContent}>
                            <Text style={styles.warningText}>
                                {inventoryStats.lowMarginItems.length} items have profit margin below 10%
                            </Text>
                            {inventoryStats.lowMarginItems.slice(0, 3).map((item, index) => (
                                <View key={item.id || index} style={styles.warningItem}>
                                    <View style={styles.warningDot} />
                                    <Text style={styles.warningItemText}>
                                        {item.name} - {item.profitMargin || 0}% margin
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderWeeklyReport = () => {
        const weeklyArray = Object.entries(weeklyReports);
        const growth = calculateWeeklyGrowth();

        if (weeklyArray.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Calendar size={48} color={Colors.textLight} />
                    </View>
                    <Text style={styles.emptyStateText}>No weekly data available</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Weekly reports will appear after multiple days of sales
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.weeklySection}>
                {/* Weekly Summary */}
                <View style={styles.weeklySummary}>
                    <Text style={styles.weeklySummaryTitle}>This Week's Performance</Text>
                    <View style={styles.weeklyGrowthContainer}>
                        {growth.profit >= 0 ? (
                            <TrendingUp size={20} color={Colors.success} />
                        ) : (
                            <TrendingDown size={20} color={Colors.error} />
                        )}
                        <Text style={[
                            styles.weeklyGrowthText,
                            { color: growth.profit >= 0 ? Colors.success : Colors.error }
                        ]}>
                            {growth.profit > 0 ? '+' : ''}{growth.profit.toFixed(1)}%
                        </Text>
                        <Text style={styles.weeklyGrowthLabel}>vs last week</Text>
                    </View>
                </View>

                {/* Weekly Cards */}
                {weeklyArray.map(([date, report], index) => (
                    <TouchableOpacity key={date} style={styles.weeklyCard} activeOpacity={0.7}>
                        <View style={styles.weeklyCardHeader}>
                            <View>
                                <Text style={styles.weeklyDate}>{formatDate(date)}</Text>
                                <Text style={styles.weeklyLabel}>
                                    {index === 0 ? 'Current Week' : `${index} week${index > 1 ? 's' : ''} ago`}
                                </Text>
                            </View>
                            <View style={styles.weeklyProfitContainer}>
                                <Text style={styles.weeklyProfitLabel}>Profit</Text>
                                <Text style={styles.weeklyProfit}>
                                    {formatCurrency(report.totalProfit)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.weeklyStats}>
                            <View style={styles.weeklyStat}>
                                <Text style={styles.weeklyStatLabel}>Sales</Text>
                                <Text style={styles.weeklyStatValue}>{formatCurrency(report.totalSales)}</Text>
                            </View>
                            <View style={styles.weeklyStatDivider} />
                            <View style={styles.weeklyStat}>
                                <Text style={styles.weeklyStatLabel}>Margin</Text>
                                <Text style={[
                                    styles.weeklyStatValue,
                                    { color: getMarginColor(report.margin) }
                                ]}>
                                    {report.margin}%
                                </Text>
                            </View>
                            <View style={styles.weeklyStatDivider} />
                            <View style={styles.weeklyStat}>
                                <Text style={styles.weeklyStatLabel}>Items</Text>
                                <Text style={styles.weeklyStatValue}>{report.transactionCount}</Text>
                            </View>
                        </View>

                        {report.bestSellingItem && (
                            <View style={styles.bestSellerBadge}>
                                <Crown size={12} color="#F59E0B" />
                                <Text style={styles.bestSellerText}>
                                    {report.bestSellingItem.name} ({report.bestSellingItem.sold} sold)
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Profit & Margin</Text>
                    <Text style={styles.headerSubtitle}>Financial Analysis</Text>
                </View>
                <TouchableOpacity
                    style={styles.exportButton}
                    onPress={handleExport}
                    disabled={exporting}
                >
                    {exporting ? (
                        <ActivityIndicator size="small" color={Colors.surface} />
                    ) : (
                        <Download size={20} color={Colors.surface} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'today' && styles.tabActive]}
                    onPress={() => setActiveTab('today')}
                >
                    <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
                        Today
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
                    onPress={() => setActiveTab('weekly')}
                >
                    <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
                        Weekly
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
                    onPress={() => setActiveTab('insights')}
                >
                    <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
                        Insights
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadData}
                        colors={[Colors.primary]}
                    />
                }
            >
                {activeTab === 'today' && (
                    <>
                        {renderSummaryCards()}
                        {renderCreditTransactions()}
                        {renderItemBreakdown()}
                    </>
                )}

                {activeTab === 'weekly' && renderWeeklyReport()}

                {activeTab === 'insights' && renderInventoryInsights()}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.primary,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.surface,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    exportButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: Spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: Colors.background,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.surface,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    summarySection: {
        padding: Spacing.md,
    },
    heroCard: {
        backgroundColor: '#d4f8e4ff',
        borderRadius: 20,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.lg,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    heroLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 6,
        fontWeight: '600',
    },
    heroValue: {
        fontSize: 36,
        fontWeight: '900',
        color: Colors.success,
        letterSpacing: -1,
    },
    marginBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: 12,
    },
    marginValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    heroFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.sm,
    },
    heroStat: {
        flex: 1,
        alignItems: 'center',
    },
    heroStatLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    heroStatValue: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    heroDivider: {
        width: 1,
        height: 24,
        backgroundColor: Colors.border,
    },
    miniStatsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    miniStatCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    miniStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    miniStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 2,
    },
    miniStatLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    breakdownSection: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
    transactionBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    transactionBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
    tableContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    tableCell: {
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    itemPrice: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    qtyBadge: {
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    qtyText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    saleAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    costAmount: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    profitAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.success,
        marginBottom: 2,
    },
    marginText: {
        fontSize: 10,
        fontWeight: '600',
    },
    tableFooter: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    footerLabel: {
        flex: 2,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    footerValue: {
        flex: 1.5,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'right',
    },
    footerProfit: {
        flex: 1.5,
        fontSize: 15,
        fontWeight: '800',
        color: Colors.success,
        textAlign: 'right',
    },
    emptyState: {
        alignItems: 'center',
        padding: Spacing.xxl,
        margin: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    emptyStateText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 6,
    },
    emptyStateSubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        marginTop: Spacing.xs,
    },
    refreshButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.surface,
    },
    loadingState: {
        alignItems: 'center',
        padding: Spacing.xxl,
        margin: Spacing.md,
    },
    loadingText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    insightsSection: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    insightCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    warningCard: {
        borderColor: Colors.error,
        borderWidth: 1.5,
    },
    insightCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    insightIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    insightContent: {
        padding: Spacing.md,
    },
    insightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    insightLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    insightValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    insightDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    insightLabelBold: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    insightValueBold: {
        fontSize: 16,
        fontWeight: '800',
    },
    bestItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    bestItemRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    rankNumber: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.primary,
    },
    bestItemInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    bestItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    bestItemStock: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    bestItemStats: {
        alignItems: 'flex-end',
    },
    bestItemProfit: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.success,
        marginBottom: 4,
    },
    marginPill: {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: 8,
    },
    marginPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    warningText: {
        fontSize: 13,
        color: Colors.error,
        marginBottom: Spacing.sm,
        fontWeight: '600',
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    warningDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.error,
    },
    warningItemText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    weeklySection: {
        padding: Spacing.md,
    },
    weeklySummary: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    weeklySummaryTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    weeklyGrowthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    weeklyGrowthText: {
        fontSize: 24,
        fontWeight: '800',
    },
    weeklyGrowthLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginLeft: Spacing.xs,
    },
    weeklyCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    weeklyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    weeklyDate: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    weeklyLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    weeklyProfitContainer: {
        alignItems: 'flex-end',
    },
    weeklyProfitLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    weeklyProfit: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.success,
    },
    weeklyStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    weeklyStat: {
        flex: 1,
        alignItems: 'center',
    },
    weeklyStatLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    weeklyStatValue: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text,
    },
    weeklyStatDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.border,
    },
    bestSellerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    bestSellerText: {
        fontSize: 11,
        color: '#92400E',
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        padding: Spacing.lg,
    },
    footerText: {
        fontSize: 11,
        color: Colors.textSecondary,
    },

    // Credit Transaction Styles
    creditSection: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    creditTotalBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    creditTotalText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.success,
    },
    creditListContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    creditTransactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    creditTransactionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    creditIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    creditTransactionInfo: {
        flex: 1,
    },
    creditTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flexWrap: 'wrap',
    },
    creditItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    creditTypeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    creditClearedBadge: {
        backgroundColor: '#D1FAE5',
    },
    creditPaymentBadge: {
        backgroundColor: '#FEF3C7',
    },
    creditTypeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    creditClearedText: {
        color: Colors.success,
    },
    creditPaymentText: {
        color: '#F59E0B',
    },
    creditCustomerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    creditCustomerName: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    creditTransactionTime: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    creditTransactionAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.success,
    },
    creditAmountContainer: {
        alignItems: 'flex-end',
    },
    creditProfitText: {
        fontSize: 11,
        color: Colors.success,
        fontWeight: '600',
        marginTop: 2,
    },
    creditSummaryHeader: {
        flexDirection: 'row',
        backgroundColor: '#F0FDF4',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    creditSummaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    creditSummaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    creditSummaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    creditSummaryDivider: {
        width: 1,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.sm,
    },
});

export default ProfitMarginReportScreen;