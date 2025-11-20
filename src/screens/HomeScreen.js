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
  Switch,
  AppState,
  DeviceEventEmitter,
} from 'react-native';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Menu,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Plus,
  Eye,
  EyeOff,
  Package,
} from 'lucide-react-native';
import SMSReader from '../services/SMSReader';
import TransactionStorage from '../utils/TransactionStorage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import BankCard from '../components/BankCard';
import AddCashSaleDialog from '../components/AddCashSaleDialog';
import { useFocusEffect } from '@react-navigation/native';

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
  const [todayDate, setTodayDate] = useState('');
  const [isRevenueVisible, setIsRevenueVisible] = useState(true);
  const [transactionCount, setTransactionCount] = useState(0);
  const [businessTransactionCount, setBusinessTransactionCount] = useState(0);
  const [activeBanks, setActiveBanks] = useState([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);

  // Initialize on mount
  useEffect(() => {
    setTodayDate(getTodayDate());
    loadStoredTransactions();
    requestSMSPermission();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground, refreshing data');
        loadStoredTransactions();
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, []);

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadStoredTransactions();
    }, [])
  );

  // Handle new manual sales from route params
  useEffect(() => {
    if (route.params?.newSale) {
      handleNewManualSale(route.params.newSale);
      navigation.setParams({ newSale: null });
    }
  }, [route.params?.newSale]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('transactions:cleared', () => {
      setTransactions([]);
      setBusinessTransactions([]);
      setActiveBanks([]);
      setTodayRevenue(0);
      setWeekRevenue(0);
      setMonthRevenue(0);
    });
    return () => sub.remove();
  }, []);

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const normalizeTransaction = (t) => {
    if (!t) return null;
    // Ensure timestamp unified
    const rawTime = t.timestamp || t.date || t.time || t.createdAt;
    const ts = rawTime ? new Date(rawTime) : new Date();
    // Parse amount
    let amt = t.amount;
    if (typeof amt === 'string') {
      const cleaned = amt.replace(/[^0-9.+-]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) amt = parsed;
    }
    // Ensure positive/negative preserved
    if (typeof amt !== 'number' || isNaN(amt)) amt = 0;

    return {
      ...t,
      amount: amt,
      timestamp: ts.toISOString(), // canonical field
      bank: t.bank || t.sourceBank || 'Unknown',
      sender: t.sender || t.from || t.payer || 'Unknown',
      source: t.source || (t.isManual ? 'manual' : 'sms_scan')
    };
  };

  const loadStoredTransactions = async () => {
    try {
      const stored = await TransactionStorage.loadTransactions();
      if (!stored || stored.length === 0) {
        setTransactions([]);
        setBusinessTransactions([]);
        setActiveBanks([]);
        setTransactionCount(0);
        setBusinessTransactionCount(0);
        setTodayRevenue(0);
        setWeekRevenue(0);
        setMonthRevenue(0);
        setYesterdayRevenue(0);
        return;
      }
      const normalized = stored.map(normalizeTransaction).filter(Boolean);
      setTransactions(normalized);
      filterBusinessTransactions(normalized);
      calculateMetrics(normalized);
      setActiveBanks(buildActiveBanks(normalized));
    } catch (error) {
      console.error('loadStoredTransactions error:', error);
    }
  };

  const requestSMSPermission = async () => {
    try {
      const granted = await SMSReader.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      console.log('📱 SMS Permission:', granted ? 'Granted' : 'Denied');
    } catch (error) {
      console.error('❌ Permission request error:', error);
      setPermissionStatus('error');
    }
  };

  const handleAutoTrackingToggle = async (value) => {
    if (value) {
      // Turn ON - Scan SMS
      await handleScanSMS();
    } else {
      // Turn OFF - Just update UI state
      setIsScanning(false);
      Alert.alert('Auto Tracking Paused', 'SMS scanning has been stopped');
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
    console.log('🔍 Starting SMS scan...');

    try {
      const scannedTransactions = await SMSReader.scanRecentTransactions(200);
      const normalizedScanned = (scannedTransactions || []).map(normalizeTransaction);

      const existingTransactions = await TransactionStorage.loadTransactions();
      const normalizedExisting = (existingTransactions || []).map(normalizeTransaction);
      const existingIds = new Set(normalizedExisting.map(t => t.id));

      const newTransactions = normalizedScanned.filter(t => !existingIds.has(t.id));
      console.log(`✨ Found ${newTransactions.length} new transactions`);

      if (newTransactions.length > 0) {
        const merged = [...newTransactions, ...normalizedExisting];
        await TransactionStorage.saveTransactions(merged);
        setTransactions(merged);
        filterBusinessTransactions(merged);
        calculateMetrics(merged);
        setActiveBanks(buildActiveBanks(merged));

        Alert.alert(
          '✅ Scan Complete',
          `Added ${newTransactions.length} new transactions.\n\n` +
          `Today's revenue: Ksh ${merged
            .filter(t => {
              const d = new Date(t.timestamp);
              return !isNaN(d) &&
                d >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                t.amount > 0;
            })
            .reduce((s, t) => s + t.amount, 0).toLocaleString()}`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Scan Complete', 'No new transactions found.', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('❌ SMS Scan Error:', error);
      Alert.alert('Error', error.message || 'Failed to scan SMS');
    } finally {
      setIsScanning(false);
    }
  };

  const filterBusinessTransactions = (allTransactions) => {
    // Business transactions are incoming payments (amount > 0)
    const business = allTransactions.filter(t => t.amount > 0);
    setBusinessTransactions(business);
    setBusinessTransactionCount(business.length);
    setTransactionCount(allTransactions.length);

    console.log(`📊 Filtered: ${business.length} business transactions out of ${allTransactions.length} total`);
  };

  const calculateMetrics = (allTransactions) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let yesterdayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const banks = {};

    allTransactions.forEach(transaction => {
      const rawTime = transaction.timestamp || transaction.date || transaction.time || transaction.createdAt;
      const transactionDate = rawTime ? new Date(rawTime) : null;
      if (!transactionDate || isNaN(transactionDate)) return;

      const amount = Number(transaction.amount);
      if (isNaN(amount) || amount <= 0) return; // only count incoming

      if (transactionDate >= todayStart) todayTotal += amount;
      if (transactionDate >= yesterdayStart && transactionDate < todayStart) yesterdayTotal += amount;
      if (transactionDate >= weekStart) weekTotal += amount;
      if (transactionDate >= monthStart) monthTotal += amount;

      const bankName = transaction.bank || 'Unknown';
      if (!banks[bankName]) banks[bankName] = { count: 0, total: 0 };
      banks[bankName].count++;
      banks[bankName].total += amount;
    });

    setTodayRevenue(todayTotal);
    setYesterdayRevenue(yesterdayTotal);
    setWeekRevenue(weekTotal);
    setMonthRevenue(monthTotal);
    setBankStats(banks);

    console.log(`💰 Metrics: Today=${todayTotal}, Yesterday=${yesterdayTotal}, Week=${weekTotal}, Month=${monthTotal}`);
  };

  const buildActiveBanks = (transactions) => {
    const bankMap = new Map();

    transactions.forEach(t => {
      if (!t?.bank) return;

      const bankName = t.bank.trim();
      const timestamp = new Date(t.timestamp || Date.now());

      const entry = bankMap.get(bankName) || {
        name: bankName,
        active: true,
        transactionCount: 0,
        lastActivityDate: null,
        color: getBankColor(bankName)
      };

      entry.transactionCount++;
      if (!entry.lastActivityDate || timestamp > entry.lastActivityDate) {
        entry.lastActivityDate = timestamp;
      }

      bankMap.set(bankName, entry);
    });

    const formatLastActivity = (date) => {
      if (!date) return null;
      const diffMs = Date.now() - date.getTime();
      const mins = Math.floor(diffMs / 60000);

      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;

      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;

      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    };

    return Array.from(bankMap.values()).map(entry => ({
      ...entry,
      lastActivity: formatLastActivity(entry.lastActivityDate)
    }));
  };

  const getBankColor = (bankName) => {
    const colors = {
      'M-Pesa': '#16A34A',
      'Equity Bank': '#DC2626',
      'Co-operative Bank': '#F97316',
      'KCB': '#65A30D',
      'DTB': '#0284C7',
      'Family Bank': '#DC2626',
      'Standard Chartered': '#0284C7',
      'Cash': '#10B981',
    };
    return colors[bankName] || '#6B7280';
  };

  const handleNewManualSale = async (saleData) => {
    try {
      const newTransaction = {
        id: `manual_${Date.now()}`,
        amount: Number(saleData.amount),
        sender: saleData.customerName || 'Cash Customer',
        phone: saleData.phone || null,
        timestamp: new Date().toISOString(),
        type: 'received',
        transactionType: 'received',
        message: saleData.notes || 'Manual cash sale',
        bank: saleData.paymentMethod || 'Cash',
        source: 'manual',
        isBusinessTransaction: true,
        isManual: true,
        category: 'general',
        // NEW: Inventory link fields
        linkedInventoryId: saleData.linkedInventoryId || null,
        linkedInventoryName: saleData.linkedInventoryName || null,
        saleQuantity: saleData.saleQuantity || null,
        stockDeducted: !!saleData.linkedInventoryId,
      };

      console.log('💵 Adding manual sale:', newTransaction);

      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);
      await TransactionStorage.saveTransactions(updatedTransactions);
      filterBusinessTransactions(updatedTransactions);
      calculateMetrics(updatedTransactions);
      setActiveBanks(buildActiveBanks(updatedTransactions));
    } catch (error) {
      console.error('Add manual sale error:', error);
      Alert.alert('Error', 'Failed to record sale');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStoredTransactions();
    setRefreshing(false);
  }, []);

  const getBusinessPercentage = () => {
    if (transactionCount === 0) return 0;
    return Math.round((businessTransactionCount / transactionCount) * 100);
  };

  const getAverageTransaction = () => {
    if (businessTransactionCount === 0) return 0;
    return Math.round(todayRevenue / businessTransactionCount);
  };

  const getGrowthPercentage = () => {
    if (yesterdayRevenue === 0) return todayRevenue > 0 ? 100 : 0;
    return ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100);
  };

  const isGrowthPositive = () => {
    return todayRevenue >= yesterdayRevenue;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryStart} />

      {/* Gradient Header */}
      <View style={styles.gradientHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>TRACK BIZ</Text>
            <Text style={styles.headerDate}>{todayDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Menu size={22} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Revenue Card */}
      <TouchableOpacity
        style={styles.revenueCard}
        activeOpacity={0.95}
        onPress={() => navigation.navigate('Analytics')}
      >
        <Text style={styles.revenueLabel}>Today's Business Revenue</Text>

        <View style={styles.revenueAmountContainer}>
          {isRevenueVisible ? (
            <Text style={styles.revenueAmount}>
              Ksh {todayRevenue.toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.revenueAmount}>Ksh ••••••</Text>
          )}
        </View>

        <View style={styles.revenueFooter}>
          <View style={styles.growthContainer}>
            {isGrowthPositive() ? (
              <TrendingUp size={14} color={Colors.success} />
            ) : (
              <TrendingDown size={14} color={Colors.error} />
            )}
            <Text style={[
              styles.growthText,
              { color: isGrowthPositive() ? Colors.success : Colors.error }
            ]}>
              {isGrowthPositive() ? '+' : ''}
              {getGrowthPercentage().toFixed(1)}% from yesterday
            </Text>
          </View>

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setIsRevenueVisible(!isRevenueVisible)}
          >
            {isRevenueVisible ? (
              <Eye size={16} color={Colors.textSecondary} />
            ) : (
              <EyeOff size={16} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: Spacing.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Metrics Grid - 4 Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <BarChart3 size={20} color="#2563EB" />
            </View>
            <Text style={styles.metricLabel}>Business Transactions</Text>
            <Text style={styles.metricValue}>{businessTransactionCount}</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <Activity size={20} color="#6366F1" />
            </View>
            <Text style={styles.metricLabel}>Total Transactions</Text>
            <Text style={styles.metricValue}>{transactionCount}</Text>
          </View>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <TrendingUp size={20} color="#EF4444" />
            </View>
            <View style={styles.metricHeaderRow}>
              <Text style={styles.metricLabel}>Business Rate</Text>
              <Text style={styles.viewLink}>View</Text>
            </View>
            <Text style={styles.metricValue}>{getBusinessPercentage()}%</Text>
          </TouchableOpacity>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <DollarSign size={20} color="#0284C7" />
            </View>
            <Text style={styles.metricLabel}>Average Transaction</Text>
            <Text style={styles.metricValue}>Ksh {getAverageTransaction().toLocaleString()}</Text>
          </View>
        </View>

        {/* Auto Tracking + Cash Sales Cards */}
        <View style={styles.actionCardsRow}>
          {/* Auto Tracking Card (SMS Scanner) */}
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingTitle}>SMS Tracking</Text>
              <Switch
                value={isScanning}
                onValueChange={handleAutoTrackingToggle}
                trackColor={{ false: '#E5E7EB', true: Colors.success + '60' }}
                thumbColor={isScanning ? Colors.success : '#F3F4F6'}
                disabled={isScanning}
              />
            </View>
            <Text style={styles.trackingSubtitle}>
              {permissionStatus === 'granted'
                ? (isScanning ? 'Scanning SMS...' : 'Ready to scan')
                : 'Permission needed'}
            </Text>
            <View style={styles.trackingStatus}>
              <View style={[styles.statusDot, {
                backgroundColor: permissionStatus === 'granted' ? Colors.success : '#9CA3AF'
              }]} />
              <Text style={styles.statusText}>
                {isScanning
                  ? 'Scanning...'
                  : `${transactions.filter(t => t.source === 'sms_scan').length} SMS found`}
              </Text>
            </View>
          </View>

          {/* Cash Sales Card */}
          <TouchableOpacity
            style={styles.cashSalesCard}
            onPress={() => setShowAddSaleDialog(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.cashSalesTitle}>Cash Sales</Text>
            <Text style={styles.cashSalesSubtitle}>Record manually</Text>
            <View style={styles.cashSalesAction}>
              <View style={styles.cashSalesIconRow}>
                <Wallet size={18} color={Colors.success} />
                <Text style={styles.cashSalesActionText}>Add Sale</Text>
              </View>
              <Plus size={20} color={Colors.success} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Detected Services */}
        {activeBanks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Services</Text>
            <Text style={styles.sectionSubtitle}>Auto-detected from SMS messages</Text>
            <View style={styles.banksList}>
              {activeBanks.map(bank => (
                <BankCard key={bank.name} {...bank} />
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>

          {businessTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Turn on Auto Tracking or add manual sales to get started
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {businessTransactions.slice(0, 10).map((transaction, index) => {
                // Check if transaction has pending inventory match
                const hasMatch = transaction.inventoryMatch &&
                  !transaction.inventoryMatch.userConfirmed &&
                  !transaction.inventoryMatch.userDismissed;

                return (
                  <TouchableOpacity
                    key={transaction.id || index}
                    style={styles.transactionItem}
                    onPress={() => navigation.navigate('Transactions', {
                      screen: 'TransactionDetails',
                      params: { transaction }
                    })}
                  >
                    <View style={styles.transactionIconWrapper}>
                      <View style={styles.transactionIcon}>
                        {transaction.amount > 0 ? (
                          <ArrowDownLeft size={16} color={Colors.success} />
                        ) : (
                          <ArrowUpRight size={16} color={Colors.error} />
                        )}
                      </View>

                      {/* NEW: Inventory Match Badge */}
                      {hasMatch && (
                        <View style={styles.matchBadge}>
                          <Package size={10} color={Colors.surface} />
                        </View>
                      )}
                    </View>

                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionSender} numberOfLines={1}>
                        {transaction.sender || 'Unknown'}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <Text style={styles.transactionBank}>{transaction.bank}</Text>
                        {transaction.source === 'manual' && (
                          <>
                            <Text style={styles.transactionDot}>•</Text>
                            <View style={styles.businessBadge}>
                              <Text style={styles.businessBadgeText}>Manual</Text>
                            </View>
                          </>
                        )}
                        {/* NEW: Show inventory match indicator */}
                        {hasMatch && (
                          <>
                            <Text style={styles.transactionDot}>•</Text>
                            <View style={[styles.businessBadge, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={[styles.businessBadgeText, { color: '#F59E0B' }]}>Match</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <Text style={styles.transactionTime}>
                        {new Date(transaction.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>

                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.amount > 0 ? Colors.success : Colors.error }
                    ]}>
                      {transaction.amount > 0 ? '+' : ''} Ksh {Math.abs(transaction.amount).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Transactions', { screen: 'TransactionsList' })}
              >
                <Text style={styles.viewAllText}>View All Transactions</Text>
                <Text style={styles.viewAllArrow}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Track Biz • Secure & Encrypted</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Cash Sale Dialog */}
      <AddCashSaleDialog
        visible={showAddSaleDialog}
        onClose={() => setShowAddSaleDialog(false)}
        onAddSale={handleNewManualSale}   // CHANGED from onSubmit to onAddSale
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientHeader: {
    backgroundColor: Colors.primaryStart,
    paddingTop: Spacing.xl - 15,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 35,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.surface,
    marginBottom: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  revenueCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: -35,
    ...Shadows.lg,
    elevation: 8,
  },
  revenueLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  revenueAmountContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  revenueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  metricCard: {
    width: (width - Spacing.md * 3) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  viewLink: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  actionCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trackingCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardMint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
  },
  cashSalesCard: {
    flex: 1,
    backgroundColor: Colors.cardLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  cashSalesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cashSalesSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  cashSalesAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashSalesIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashSalesActionText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  banksList: {
    gap: Spacing.sm,
  },
  transactionsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  transactionIconWrapper: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
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
  transactionDetails: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  transactionSender: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  transactionBank: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  transactionDot: {
    fontSize: 11,
    color: Colors.borderLight,
  },
  businessBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  businessBadgeText: {
    fontSize: 9,
    color: '#4F46E5',
    fontWeight: '600',
  },
  transactionTime: {
    fontSize: 11,
    color: Colors.textLight,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllButton: {
    padding: Spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  viewAllArrow: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;