// screens/ProfitMarginReportScreen.js

// screens/ProfitMarginReportScreen.js - FULLY FUNCTIONAL VERSION

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
} from 'react-native';
import {
    TrendingUp,
    DollarSign,
    Package,
    Calendar,
    BarChart3,
    ArrowLeft,
    Download,
    Share2,
    AlertTriangle,
    Crown,
    RefreshCw
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import InventoryStorage from '../utils/InventoryStorage';
import PDFExport from '../utils/PDFExport';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';

const ProfitMarginReportScreen = ({ navigation }) => {
    const [todayReport, setTodayReport] = useState(null);
    const [weeklyReports, setWeeklyReports] = useState({});
    const [monthlyReports, setMonthlyReports] = useState({});
    const [inventoryStats, setInventoryStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('today');
    const [exporting, setExporting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setRefreshing(true);
        try {
            console.log('🔄 Loading profit report data...');

            // Load today's report
            const today = new Date().toISOString().split('T')[0];
            const report = await ProfitReportStorage.loadReport(today);
            setTodayReport(report);
            console.log('✅ Today report:', report);

            // Load weekly reports
            const weekly = await ProfitReportStorage.getWeeklyReports();
            setWeeklyReports(weekly);
            console.log('✅ Weekly reports:', Object.keys(weekly).length);

            // Load monthly reports  
            const monthly = await ProfitReportStorage.getMonthlyReports();
            setMonthlyReports(monthly);

            // Load inventory stats
            const stats = await InventoryStorage.getInventoryStats();
            setInventoryStats(stats);
            console.log('✅ Inventory stats:', stats);

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
            // Force regenerate today's report
            const freshReport = await ProfitReportStorage.refreshTodaysReport();
            setTodayReport(freshReport);

            // Reload other data
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
            // Check if there's data to export
            if (activeTab === 'today' && (!todayReport || Object.keys(todayReport).length === 0)) {
                Alert.alert('No Data', 'There is no profit data to export for today.');
                return;
            } else if (activeTab === 'weekly' && Object.keys(weeklyReports).length === 0) {
                Alert.alert('No Data', 'There is no weekly data to export.');
                return;
            }

            if (activeTab === 'today') {
                await PDFExport.generateProfitReportPDF(todayReport, inventoryStats);
            } else if (activeTab === 'weekly') {
                await PDFExport.exportWeeklyReport(weeklyReports);
            } else {
                // For insights tab, use today's report
                await PDFExport.generateProfitReportPDF(todayReport, inventoryStats);
            }
            // Success handled by share dialog
        } catch (error) {
            console.error('Export error:', error);

            if (error.message && error.message.includes('Failed to generate report')) {
                Alert.alert(
                    'Export Failed',
                    'Could not generate the report. Please try again.',
                    [{ text: 'OK' }]
                );
            } else if (error.message && error.message.includes('User did not share')) {
                // User cancelled the share - no need to show error
                console.log('User cancelled share');
            } else {
                Alert.alert(
                    'Export Failed',
                    error.message || 'An unexpected error occurred'
                );
            }
        } finally {
            setExporting(false);
        }
    };

    const handleShare = async () => {
        try {
            let shareMessage = '';

            if (activeTab === 'today' && todayReport) {
                shareMessage = `🏪 Today's Profit Report:\n` +
                    `Sales: Ksh ${todayReport.totalSales?.toLocaleString()}\n` +
                    `Profit: Ksh ${todayReport.totalProfit?.toLocaleString()}\n` +
                    `Margin: ${todayReport.margin}%\n` +
                    `Transactions: ${todayReport.transactionCount}`;
            } else if (activeTab === 'weekly') {
                const weekProfit = Object.values(weeklyReports).reduce((sum, report) => sum + report.totalProfit, 0);
                shareMessage = `🏪 Weekly Profit Report:\n` +
                    `Total Profit: Ksh ${weekProfit.toLocaleString()}\n` +
                    `Days: ${Object.keys(weeklyReports).length}\n` +
                    `Average Daily: Ksh ${Math.round(weekProfit / Object.keys(weeklyReports).length).toLocaleString()}`;
            }

            if (shareMessage) {
                await Share.share({
                    title: 'Track Biz Profit Report',
                    message: shareMessage,
                });
            }
        } catch (error) {
            console.error('Share error:', error);
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

    const getGrowthIcon = (current, previous) => {
        if (!previous || previous === 0) return <TrendingUp size={14} color={Colors.success} />;
        return current >= previous ?
            <TrendingUp size={14} color={Colors.success} /> :
            <TrendingUp size={14} color={Colors.error} />;
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

    const renderSummaryCards = () => (
        <View style={styles.summaryGrid}>
            {/* Total Sales */}
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                    <DollarSign size={20} color="#2563EB" />
                </View>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>
                    {formatCurrency(todayReport?.totalSales)}
                </Text>
                <Text style={styles.summarySubtext}>Today</Text>
            </View>

            {/* Total Cost */}
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Package size={20} color="#DC2626" />
                </View>
                <Text style={styles.summaryLabel}>Cost of Goods</Text>
                <Text style={styles.summaryValue}>
                    {formatCurrency(todayReport?.totalCost)}
                </Text>
                <Text style={styles.summarySubtext}>Wholesale cost</Text>
            </View>

            {/* Gross Profit */}
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                    <TrendingUp size={20} color="#065F46" />
                </View>
                <Text style={styles.summaryLabel}>Gross Profit</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>
                    {formatCurrency(todayReport?.totalProfit)}
                </Text>
                <Text style={styles.summarySubtext}>Profit today</Text>
            </View>

            {/* Margin */}
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                    <BarChart3 size={20} color="#4F46E5" />
                </View>
                <Text style={styles.summaryLabel}>Profit Margin</Text>
                <Text style={[styles.summaryValue, {
                    color: (todayReport?.margin || 0) > 20 ? Colors.success :
                        (todayReport?.margin || 0) > 10 ? Colors.warning : Colors.error
                }]}>
                    {todayReport?.margin || 0}%
                </Text>
                <Text style={styles.summarySubtext}>Margin percentage</Text>
            </View>
        </View>
    );

    const renderItemBreakdown = () => {
        if (!todayReport?.items || todayReport.items.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Package size={40} color={Colors.textLight} />
                    <Text style={styles.emptyStateText}>No sales recorded today</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Sales will appear here when you make transactions
                    </Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={handleManualRefresh}
                    >
                        <RefreshCw size={16} color={Colors.primary} />
                        <Text style={styles.refreshButtonText}>Refresh Data</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.breakdownSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Itemized Breakdown</Text>
                    <Text style={styles.transactionCount}>
                        {todayReport.transactionCount} transactions
                    </Text>
                </View>
                <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownHeaderText}>Item</Text>
                    <Text style={styles.breakdownHeaderText}>Sold</Text>
                    <Text style={styles.breakdownHeaderText}>Retail</Text>
                    <Text style={styles.breakdownHeaderText}>Cost</Text>
                    <Text style={styles.breakdownHeaderText}>Profit</Text>
                </View>
                {todayReport.items.map((item, index) => (
                    <View key={index} style={styles.breakdownRow}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemData}>{item.sold}</Text>
                        <Text style={styles.itemData}>Ksh {item.retailPrice?.toLocaleString()}</Text>
                        <Text style={styles.itemData}>Ksh {item.wholesalePrice?.toLocaleString()}</Text>
                        <Text style={[styles.itemData, { color: Colors.success, fontWeight: '700' }]}>
                            Ksh {item.profit?.toLocaleString()}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderInventoryInsights = () => {
        if (!inventoryStats) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.emptyStateText}>Loading inventory insights...</Text>
                </View>
            );
        }

        return (
            <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>Inventory Insights</Text>

                {/* Stock Value */}
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <Text style={styles.insightTitle}>Stock Value & Potential Profit</Text>
                    </View>
                    <View style={styles.insightRow}>
                        <Text style={styles.insightLabel}>Total Stock Value:</Text>
                        <Text style={styles.insightValue}>
                            {formatCurrency(inventoryStats.totalStockValue)}
                        </Text>
                    </View>
                    <View style={styles.insightRow}>
                        <Text style={styles.insightLabel}>Total Cost Value:</Text>
                        <Text style={styles.insightValue}>
                            {formatCurrency(inventoryStats.totalCostValue)}
                        </Text>
                    </View>
                    <View style={styles.insightRow}>
                        <Text style={styles.insightLabel}>Potential Profit:</Text>
                        <Text style={[styles.insightValue, { color: Colors.success }]}>
                            {formatCurrency(inventoryStats.totalPotentialProfit)}
                        </Text>
                    </View>
                </View>

                {/* Best Value Items */}
                {inventoryStats.bestValueItems.length > 0 && (
                    <View style={styles.insightCard}>
                        <View style={styles.insightHeader}>
                            <Crown size={16} color={Colors.warning} />
                            <Text style={styles.insightTitle}>Best Value Items</Text>
                        </View>
                        {inventoryStats.bestValueItems.slice(0, 3).map((item, index) => (
                            <View key={item.id} style={styles.bestItemRow}>
                                <Text style={styles.bestItemName}>{item.name}</Text>
                                <View style={styles.bestItemStats}>
                                    <Text style={styles.bestItemProfit}>
                                        Ksh {(item.unitPrice - item.wholesalePrice).toLocaleString()}
                                    </Text>
                                    <Text style={styles.bestItemMargin}>
                                        {item.profitMargin}% margin
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Low Margin Alerts */}
                {inventoryStats.lowMarginItems.length > 0 && (
                    <View style={[styles.insightCard, { borderColor: Colors.error }]}>
                        <View style={styles.insightHeader}>
                            <AlertTriangle size={16} color={Colors.error} />
                            <Text style={[styles.insightTitle, { color: Colors.error }]}>
                                Low Margin Alerts
                            </Text>
                        </View>
                        <Text style={styles.alertText}>
                            {inventoryStats.lowMarginItems.length} items have less than 10% profit margin
                        </Text>
                        {inventoryStats.lowMarginItems.slice(0, 2).map(item => (
                            <Text key={item.id} style={styles.alertItem}>
                                {item.name} ({item.profitMargin}% margin)
                            </Text>
                        ))}
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
                    <Calendar size={40} color={Colors.textLight} />
                    <Text style={styles.emptyStateText}>No weekly data available</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Weekly reports will appear after multiple days of sales
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.weeklySection}>
                <View style={styles.weeklyHeader}>
                    <Text style={styles.sectionTitle}>Weekly Performance</Text>
                    <View style={styles.growthBadge}>
                        {getGrowthIcon(growth.profit, 0)}
                        <Text style={[
                            styles.growthText,
                            { color: getGrowthColor(growth.profit, 0) }
                        ]}>
                            {growth.profit > 0 ? '+' : ''}{growth.profit.toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {weeklyArray.map(([date, report]) => (
                    <TouchableOpacity key={date} style={styles.weeklyCard}>
                        <View style={styles.weeklyCardHeader}>
                            <Text style={styles.weeklyDate}>{formatDate(date)}</Text>
                            <Text style={styles.weeklyProfit}>
                                {formatCurrency(report.totalProfit)}
                            </Text>
                        </View>
                        <View style={styles.weeklyDetails}>
                            <Text style={styles.weeklyDetail}>Sales: {formatCurrency(report.totalSales)}</Text>
                            <Text style={styles.weeklyDetail}>Margin: {report.margin}%</Text>
                            <Text style={styles.weeklyDetail}>Items: {report.transactionCount}</Text>
                        </View>
                        {report.bestSellingItem && (
                            <Text style={styles.bestSeller}>
                                🏆 {report.bestSellingItem.name} ({report.bestSellingItem.sold} sold)
                            </Text>
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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profit & Margin Report</Text>
                <View style={styles.headerActions}>

                    <TouchableOpacity
                        style={styles.actionButton}
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
                        This Week
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
                        {renderItemBreakdown()}
                    </>
                )}

                {activeTab === 'weekly' && renderWeeklyReport()}

                {activeTab === 'insights' && renderInventoryInsights()}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Last updated: {new Date().toLocaleTimeString()}
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.surface,
    },
    headerActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        padding: Spacing.xs,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    tabTextActive: {
        color: Colors.surface,
    },
    scrollView: {
        flex: 1,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    summaryCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    summarySubtext: {
        fontSize: 11,
        color: Colors.textLight,
    },
    breakdownSection: {
        padding: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    transactionCount: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    breakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.xs,
    },
    breakdownHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        flex: 1,
        textAlign: 'center',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    itemName: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text,
        flex: 2,
    },
    itemData: {
        fontSize: 12,
        color: Colors.text,
        flex: 1,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        padding: Spacing.xxl,
        margin: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyStateText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.primary + '15',
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    refreshButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    insightsSection: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    insightCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    insightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    insightLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    insightValue: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    bestItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    bestItemName: {
        fontSize: 13,
        color: Colors.text,
        flex: 1,
    },
    bestItemStats: {
        alignItems: 'flex-end',
    },
    bestItemProfit: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.success,
    },
    bestItemMargin: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    alertText: {
        fontSize: 12,
        color: Colors.error,
        marginBottom: Spacing.sm,
    },
    alertItem: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    weeklySection: {
        padding: Spacing.md,
    },
    weeklyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    growthText: {
        fontSize: 12,
        fontWeight: '600',
    },
    weeklyCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    weeklyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    weeklyDate: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    weeklyProfit: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
    weeklyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    weeklyDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    bestSeller: {
        fontSize: 11,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    footer: {
        alignItems: 'center',
        padding: Spacing.lg,
    },
    footerText: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
});

export default ProfitMarginReportScreen;