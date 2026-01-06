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
  AppState,
  DeviceEventEmitter,
  ActivityIndicator,
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
  AlertTriangle,
  Zap,
  Bell,
  Receipt,
  RefreshCw,
} from 'lucide-react-native';
import SMSReader from '../services/SMSReader';
import TransactionStorage from '../utils/TransactionStorage';
import CreditStorage from '../utils/CreditStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import NotificationService from '../services/NotificationService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import BankCard from '../components/BankCard';
import AddCashSaleDialog from '../components/AddCashSaleDialog';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReminderStorage from '../utils/ReminderStorage';
import ExpenseStorage from '../utils/ExpenseStorage';

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
  const [creditStats, setCreditStats] = useState({ outstanding: 0, owingCustomers: 0 });
  const [profitStats, setProfitStats] = useState({
    todayProfit: 0,
    margin: 0,
    itemsSold: 0,
    bestSeller: null
  });
  const [reminderStats, setReminderStats] = useState({
    active: 0,
    today: 0,
    overdue: 0
  });
  const [todayMoneyOut, setTodayMoneyOut] = useState(0); // Add this state
  const [smsScanEnabled, setSmsScanEnabled] = useState(true);
  const [expenseStats, setExpenseStats] = useState({
    today: 0,
    count: 0
  });

  // Initialize on mount
  useEffect(() => {
    setTodayDate(getTodayDate());
    loadStoredTransactions();
    requestSMSPermission();
    loadSmsScanSetting();
    loadReminderStats();
    loadExpenseStats();

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
      loadCreditStats();
      loadProfitStats();
      loadSmsScanSetting();
      loadReminderStats();
      loadExpenseStats();
    }, [])
  );

  // Check alerts on focus
  useFocusEffect(
    React.useCallback(() => {
      const checkAlerts = async () => {
        await NotificationService.checkAllAlerts();
      };
      checkAlerts();
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

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('settings:updated', (data) => {
      if (data.smsScanEnabled !== undefined) {
        setSmsScanEnabled(data.smsScanEnabled);
      }
    });

    return () => subscription.remove();
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
    const rawTime = t.timestamp || t.date || t.time || t.createdAt;
    const ts = rawTime ? new Date(rawTime) : new Date();
    let amt = t.amount;
    if (typeof amt === 'string') {
      const cleaned = amt.replace(/[^0-9.+-]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) amt = parsed;
    }
    if (typeof amt !== 'number' || isNaN(amt)) amt = 0;

    return {
      ...t,
      amount: amt,
      timestamp: ts.toISOString(),
      bank: t.bank || t.sourceBank || 'Unknown',
      sender: t.sender || t.from || t.payer || 'Unknown',
      source: t.source || (t.isManual ? 'manual' : 'sms_scan')
    };
  };

  const loadSmsScanSetting = async () => {
    try {
      const settings = await AsyncStorage.getItem('settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setSmsScanEnabled(parsed.smsScanEnabled !== false); // default to true
      }
    } catch (error) {
      console.error('Error loading SMS scan setting:', error);
    }
  }
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

  const loadExpenseStats = async () => {
    try {
      const stats = await ExpenseStorage.getTodayStats();
      setExpenseStats({
        today: stats.total,
        count: stats.count
      });
      console.log('✅ Expense stats loaded:', stats.total);
    } catch (error) {
      console.error('Error loading expense stats:', error);
    }
  };

  const loadReminderStats = async () => {
    try {
      const stats = await ReminderStorage.getStats();
      setReminderStats({
        active: stats.active,
        today: stats.today,
        overdue: stats.overdue
      });
    } catch (error) {
      console.error('Error loading reminder stats:', error);
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

  const handleScanSMS = async () => {
    if (!smsScanEnabled) {
      Alert.alert(
        'SMS Scanning Disabled',
        'SMS scanning is currently turned off. Please enable it in Settings to use this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.navigate('Settings')
          },
        ]
      );
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Please grant SMS permission to scan messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: () => setTimeout(requestSMSPermission, 200)
          },
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
      if (!error.message?.includes('not attached to an Activity')) {
        Alert.alert('Error', error.message || 'Failed to scan SMS');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const filterBusinessTransactions = (allTransactions) => {
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
    let todayOut = 0; // Track money out
    let yesterdayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const banks = {};

    allTransactions.forEach(transaction => {
      const rawTime = transaction.timestamp || transaction.date || transaction.time || transaction.createdAt;
      const transactionDate = rawTime ? new Date(rawTime) : null;
      if (!transactionDate || isNaN(transactionDate)) return;

      const amount = Number(transaction.amount);
      if (isNaN(amount)) return;

      // Count incoming money (business revenue)
      if (amount > 0) {
        if (transactionDate >= todayStart) todayTotal += amount;
        if (transactionDate >= yesterdayStart && transactionDate < todayStart) yesterdayTotal += amount;
        if (transactionDate >= weekStart) weekTotal += amount;
        if (transactionDate >= monthStart) monthTotal += amount;

        const bankName = transaction.bank || 'Unknown';
        if (!banks[bankName]) banks[bankName] = { count: 0, total: 0 };
        banks[bankName].count++;
        banks[bankName].total += amount;
      }

      // Count outgoing money
      if (amount < 0 && transactionDate >= todayStart) {
        todayOut += Math.abs(amount);
      }
    });

    setTodayRevenue(todayTotal);
    setTodayMoneyOut(todayOut); // Set money out
    setYesterdayRevenue(yesterdayTotal);
    setWeekRevenue(weekTotal);
    setMonthRevenue(monthTotal);
    setBankStats(banks);

    console.log(`💰 Metrics: Revenue In=${todayTotal}, Money Out=${todayOut}, Net=${todayTotal - todayOut}, Yesterday=${yesterdayTotal}, Week=${weekTotal}, Month=${monthTotal}`);
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
        timestamp: saleData.timestamp || new Date().toISOString(),
        type: 'received',
        transactionType: 'received',
        message: saleData.notes || 'Manual cash sale',
        bank: saleData.paymentMethod || 'Cash',
        source: 'manual',
        isBusinessTransaction: true,
        isManual: true,
        category: 'general',
        items: saleData.items || [],
        isMultiItem: saleData.isMultiItem || false,
        linkedInventoryId: saleData.linkedInventoryId || null,
        linkedInventoryName: saleData.linkedInventoryName || null,
        saleQuantity: saleData.saleQuantity || null,
        stockDeducted: !!saleData.linkedInventoryId || (saleData.items && saleData.items.length > 0),
        isSplitPayment: saleData.isSplitPayment || false,
        splitPayments: saleData.splitPayments || null,
        splitTotal: saleData.splitTotal || null,
        paymentBreakdown: saleData.paymentBreakdown || null,
        saleUnitPrice: saleData.saleUnitPrice || null,
        discount: saleData.discount || null,
        subtotal: saleData.subtotal || null


      };

      console.log('💵 Adding manual sale:', newTransaction);

      if (newTransaction.items && newTransaction.items.length > 0) {
        console.log(`📦 Sale contains ${newTransaction.items.length} items:`,
          newTransaction.items.map(item => `${item.name} (${item.quantity})`).join(', ')
        );
      }

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

  const loadCreditStats = async () => {
    const stats = await CreditStorage.getStats();
    setCreditStats(stats);
  };

  const loadProfitStats = async () => {
    // 1. Get base stats from standard Sales
    const stats = await ProfitReportStorage.getTodaysProfitStats();

    // 2. Calculate Credit Profit for Today (The Missing Link)
    const allTxns = await TransactionStorage.loadTransactions();
    const todayStr = new Date().toISOString().split('T')[0];

    const todayCreditProfit = allTxns
      .filter(t => {
        // Check if transaction is today AND is a credit payment
        const tDate = (t.date || t.timestamp || '').split('T')[0];
        return tDate === todayStr &&
          (t.paymentMethod === 'credit_payment' ||
            t.paymentMethod === 'credit_cleared' ||
            t.isCreditPayment === true);
      })
      .reduce((sum, t) => sum + (Number(t.profit) || 0), 0);

    // 3. Combine Sales Profit + Credit Profit
    setProfitStats({
      ...stats,
      todayProfit: (stats.todayProfit || 0) + todayCreditProfit
    });
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
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Gradient Header with Decorative Elements */}
      <View style={styles.gradientHeader}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>TRACK BIZ</Text>
            <Text style={styles.headerDate}>{todayDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Menu size={20} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Revenue Card - Enhanced */}
      <TouchableOpacity
        style={styles.revenueCard}
        activeOpacity={0.95}
        onPress={() => navigation.navigate('Analytics')}
      >
        <View style={styles.revenueHeader}>
          <View>
            <Text style={styles.revenueLabel}>Today's Income</Text>
            <Text style={styles.revenueSublabel}>Money received only</Text>
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

        <View style={styles.revenueAmountContainer}>
          {isRevenueVisible ? (
            <Text style={styles.revenueAmount}>
              Ksh {todayRevenue.toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.revenueAmount}>Ksh ••••••</Text>
          )}
        </View>

        {/* Breakdown: Money In, Money Out, Net Balance */}
        {todayMoneyOut > 0 && isRevenueVisible && (
          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Money In</Text>
              <Text style={[styles.breakdownValue, { color: Colors.success }]}>
                +Ksh {todayRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Money Out</Text>
              <Text style={[styles.breakdownValue, { color: Colors.error }]}>
                -Ksh {todayMoneyOut.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabelBold}>Net Balance</Text>
              <Text style={[
                styles.breakdownValueBold,
                { color: (todayRevenue - todayMoneyOut) >= 0 ? Colors.success : Colors.error }
              ]}>
                Ksh {(todayRevenue - todayMoneyOut).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

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
        {/* Metrics Grid - Enhanced */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('ExpenseManager')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Receipt size={20} color="#DC2626" />
            </View>
            <Text style={styles.metricLabel}>Expenses & Bills</Text>
            <Text style={styles.metricValue}>
              Ksh {expenseStats.today.toLocaleString()}
            </Text>
            {expenseStats.count > 0 && (
              <Text style={styles.subMetric}>
                {expenseStats.count} expense{expenseStats.count !== 1 ? 's' : ''} today
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('BusinessReminders')}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: Colors.warning + '15' }]}>
              <Bell size={18} color={Colors.warning} />
            </View>
            <Text style={styles.metricLabel}>Reminders</Text>
            <Text style={styles.metricValue}>{reminderStats.active}</Text>
            {reminderStats.today > 0 && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>{reminderStats.today} today</Text>
              </View>
            )}
            {reminderStats.overdue > 0 && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>{reminderStats.overdue} overdue</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('ProfitMarginReport')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <TrendingUp size={20} color="#065F46" />
            </View>
            <Text style={styles.metricLabel}>Profit / Sales</Text>
            <Text style={styles.metricValue}>
              Ksh {profitStats.todayProfit.toLocaleString()}
            </Text>
            <Text style={styles.subMetric}>
              Margin: {profitStats.margin}% • {profitStats.itemsSold} sold
            </Text>
            {profitStats.bestSeller && (
              <Text style={styles.subMetric}>
                🏆 {profitStats.bestSeller.name}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('CreditManager')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <AlertTriangle size={20} color="#F59E0B" />
            </View>
            <Text style={styles.metricLabel}>Credit / Deni</Text>
            <Text style={styles.metricValue}>
              Ksh {creditStats.outstanding.toLocaleString()}
            </Text>
            <Text style={styles.subMetric}>
              {creditStats.owingCustomers} customer(s) owing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons - IMPROVED */}
        <View style={styles.actionCardsRow}>
          {/* SMS Scan Button */}
          <TouchableOpacity
            style={[
              styles.scanButton,
              !smsScanEnabled && styles.scanButtonDisabled,
              isScanning && styles.scanButtonDisabled
            ]}
            onPress={handleScanSMS}
            disabled={!smsScanEnabled || isScanning}
            activeOpacity={0.8}
          >
            <View style={[
              styles.scanButtonIconContainer,
              !smsScanEnabled && styles.scanButtonIconContainerDisabled
            ]}>
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : !smsScanEnabled ? (
                <Zap size={18} color="rgba(255, 255, 255, 0.5)" /> // Dimmed icon when disabled
              ) : (
                <Zap size={18} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.scanButtonTitle}>
              {!smsScanEnabled ? 'SMS Scan (Off)' : (isScanning ? 'Scanning...' : 'Scan SMS')}
            </Text>
            <Text style={styles.scanButtonSubtitle}>
              {!smsScanEnabled
                ? 'Feature disabled in Settings'
                : isScanning
                  ? 'Please wait'
                  : `${transactions.filter(t => t.source === 'sms_scan').length} messages found`
              }
            </Text>
          </TouchableOpacity>


          {/* Cash Sales Button */}
          <TouchableOpacity
            style={styles.cashButton}
            onPress={() => setShowAddSaleDialog(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cashButtonHeader}>
              <View style={styles.cashButtonIconContainer}>
                <Wallet size={18} color="#FFFFFF" />
              </View>
              <Plus size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.cashButtonTitle}>Cash Sale</Text>
            <Text style={styles.cashButtonSubtitle}>Record manually</Text>
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
              <View style={styles.emptyStateIcon}>
                <Activity size={28} color={Colors.textLight} />
              </View>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Scan SMS or add manual sales to get started
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {businessTransactions.slice(0, 10).map((transaction, index) => {
                const hasMatch = transaction.inventoryMatch &&
                  typeof transaction.inventoryMatch === 'object' &&
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
        onAddSale={handleNewManualSale}
        navigation={navigation}
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
    backgroundColor: '#4F46E5',
    paddingTop: Spacing.xl - 15,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 50,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.surface,
    marginBottom: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
  },
  revenueCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: -40,
    ...Shadows.lg,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.1)',
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eyeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  revenueAmountContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1.5,
  },
  revenueSublabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  revenueBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownLabelBold: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  breakdownValueBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: 12,
  },
  metricCard: {
    width: (width - Spacing.md * 3) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subMetric: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actionCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 12,
    marginBottom: Spacing.md,
  },

  todayBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: '600',
  },
  // SCAN BUTTON - NEW GRADIENT STYLE
  scanButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 16,
    ...Shadows.md,
    elevation: 6,
  },
  scanButtonDisabled: {
    opacity: 0.8,
  },
  scanButtonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  scanButtonDisabled: {
    backgroundColor: '#5079c0ff', // Gray color for disabled state
    opacity: 0.7,
  },
  scanButtonIconContainerDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Dimmed background for disabled
  },
  // CASH BUTTON - NEW GRADIENT STYLE
  cashButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    ...Shadows.md,
    elevation: 6,
  },
  cashButtonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cashButtonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cashButtonSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
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
    fontSize: 17,
    fontWeight: '700',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '600',
    marginRight: 4,
  },
  viewAllArrow: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
}); export default HomeScreen;