import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import TransactionStorage from '../utils/TransactionStorage';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Calendar } from 'lucide-react-native';
import BarChart from '../components/BarChart';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    businessRevenue: 0,
    transactionCount: 0,
    businessCount: 0,
    averageTransaction: 0,
    topBank: 'N/A',
    topDay: 'N/A',
    growthRate: 0,
  });

  const [chartPeriod, setChartPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [maxChartValue, setMaxChartValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Refresh when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadAnalytics();
    }, [])
  );

  // Regenerate chart when period changes
  useEffect(() => {
    if (chartPeriod) {
      loadAnalytics();
    }
  }, [chartPeriod]);

  const loadAnalytics = async () => {
    try {
      console.log('📊 Loading analytics data...');

      // Load transactions from TransactionStorage (same as HomeScreen)
      const transactions = await TransactionStorage.loadTransactions();
      console.log(`✅ Loaded ${transactions.length} transactions for analytics`);

      if (transactions.length === 0) {
        generateChartData([]);
        return;
      }

      // Calculate total revenue (all incoming transactions)
      const totalRevenue = transactions
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      // Calculate business revenue (only business transactions with positive amounts)
      const businessTransactions = transactions.filter(t => Number(t.amount) > 0);
      const businessRevenue = businessTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      const transactionCount = transactions.length;
      const businessCount = businessTransactions.length;

      // Average transaction
      const averageTransaction = businessCount > 0 ? businessRevenue / businessCount : 0;

      // Top bank
      const bankCounts = {};
      transactions.forEach(t => {
        const bank = t.bank || 'Unknown';
        bankCounts[bank] = (bankCounts[bank] || 0) + 1;
      });
      const topBank = Object.keys(bankCounts).length > 0
        ? Object.keys(bankCounts).reduce((a, b) => bankCounts[a] > bankCounts[b] ? a : b)
        : 'N/A';

      // Top day
      const dayCounts = {};
      transactions.forEach(t => {
        const date = new Date(t.timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const topDay = Object.keys(dayCounts).length > 0
        ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b)
        : 'N/A';

      // Calculate growth rate (last 7 days vs previous 7 days)
      const now = new Date();

      const last7Days = transactions.filter(t => {
        const date = new Date(t.timestamp);
        const diffTime = now - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7 && Number(t.amount) > 0;
      });

      const previous7Days = transactions.filter(t => {
        const date = new Date(t.timestamp);
        const diffTime = now - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
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
        topBank,
        topDay,
        growthRate,
      });

      console.log(`📈 Analytics calculated: Revenue=${businessRevenue}, Growth=${growthRate.toFixed(1)}%`);

      // Generate chart data
      generateChartData(transactions);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    }
  };

  const generateChartData = (transactions) => {
    const now = new Date();
    let chartData = [];

    if (chartPeriod === 'day') {
      // Last 24 hours by hour
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i, 0, 0, 0);
        const nextHour = new Date(hour);
        nextHour.setHours(hour.getHours() + 1);

        const revenue = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp);
            return tDate >= hour && tDate < nextHour && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

        const hourLabel = hour.getHours();
        chartData.push({
          label: hourLabel === 0 ? '12a' : hourLabel < 12 ? `${hourLabel}a` : hourLabel === 12 ? '12p' : `${hourLabel - 12}p`,
          value: revenue,
        });
      }
    } else if (chartPeriod === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);

        const revenue = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp);
            return tDate >= day && tDate < nextDay && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

        const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short' });
        chartData.push({ label: dayLabel, value: revenue });
      }
    } else if (chartPeriod === 'month') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        weekEnd.setHours(23, 59, 59, 999);

        const revenue = transactions
          .filter(t => {
            const tDate = new Date(t.timestamp);
            return tDate >= weekStart && tDate <= weekEnd && Number(t.amount) > 0;
          })
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

        chartData.push({ label: `W${4 - i}`, value: revenue });
      }
    }

    const maxValue = Math.max(...chartData.map(d => d.value), 100);
    setChartData(chartData);
    setMaxChartValue(maxValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.statHeader}>
        <Icon size={20} color={color} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const businessRate = stats.transactionCount > 0
    ? ((stats.businessCount / stats.transactionCount) * 100).toFixed(1)
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Themed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Growth Card */}
        <View style={styles.growthCard}>
          <View style={styles.growthHeader}>
            {stats.growthRate >= 0 ? (
              <TrendingUp size={24} color={Colors.success} />
            ) : (
              <TrendingDown size={24} color={Colors.error} />
            )}
            <Text style={styles.growthLabel}>7-Day Growth</Text>
          </View>
          <Text style={[styles.growthValue, { color: stats.growthRate >= 0 ? Colors.success : Colors.error }]}>
            {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
          </Text>
          <Text style={styles.growthSubtitle}>
            Compared to previous week
          </Text>
        </View>

        {/* Revenue Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Business income only</Text>
            </View>
          </View>

          {/* Period Toggle */}
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[styles.periodButton, chartPeriod === 'day' && styles.periodButtonActive]}
              onPress={() => setChartPeriod('day')}
            >
              <Text style={[styles.periodButtonText, chartPeriod === 'day' && styles.periodButtonTextActive]}>
                Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, chartPeriod === 'week' && styles.periodButtonActive]}
              onPress={() => setChartPeriod('week')}
            >
              <Text style={[styles.periodButtonText, chartPeriod === 'week' && styles.periodButtonTextActive]}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, chartPeriod === 'month' && styles.periodButtonActive]}
              onPress={() => setChartPeriod('month')}
            >
              <Text style={[styles.periodButtonText, chartPeriod === 'month' && styles.periodButtonTextActive]}>
                Month
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bar Chart */}
          {chartData.length > 0 ? (
            <BarChart data={chartData} maxValue={maxChartValue} period={chartPeriod} />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data available</Text>
              <Text style={styles.emptyChartSubtext}>Scan SMS or add transactions to see charts</Text>
            </View>
          )}
        </View>

        {/* Revenue Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={`Ksh ${stats.totalRevenue.toLocaleString()}`}
            color={Colors.primary}
            subtitle="All incoming transactions"
          />
          <StatCard
            icon={TrendingUp}
            label="Business Revenue"
            value={`Ksh ${stats.businessRevenue.toLocaleString()}`}
            color={Colors.success}
            subtitle={`${businessRate}% of total transactions`}
          />
          <StatCard
            icon={Activity}
            label="Average Transaction"
            value={`Ksh ${Math.round(stats.averageTransaction).toLocaleString()}`}
            color="#8b5cf6"
            subtitle="Per business transaction"
          />
        </View>

        {/* Transaction Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Insights</Text>
          <StatCard
            icon={Activity}
            label="Total Transactions"
            value={stats.transactionCount}
            color="#06b6d4"
            subtitle={`${stats.businessCount} business transactions`}
          />
          <StatCard
            icon={Calendar}
            label="Most Active Bank"
            value={stats.topBank}
            color="#f59e0b"
            subtitle="Highest transaction volume"
          />
          <StatCard
            icon={Calendar}
            label="Busiest Day"
            value={stats.topDay}
            color="#ec4899"
            subtitle="Most transactions recorded"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.surface,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  growthCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    alignItems: 'center',
  },
  growthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  growthLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  growthValue: {
    ...Typography.title,
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 4
  },
  growthSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary
  },
  chartCard: {
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  chartTitle: {
    ...Typography.subheading,
    color: Colors.text,
    fontWeight: '700'
  },
  chartSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
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
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyChartSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  section: {
    padding: Spacing.md
  },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  statCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  statValue: {
    ...Typography.title,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4
  },
  statSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary
  },
});

export default AnalyticsScreen;