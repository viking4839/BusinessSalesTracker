import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { DollarSign, TrendingUp, TrendingDown, Clock, Plus, Search } from 'lucide-react-native';
import SMSReader from '../services/SMSReader';
import TransactionStorage from '../utils/TransactionStorage';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../styles/Theme';
import Card from '../components/Card';
import MetricCard from '../components/MetricCard';
import TransactionItem from '../components/TransactionItem';
import BankCard from '../components/BankCard';
import AddCashSaleButton from '../components/AddCashSaleButton';
import AddCashSaleDialog from '../components/AddCashSaleDialog';
import EnhancedHeader from '../components/EnhancedHeader';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation, route }) => {
  const [transactions, setTransactions] = useState([]);
  const [businessTransactions, setBusinessTransactions] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddSaleDialog, setShowAddSaleDialog] = useState(false);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [bankStats, setBankStats] = useState({});

  // Load transactions on mount
  useEffect(() => {
    loadStoredTransactions();
    requestSMSPermission();
  }, []);

  // Recalculate metrics when transactions change
  useEffect(() => {
    calculateMetrics();
  }, [transactions, businessTransactions]);

  // Handle new sale from route params
  useEffect(() => {
    if (route.params?.newSale) {
      handleNewManualSale(route.params.newSale);
      navigation.setParams({ newSale: null });
    }
  }, [route.params?.newSale]);

  const loadStoredTransactions = async () => {
    try {
      const stored = await TransactionStorage.loadTransactions();
      setTransactions(stored);
      filterBusinessTransactions(stored);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const requestSMSPermission = async () => {
    try {
      const granted = await SMSReader.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Permission request error:', error);
      setPermissionStatus('error');
    }
  };

  const handleScanSMS = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Please grant SMS permission to scan messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestSMSPermission },
        ]
      );
      return;
    }

    setIsScanning(true);
    try {
      const scannedTransactions = await SMSReader.scanRecentTransactions(200);

      // Merge with existing transactions (avoid duplicates)
      const existingIds = new Set(transactions.map(t => t.id));
      const newTransactions = scannedTransactions.filter(t => !existingIds.has(t.id));

      const mergedTransactions = [...newTransactions, ...transactions];

      setTransactions(mergedTransactions);
      await TransactionStorage.saveTransactions(mergedTransactions);
      filterBusinessTransactions(mergedTransactions);

      if (newTransactions.length > 0) {
        Alert.alert('Success', `Found ${newTransactions.length} new transactions!`);
      } else {
        Alert.alert('No New Transactions', 'All SMS transactions already scanned.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const filterBusinessTransactions = (allTransactions) => {
    // Filter for business transactions (received money only for now)
    const business = allTransactions.filter(t => t.amount > 0 && t.source === 'sms_scan');
    setBusinessTransactions(business);
  };

  const handleNewManualSale = async (saleData) => {
    const newTransaction = {
      id: `manual_${Date.now()}`,
      amount: parseFloat(saleData.amount),
      sender: saleData.customerName || 'Cash Sale',
      phone: saleData.customerPhone || null,
      timestamp: new Date(),
      type: 'cash',
      transactionType: 'received',
      message: saleData.description || 'Manual cash sale entry',
      bank: 'Cash',
      source: 'manual',
      category: saleData.category || 'general',
    };

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    await TransactionStorage.saveTransactions(updatedTransactions);
    filterBusinessTransactions(updatedTransactions);
  };

  const calculateMetrics = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const banks = {};

    businessTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      const amount = Math.abs(transaction.amount);

      if (transactionDate >= todayStart) {
        todayTotal += amount;
      }
      if (transactionDate >= weekStart) {
        weekTotal += amount;
      }
      if (transactionDate >= monthStart) {
        monthTotal += amount;
      }

      // Bank statistics
      const bankName = transaction.bank || 'Unknown';
      if (!banks[bankName]) {
        banks[bankName] = { count: 0, total: 0 };
      }
      banks[bankName].count++;
      banks[bankName].total += amount;
    });

    setTodayRevenue(todayTotal);
    setWeekRevenue(weekTotal);
    setMonthRevenue(monthTotal);
    setBankStats(banks);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStoredTransactions();
    if (permissionStatus === 'granted') {
      await handleScanSMS();
    }
    setRefreshing(false);
  }, [permissionStatus]);

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return COLORS.success;
      case 'denied':
        return COLORS.error;
      default:
        return COLORS.warning;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Use EnhancedHeader instead of custom header */}
      <EnhancedHeader
        title="Business Dashboard"
        subtitle="Track your sales and income"
        rightComponent={
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('AllTransactions')}
          >
            <Search size={24} color={COLORS.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Today's Revenue Card */}
        <Card style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <View>
              <Text style={styles.revenueLabel}>Today's Revenue</Text>
              <Text style={styles.revenueAmount}>
                Ksh {todayRevenue.toLocaleString('en-KE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <DollarSign size={32} color={COLORS.success} />
            </View>
          </View>
          <View style={styles.revenueFooter}>
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>This Week</Text>
              <Text style={styles.revenueMetricValue}>
                Ksh {weekRevenue.toLocaleString('en-KE')}
              </Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueMetric}>
              <Text style={styles.revenueMetricLabel}>This Month</Text>
              <Text style={styles.revenueMetricValue}>
                Ksh {monthRevenue.toLocaleString('en-KE')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Sales"
            value={businessTransactions.length.toString()}
            icon={<TrendingUp size={20} color={COLORS.primary} />}
            trend="+12.5%"
            trendUp={true}
          />
          <MetricCard
            title="Avg. Sale"
            value={`Ksh ${businessTransactions.length > 0 
              ? (businessTransactions.reduce((sum, t) => sum + t.amount, 0) / businessTransactions.length).toFixed(0)
              : '0'}`}
            icon={<DollarSign size={20} color={COLORS.success} />}
          />
        </View>

        {/* SMS Auto-Tracking Section (REPLACED WITH SCAN BUTTON) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 SMS Transaction Scanner</Text>
          
          <Card style={styles.smsCard}>
            {/* Permission Status */}
            <View style={[styles.permissionBadge, { backgroundColor: getPermissionStatusColor() }]}>
              <View style={styles.permissionDot} />
              <Text style={styles.permissionText}>
                SMS Access: {permissionStatus === 'granted' ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
              onPress={handleScanSMS}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              <View style={styles.scanButtonContent}>
                <Text style={styles.scanButtonIcon}>{isScanning ? '⏳' : '🔍'}</Text>
                <View>
                  <Text style={styles.scanButtonText}>
                    {isScanning ? 'Scanning SMS...' : 'Scan for Transactions'}
                  </Text>
                  <Text style={styles.scanButtonSubtext}>
                    Auto-detect M-Pesa & Bank SMS
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Stats Row */}
            <View style={styles.smsStatsRow}>
              <View style={styles.smsStatItem}>
                <Text style={styles.smsStatValue}>{transactions.length}</Text>
                <Text style={styles.smsStatLabel}>Total Found</Text>
              </View>
              <View style={styles.smsStatDivider} />
              <View style={styles.smsStatItem}>
                <Text style={styles.smsStatValue}>
                  {transactions.filter(t => t.source === 'sms_scan').length}
                </Text>
                <Text style={styles.smsStatLabel}>From SMS</Text>
              </View>
              <View style={styles.smsStatDivider} />
              <View style={styles.smsStatItem}>
                <Text style={styles.smsStatValue}>
                  {transactions.filter(t => t.source === 'manual').length}
                </Text>
                <Text style={styles.smsStatLabel}>Manual</Text>
              </View>
            </View>

            {/* Retry Permission Button */}
            {permissionStatus === 'denied' && (
              <TouchableOpacity
                style={styles.retryPermissionButton}
                onPress={requestSMSPermission}
              >
                <Text style={styles.retryPermissionText}>🔄 Grant SMS Permission</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Bank Detection */}
        {Object.keys(bankStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Sources</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(bankStats).map(([bankName, stats]) => (
                <BankCard
                  key={bankName}
                  bankName={bankName}
                  transactionCount={stats.count}
                  totalAmount={stats.total}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {businessTransactions.length > 0 ? (
            businessTransactions.slice(0, 5).map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onPress={() => {
                  navigation.navigate('TransactionDetails', { transaction });
                }}
              />
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>
                {permissionStatus === 'granted'
                  ? 'Tap the scan button above to find transactions in your SMS'
                  : 'Grant SMS permission or add manual cash sales to get started'}
              </Text>
            </Card>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <AddCashSaleButton onPress={() => setShowAddSaleDialog(true)} />

      {/* Add Cash Sale Dialog */}
      <AddCashSaleDialog
        visible={showAddSaleDialog}
        onClose={() => setShowAddSaleDialog(false)}
        onSubmit={handleNewManualSale}
      />
    </View>
  );
};

// Remove custom header styles since we're using EnhancedHeader
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  revenueCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  revenueLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  revenueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueFooter: {
    flexDirection: 'row',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  revenueMetric: {
    flex: 1,
  },
  revenueMetricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  revenueMetricValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.white,
    fontWeight: '600',
  },
  revenueDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  seeAllText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  smsCard: {
    padding: SPACING.lg,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  permissionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  scanButtonIcon: {
    fontSize: 32,
  },
  scanButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.white,
    fontWeight: '600',
  },
  scanButtonSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  smsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smsStatItem: {
    alignItems: 'center',
  },
  smsStatValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
  },
  smsStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  smsStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  retryPermissionButton: {
    backgroundColor: COLORS.warning,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  retryPermissionText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;