import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import TransactionStorage from '../utils/TransactionStorage';
import CreditStorage from '../utils/CreditStorage';
import InventoryStorage from '../utils/InventoryStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Calendar,
  Package,
  Users,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent,
  BarChart3,
  PieChart,
  Target,
  Award,
  Zap
} from 'lucide-react-native';
import BarChart from '../components/BarChart';
import { useFocusEffect } from '@react-navigation/native';
import DateRangePicker from '../components/DateRangePicker';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  // Stats State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    businessRevenue: 0,
    transactionCount: 0,
    businessCount: 0,
    averageTransaction: 0,
    topDay: 'N/A',
    growthRate: 0,
  });

  // Credit Stats
  const [creditStats, setCreditStats] = useState({
    totalPending: 0,
    pendingCount: 0,
    clearedToday: 0,
    clearedAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    topDebtor: null,
    avgCreditDays: 0,
  });

  // Inventory Stats
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockValue: 0,
    topSellingItems: [],
    slowMovingItems: [],
  });

  // Profit Stats
  const [profitStats, setProfitStats] = useState({
    todayProfit: 0,
    weeklyProfit: 0,
    monthlyProfit: 0,
    avgDailyProfit: 0,
    profitMargin: 0,
    bestDay: null,
  });

  // Chart Data
  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [maxChartValue, setMaxChartValue] = useState(0);
  const [chartType, setChartType] = useState('revenue'); // revenue, profit, transactions

  // Date Filter State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dateMode, setDateMode] = useState('all'); // 'all', 'single', 'range'

  useFocusEffect(
    React.useCallback(() => {
      loadAllAnalytics();
    }, [])
  );

  useEffect(() => {
    if (chartPeriod) {
      loadAllAnalytics();
    }
  }, [chartPeriod, chartType]);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading comprehensive analytics...');

      await Promise.all([
        loadTransactionStats(),
        loadCreditStats(),
        loadInventoryStats(),
        loadProfitStats(),
      ]);

      console.log('✅ All analytics loaded');
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionStats = async () => {
    try {
      const transactions = await TransactionStorage.loadTransactions();

      if (transactions.length === 0) {
        generateChartData([]);
        return;
      }

      const now = new Date();

      // Calculate revenue
      const totalRevenue = transactions
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      const businessTransactions = transactions.filter(t => Number(t.amount) > 0);
      const businessRevenue = businessTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      const transactionCount = transactions.length;
      const businessCount = businessTransactions.length;
      const averageTransaction = businessCount > 0 ? businessRevenue / businessCount : 0;

      // Top day calculation
      const dayCounts = {};
      const dayRevenue = {};
      transactions.forEach(t => {
        const date = new Date(t.timestamp || t.date || t.createdAt);
        if (!isNaN(date.getTime())) {
          const day = date.toLocaleDateString('en-US', { weekday: 'long' });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
          dayRevenue[day] = (dayRevenue[day] || 0) + Math.abs(Number(t.amount) || 0);
        }
      });
      const topDay = Object.keys(dayRevenue).length > 0
        ? Object.keys(dayRevenue).reduce((a, b) => dayRevenue[a] > dayRevenue[b] ? a : b)
        : 'N/A';

      // Growth rate (last 7 days vs previous 7 days)
      const last7Days = transactions.filter(t => {
        const date = new Date(t.timestamp || t.date || t.createdAt);
        if (isNaN(date.getTime())) return false;
        const diffDays = (now - date) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7 && Number(t.amount) > 0;
      });

      const previous7Days = transactions.filter(t => {
        const date = new Date(t.timestamp || t.date || t.createdAt);
        if (isNaN(date.getTime())) return false;
        const diffDays = (now - date) / (1000 * 60 * 60 * 24);
        return diffDays > 7 && diffDays <= 14 && Number(t.amount) > 0;
      });

      const last7Total = last7Days.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      const prev7Total = previous7Days.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      const growthRate = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : (last7Total > 0 ? 100 : 0);

      setStats({
        totalRevenue,
        businessRevenue,
        transactionCount,
        businessCount,
        averageTransaction,
        topDay,
        growthRate,
      });

      generateChartData(transactions);
    } catch (error) {
      console.error('Error loading transaction stats:', error);
    }
  };

  const loadCreditStats = async () => {
    try {
      const credits = await CreditStorage.loadCredits();
      const transactions = await TransactionStorage.loadTransactions();
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      // Pending credits
      const pendingCredits = credits.filter(c => c.status === 'pending');
      const totalPending = pendingCredits.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);
      const pendingCount = pendingCredits.length;

      // Overdue credits (more than 7 days)
      const overdueCredits = pendingCredits.filter(c => {
        const createdDate = new Date(c.dateCreated);
        const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
        return daysDiff > 7;
      });
      const overdueCount = overdueCredits.length;
      const overdueAmount = overdueCredits.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);

      // Credits cleared today
      const creditTransactionsToday = transactions.filter(t => {
        try {
          const txDate = new Date(t.date || t.createdAt);
          if (isNaN(txDate.getTime())) return false;
          const txDateString = txDate.toISOString().split('T')[0];
          return txDateString === todayString &&
            (t.paymentMethod === 'credit_cleared' || t.paymentMethod === 'credit_payment');
        } catch (e) {
          return false;
        }
      });
      const clearedToday = creditTransactionsToday.length;
      const clearedAmount = creditTransactionsToday.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Top debtor
      const customerBalances = {};
      pendingCredits.forEach(c => {
        customerBalances[c.customerName] = (customerBalances[c.customerName] || 0) + (c.remainingBalance || 0);
      });
      const topDebtor = Object.keys(customerBalances).length > 0
        ? Object.entries(customerBalances).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      // Average credit days
      const avgCreditDays = pendingCredits.length > 0
        ? pendingCredits.reduce((sum, c) => {
          const days = (now - new Date(c.dateCreated)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / pendingCredits.length
        : 0;

      setCreditStats({
        totalPending,
        pendingCount,
        clearedToday,
        clearedAmount,
        overdueCount,
        overdueAmount,
        topDebtor: topDebtor ? { name: topDebtor[0], amount: topDebtor[1] } : null,
        avgCreditDays: Math.round(avgCreditDays),
      });
    } catch (error) {
      console.error('Error loading credit stats:', error);
    }
  };

  const loadInventoryStats = async () => {
    try {
      const inventory = await InventoryStorage.loadInventory();
      const stats = await InventoryStorage.getInventoryStats();

      const totalItems = inventory.length;
      const lowStockItems = inventory.filter(i => i.quantity > 0 && i.quantity <= (i.lowStockThreshold || 5));
      const outOfStockItems = inventory.filter(i => i.quantity <= 0);
      const totalStockValue = inventory.reduce((sum, i) => sum + (i.quantity * (i.unitPrice || 0)), 0);

      // Top selling (by quantity sold - from transactions)
      const transactions = await TransactionStorage.loadTransactions();
      const itemSales = {};
      transactions.forEach(t => {
        if (t.itemName && t.quantity) {
          itemSales[t.itemName] = (itemSales[t.itemName] || 0) + (t.quantity || 1);
        }
      });
      const topSellingItems = Object.entries(itemSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, sold]) => ({ name, sold }));

      // Slow moving items (items with high stock but low sales)
      const slowMovingItems = inventory
        .filter(i => i.quantity > 10)
        .filter(i => !itemSales[i.name] || itemSales[i.name] < 3)
        .slice(0, 5);

      setInventoryStats({
        totalItems,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalStockValue,
        topSellingItems,
        slowMovingItems,
        ...stats,
      });
    } catch (error) {
      console.error('Error loading inventory stats:', error);
    }
  };

  const loadProfitStats = async () => {
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      // Today's profit
      const todayReport = await ProfitReportStorage.loadReport(todayString);
      const todayProfit = todayReport?.totalProfit || 0;

      // Weekly reports
      const weeklyReports = await ProfitReportStorage.getWeeklyReports();
      const weeklyProfit = Object.values(weeklyReports || {})
        .reduce((sum, r) => sum + (r.totalProfit || 0), 0);

      // Monthly reports
      const monthlyReports = await ProfitReportStorage.getMonthlyReports();
      const monthlyProfit = Object.values(monthlyReports || {})
        .reduce((sum, r) => sum + (r.totalProfit || 0), 0);

      // Average daily profit
      const dailyProfits = Object.values(weeklyReports || {}).map(r => r.totalProfit || 0);
      const avgDailyProfit = dailyProfits.length > 0
        ? dailyProfits.reduce((a, b) => a + b, 0) / dailyProfits.length
        : 0;

      // Best day
      const bestDayEntry = Object.entries(weeklyReports || {})
        .sort((a, b) => (b[1].totalProfit || 0) - (a[1].totalProfit || 0))[0];
      const bestDay = bestDayEntry ? {
        date: bestDayEntry[0],
        profit: bestDayEntry[1].totalProfit || 0
      } : null;

      // Profit margin
      const totalSales = todayReport?.totalSales || 0;
      const profitMargin = totalSales > 0 ? (todayProfit / totalSales) * 100 : 0;

      setProfitStats({
        todayProfit,
        weeklyProfit,
        monthlyProfit,
        avgDailyProfit,
        profitMargin,
        bestDay,
      });
    } catch (error) {
      console.error('Error loading profit stats:', error);
    }
  };

  const generateChartData = (transactions) => {
    const now = new Date();
    let data = [];

    const getValueForTransaction = (t) => {
      switch (chartType) {
        case 'profit':
          return t.profit || 0;
        case 'transactions':
          return 1;
        default:
          return Math.abs(Number(t.amount) || 0);
      }
    };

    if (chartPeriod === 'day') {
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i, 0, 0, 0);
        const nextHour = new Date(hour);
        nextHour.setHours(hour.getHours() + 1);

        const value = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp || t.date || t.createdAt);
            return tDate >= hour && tDate < nextHour && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + getValueForTransaction(t), 0);

        const hourLabel = hour.getHours();
        data.push({
          label: hourLabel === 0 ? '12a' : hourLabel < 12 ? `${hourLabel}a` : hourLabel === 12 ? '12p' : `${hourLabel - 12}p`,
          value,
        });
      }
    } else if (chartPeriod === 'week') {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);

        const value = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp || t.date || t.createdAt);
            return tDate >= day && tDate < nextDay && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + getValueForTransaction(t), 0);

        data.push({ label: day.toLocaleDateString('en-US', { weekday: 'short' }), value });
      }
    } else if (chartPeriod === 'month') {
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        weekEnd.setHours(23, 59, 59, 999);

        const value = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp || t.date || t.createdAt);
            return tDate >= weekStart && tDate <= weekEnd && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + getValueForTransaction(t), 0);

        data.push({ label: `W${4 - i}`, value });
      }
    }

    const maxValue = Math.max(...data.map(d => d.value), 100);
    setChartData(data);
    setMaxChartValue(maxValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => `Ksh ${(amount || 0).toLocaleString()}`;

  // Quick Stats Card Component
  const QuickStatCard = ({ icon: Icon, label, value, subValue, color, trend }) => (
    <View style={[styles.quickStatCard, { borderTopColor: color }]}>
      <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
      {subValue && <Text style={styles.quickStatSubValue}>{subValue}</Text>}
      {trend !== undefined && (
        <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
          {trend >= 0 ? <TrendingUp size={12} color={Colors.success} /> : <TrendingDown size={12} color={Colors.error} />}
          <Text style={[styles.trendText, { color: trend >= 0 ? Colors.success : Colors.error }]}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );

  // Section Navigation
  const renderSectionNav = () => (
    <View style={styles.sectionNav}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'sales', label: 'Sales', icon: ShoppingBag },
          { key: 'credits', label: 'Credits', icon: CreditCard },
          { key: 'inventory', label: 'Inventory', icon: Package },
          { key: 'insights', label: 'Insights', icon: Zap },
        ].map(section => (
          <TouchableOpacity
            key={section.key}
            style={[styles.sectionButton, activeSection === section.key && styles.sectionButtonActive]}
            onPress={() => setActiveSection(section.key)}
          >
            <section.icon size={16} color={activeSection === section.key ? Colors.surface : Colors.textSecondary} />
            <Text style={[styles.sectionButtonText, activeSection === section.key && styles.sectionButtonTextActive]}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Date Filter
  const renderDateFilter = () => {
    const getDateDisplayText = () => {
      if (dateMode === 'all') {
        return 'All Time';
      } else if (dateMode === 'single') {
        return new Date(selectedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } else if (dateMode === 'range') {
        return `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      return 'Select Date';
    };

    return (
      <View style={styles.dateFilterContainer}>
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={[styles.dateFilterButton, dateMode === 'all' && styles.dateFilterButtonActive]}
            onPress={() => setDateMode('all')}
          >
            <Text style={[styles.dateFilterText, dateMode === 'all' && styles.dateFilterTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateFilterButton, dateMode === 'single' && styles.dateFilterButtonActive]}
            onPress={() => {
              setDateMode('single');
              setShowDatePicker(true);
            }}
          >
            <Calendar size={14} color={dateMode === 'single' ? Colors.surface : Colors.textSecondary} />
            <Text style={[styles.dateFilterText, dateMode === 'single' && styles.dateFilterTextActive]}>
              Date
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateFilterButton, dateMode === 'range' && styles.dateFilterButtonActive]}
            onPress={() => {
              setDateMode('range');
              setShowDatePicker(true);
            }}
          >
            <Calendar size={14} color={dateMode === 'range' ? Colors.surface : Colors.textSecondary} />
            <Text style={[styles.dateFilterText, dateMode === 'range' && styles.dateFilterTextActive]}>
              Range
            </Text>
          </TouchableOpacity>
        </View>

        {dateMode !== 'all' && (
          <TouchableOpacity
            style={styles.dateDisplayBadge}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={14} color={Colors.primary} />
            <Text style={styles.dateDisplayText}>{getDateDisplayText()}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Overview Section
  const renderOverview = () => (
    <View style={styles.section}>
      {/* Hero Growth Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Weekly Growth</Text>
          <View style={styles.heroValueRow}>
            {stats.growthRate >= 0 ? (
              <TrendingUp size={32} color={Colors.success} />
            ) : (
              <TrendingDown size={32} color={Colors.error} />
            )}
            <Text style={[styles.heroValue, { color: stats.growthRate >= 0 ? Colors.success : Colors.error }]}>
              {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.heroSubtext}>Compared to previous week</Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{formatCurrency(stats.businessRevenue)}</Text>
            <Text style={styles.heroStatLabel}>Total Revenue</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{stats.transactionCount}</Text>
            <Text style={styles.heroStatLabel}>Transactions</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <Text style={styles.sectionTitle}>Today's Snapshot</Text>
      <View style={styles.quickStatsGrid}>
        <QuickStatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(profitStats.todayProfit + (creditStats.clearedAmount || 0))}
          color={Colors.success}
        />
        <QuickStatCard
          icon={Percent}
          label="Profit Margin"
          value={`${profitStats.profitMargin.toFixed(1)}%`}
          color="#8B5CF6"
        />
        <QuickStatCard
          icon={CreditCard}
          label="Credits Collected"
          value={formatCurrency(creditStats.clearedAmount)}
          subValue={`${creditStats.clearedToday} cleared`}
          color="#2563EB"
        />
        <QuickStatCard
          icon={AlertTriangle}
          label="Pending Credits"
          value={formatCurrency(creditStats.totalPending)}
          subValue={`${creditStats.pendingCount} customers`}
          color="#F59E0B"
        />
      </View>

      {/* Chart Section */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Performance Trend</Text>
          <View style={styles.chartTypeToggle}>
            {['revenue', 'profit', 'transactions'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chartTypeButton, chartType === type && styles.chartTypeButtonActive]}
                onPress={() => setChartType(type)}
              >
                <Text style={[styles.chartTypeText, chartType === type && styles.chartTypeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.periodToggle}>
          {['day', 'week', 'month'].map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, chartPeriod === period && styles.periodButtonActive]}
              onPress={() => setChartPeriod(period)}
            >
              <Text style={[styles.periodButtonText, chartPeriod === period && styles.periodButtonTextActive]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {chartData.length > 0 ? (
          <BarChart data={chartData} maxValue={maxChartValue} period={chartPeriod} />
        ) : (
          <View style={styles.emptyChart}>
            <BarChart3 size={48} color={Colors.textLight} />
            <Text style={styles.emptyChartText}>No data available</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Sales Section
  const renderSales = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sales Performance</Text>

      {/* Sales Summary Cards */}
      <View style={styles.summaryCardsRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
          <ShoppingBag size={24} color={Colors.success} />
          <Text style={styles.summaryCardValue}>{formatCurrency(stats.businessRevenue)}</Text>
          <Text style={styles.summaryCardLabel}>Total Sales</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]}>
          <Activity size={24} color="#2563EB" />
          <Text style={styles.summaryCardValue}>{formatCurrency(stats.averageTransaction)}</Text>
          <Text style={styles.summaryCardLabel}>Avg Transaction</Text>
        </View>
      </View>

      {/* Best Performing Day */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: '#FEF3C7' }]}>
            <Award size={20} color="#F59E0B" />
          </View>
          <Text style={styles.insightTitle}>Best Performing Day</Text>
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightValue}>{stats.topDay}</Text>
          <Text style={styles.insightSubtext}>Highest revenue day of the week</Text>
        </View>
      </View>

      {/* Top Selling Items */}
      {inventoryStats.topSellingItems?.length > 0 && (
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Top Selling Items</Text>
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>This Month</Text>
            </View>
          </View>
          {inventoryStats.topSellingItems.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.listRank}>
                <Text style={styles.listRankText}>{index + 1}</Text>
              </View>
              <Text style={styles.listItemName}>{item.name}</Text>
              <View style={styles.listItemValue}>
                <Text style={styles.listItemValueText}>{item.sold} sold</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Credits Section
  const renderCredits = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Credit Management</Text>

      {/* Credit Status Cards */}
      <View style={styles.creditStatusGrid}>
        <View style={[styles.creditStatusCard, { borderLeftColor: '#F59E0B' }]}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.creditStatusValue}>{creditStats.pendingCount}</Text>
          <Text style={styles.creditStatusLabel}>Pending</Text>
          <Text style={styles.creditStatusAmount}>{formatCurrency(creditStats.totalPending)}</Text>
        </View>
        <View style={[styles.creditStatusCard, { borderLeftColor: Colors.error }]}>
          <AlertTriangle size={20} color={Colors.error} />
          <Text style={styles.creditStatusValue}>{creditStats.overdueCount}</Text>
          <Text style={styles.creditStatusLabel}>Overdue</Text>
          <Text style={styles.creditStatusAmount}>{formatCurrency(creditStats.overdueAmount)}</Text>
        </View>
        <View style={[styles.creditStatusCard, { borderLeftColor: Colors.success }]}>
          <CheckCircle size={20} color={Colors.success} />
          <Text style={styles.creditStatusValue}>{creditStats.clearedToday}</Text>
          <Text style={styles.creditStatusLabel}>Cleared Today</Text>
          <Text style={styles.creditStatusAmount}>{formatCurrency(creditStats.clearedAmount)}</Text>
        </View>
      </View>

      {/* Credit Insights */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: '#EFF6FF' }]}>
            <Calendar size={20} color="#2563EB" />
          </View>
          <Text style={styles.insightTitle}>Average Credit Duration</Text>
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightValue}>{creditStats.avgCreditDays} days</Text>
          <Text style={styles.insightSubtext}>Average time credits remain unpaid</Text>
        </View>
      </View>

      {/* Top Debtor */}
      {creditStats.topDebtor && (
        <View style={[styles.insightCard, { borderLeftColor: Colors.error, borderLeftWidth: 4 }]}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: '#FEE2E2' }]}>
              <Users size={20} color={Colors.error} />
            </View>
            <Text style={styles.insightTitle}>Highest Outstanding</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightValue}>{creditStats.topDebtor.name}</Text>
            <Text style={[styles.insightSubtext, { color: Colors.error, fontWeight: '700' }]}>
              {formatCurrency(creditStats.topDebtor.amount)} pending
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // Inventory Section
  const renderInventory = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Inventory Status</Text>

      {/* Inventory Overview */}
      <View style={styles.inventoryOverview}>
        <View style={styles.inventoryStatLarge}>
          <Package size={32} color={Colors.primary} />
          <Text style={styles.inventoryStatValue}>{inventoryStats.totalItems}</Text>
          <Text style={styles.inventoryStatLabel}>Total Items</Text>
        </View>
        <View style={styles.inventoryStatSmall}>
          <View style={styles.inventoryStatRow}>
            <View style={[styles.inventoryDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.inventoryStatText}>
              {inventoryStats.totalItems - inventoryStats.lowStockCount - inventoryStats.outOfStockCount} In Stock
            </Text>
          </View>
          <View style={styles.inventoryStatRow}>
            <View style={[styles.inventoryDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.inventoryStatText}>{inventoryStats.lowStockCount} Low Stock</Text>
          </View>
          <View style={styles.inventoryStatRow}>
            <View style={[styles.inventoryDot, { backgroundColor: Colors.error }]} />
            <Text style={styles.inventoryStatText}>{inventoryStats.outOfStockCount} Out of Stock</Text>
          </View>
        </View>
      </View>

      {/* Stock Value */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: '#D1FAE5' }]}>
            <DollarSign size={20} color={Colors.success} />
          </View>
          <Text style={styles.insightTitle}>Total Stock Value</Text>
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightValue}>{formatCurrency(inventoryStats.totalStockValue)}</Text>
          <Text style={styles.insightSubtext}>Current retail value of inventory</Text>
        </View>
      </View>

      {/* Slow Moving Items Alert */}
      {inventoryStats.slowMovingItems?.length > 0 && (
        <View style={[styles.alertCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <View style={styles.alertHeader}>
            <AlertTriangle size={20} color="#F59E0B" />
            <Text style={styles.alertTitle}>Slow Moving Items</Text>
          </View>
          <Text style={styles.alertText}>
            {inventoryStats.slowMovingItems.length} items with high stock but low sales
          </Text>
          <View style={styles.alertItems}>
            {inventoryStats.slowMovingItems.slice(0, 3).map((item, idx) => (
              <View key={idx} style={styles.alertItem}>
                <View style={styles.alertDot} />
                <Text style={styles.alertItemText}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // Insights Section
  const renderInsights = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Business Insights</Text>

      {/* Profit Summary */}
      <View style={styles.profitSummaryCard}>
        <Text style={styles.profitSummaryTitle}>Profit Summary</Text>
        <View style={styles.profitGrid}>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Today</Text>
            <Text style={styles.profitValue}>{formatCurrency(profitStats.todayProfit)}</Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>This Week</Text>
            <Text style={styles.profitValue}>{formatCurrency(profitStats.weeklyProfit)}</Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>This Month</Text>
            <Text style={styles.profitValue}>{formatCurrency(profitStats.monthlyProfit)}</Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Daily Average</Text>
            <Text style={styles.profitValue}>{formatCurrency(profitStats.avgDailyProfit)}</Text>
          </View>
        </View>
      </View>

      {/* Best Day */}
      {profitStats.bestDay && (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: '#FEF3C7' }]}>
              <Award size={20} color="#F59E0B" />
            </View>
            <Text style={styles.insightTitle}>Best Day This Week</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightValue}>
              {new Date(profitStats.bestDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={[styles.insightSubtext, { color: Colors.success, fontWeight: '700' }]}>
              Profit: {formatCurrency(profitStats.bestDay.profit)}
            </Text>
          </View>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.recommendationsCard}>
        <View style={styles.recommendationsHeader}>
          <Zap size={20} color={Colors.primary} />
          <Text style={styles.recommendationsTitle}>Quick Tips</Text>
        </View>
        <View style={styles.recommendationsList}>
          {creditStats.overdueCount > 0 && (
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.recommendationText}>
                Follow up on {creditStats.overdueCount} overdue credits ({formatCurrency(creditStats.overdueAmount)})
              </Text>
            </View>
          )}
          {inventoryStats.lowStockCount > 0 && (
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.recommendationText}>
                Restock {inventoryStats.lowStockCount} low stock items
              </Text>
            </View>
          )}
          {stats.topDay !== 'N/A' && (
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.recommendationText}>
                {stats.topDay} is your best day - consider promotions on slower days
              </Text>
            </View>
          )}
          {profitStats.profitMargin < 20 && (
            <View style={styles.recommendationItem}>
              <View style={[styles.recommendationDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.recommendationText}>
                Profit margin is low ({profitStats.profitMargin.toFixed(1)}%) - review pricing strategy
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ADD handler functions for date selection
  const handleSelectSingleDate = (date) => {
    setSelectedDate(date);
    setDateMode('single');
    setShowDatePicker(false);
    loadAllAnalytics();
  };

  const handleSelectDateRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setDateMode('range');
    setShowDatePicker(false);
    loadAllAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Section Navigation */}
      {renderSectionNav()}

      {/* Date Filter */}
      {renderDateFilter()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'sales' && renderSales()}
        {activeSection === 'credits' && renderCredits()}
        {activeSection === 'inventory' && renderInventory()}
        {activeSection === 'insights' && renderInsights()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleSelectSingleDate}
        onSelectRange={handleSelectDateRange}
        selectedDate={selectedDate}
        startDate={startDate}
        endDate={endDate}
        mode={dateMode === 'range' ? 'range' : 'single'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.surface,
  },
  placeholder: {
    width: 40,
  },
  sectionNav: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.xs,
    backgroundColor: Colors.background,
    gap: 6,
  },
  sectionButtonActive: {
    backgroundColor: Colors.primary,
  },
  sectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionButtonTextActive: {
    color: Colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  heroSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase'
  },

  // Quick Stats Grid
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickStatCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderTopWidth: 4,
    ...Shadows.sm,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  quickStatSubValue: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Chart Card
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  chartTypeToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  chartTypeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  chartTypeButtonActive: {
    backgroundColor: Colors.primary,
  },
  chartTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chartTypeTextActive: {
    color: Colors.surface,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: Spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: Colors.surface,
  },
  emptyChart: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },

  // Summary Cards
  summaryCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Insight Cards
  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  insightContent: {},
  insightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  insightSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // List Cards
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  listBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  listRankText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  listItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  listItemValue: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listItemValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },

  // Credit Status
  creditStatusGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  creditStatusCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
    ...Shadows.sm,
  },
  creditStatusValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  creditStatusLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  creditStatusAmount: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },

  // Inventory Overview
  inventoryOverview: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  inventoryStatLarge: {
    alignItems: 'center',
    paddingRight: Spacing.lg,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  inventoryStatValue: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  inventoryStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  inventoryStatSmall: {
    flex: 1,
    paddingLeft: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  inventoryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inventoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inventoryStatText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },

  // Alert Card
  alertCard: {
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  alertText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  alertItems: {
    gap: Spacing.xs,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  alertItemText: {
    fontSize: 12,
    color: Colors.text,
  },

  // Profit Summary
  profitSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  profitSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  profitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  profitItem: {
    width: (width - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
  },
  profitLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },

  // Recommendations
  recommendationsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  recommendationsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  recommendationsList: {
    gap: Spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  recommendationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  // Date Filter
  dateFilterContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateFilterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
  },
  dateFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  dateFilterButtonActive: {
    backgroundColor: Colors.primary,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateFilterTextActive: {
    color: Colors.surface,
  },
  dateDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: 6,
  },
  dateDisplayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default AnalyticsScreen;