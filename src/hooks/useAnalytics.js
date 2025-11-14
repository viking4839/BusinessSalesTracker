import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    todayRevenue: 0,
    yesterdayRevenue: 0,
    growthPercentage: 0,
    isPositive: true,
    totalTransactions: 0,
    businessTransactions: 0,
    averageTransaction: 0,
    topBank: null,
    peakHour: null,
    weeklyData: [],
    monthlyData: [],
  });

  const calculateAnalytics = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('transactions');
      const transactions = data ? JSON.parse(data) : [];

      const now = new Date();
      const todayStr = now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      // Calculate today's metrics
      let todayRevenue = 0;
      let yesterdayRevenue = 0;
      let totalToday = 0;
      let businessToday = 0;
      const bankCount = {};
      const hourlyCount = Array(24).fill(0);

      transactions.forEach(t => {
        const transactionDate = new Date(t.timestamp || t.date);
        const dateStr = transactionDate.toDateString();
        const amount = Math.abs(Number(t.amount) || 0);
        const hour = transactionDate.getHours();

        // Today's data
        if (dateStr === todayStr) {
          totalToday++;
          hourlyCount[hour]++;

          if (t.isBusinessTransaction && t.amount > 0) {
            businessToday++;
            todayRevenue += amount;
          }

          // Bank tracking
          const bank = t.bank || 'Unknown';
          bankCount[bank] = (bankCount[bank] || 0) + 1;
        }

        // Yesterday's data
        if (dateStr === yesterdayStr && t.isBusinessTransaction && t.amount > 0) {
          yesterdayRevenue += amount;
        }
      });

      // Calculate growth
      let growthPercentage = 0;
      let isPositive = true;
      if (yesterdayRevenue > 0) {
        growthPercentage = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        isPositive = growthPercentage >= 0;
      } else if (todayRevenue > 0) {
        growthPercentage = 100;
        isPositive = true;
      }

      // Find top bank
      let topBank = null;
      let maxCount = 0;
      Object.entries(bankCount).forEach(([bank, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topBank = bank;
        }
      });

      // Find peak hour
      const peakHourIndex = hourlyCount.indexOf(Math.max(...hourlyCount));
      const peakHour = peakHourIndex >= 0 ? `${peakHourIndex}:00` : null;

      // Calculate weekly data (last 7 days)
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();

        let dayRevenue = 0;
        transactions.forEach(t => {
          const tDate = new Date(t.timestamp || t.date);
          if (tDate.toDateString() === dateStr && t.isBusinessTransaction && t.amount > 0) {
            dayRevenue += Math.abs(Number(t.amount) || 0);
          }
        });

        weeklyData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: date,
          revenue: dayRevenue,
        });
      }

      // Calculate average transaction
      const averageTransaction = businessToday > 0 ? todayRevenue / businessToday : 0;

      setAnalytics({
        todayRevenue,
        yesterdayRevenue,
        growthPercentage: Math.abs(growthPercentage),
        isPositive,
        totalTransactions: totalToday,
        businessTransactions: businessToday,
        averageTransaction,
        topBank,
        peakHour,
        weeklyData,
        monthlyData: [], // Can be expanded for monthly view
      });

    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  }, []);

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  const refreshAnalytics = useCallback(() => {
    return calculateAnalytics();
  }, [calculateAnalytics]);

  return { analytics, refreshAnalytics };
};