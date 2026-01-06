// utils/ProfitReportStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import TransactionStorage from './TransactionStorage';
import InventoryStorage from './InventoryStorage';

const PROFIT_REPORTS_KEY = '@profit_reports';
const DAILY_SALES_KEY = '@daily_sales_tracking';

export const ProfitReportStorage = {
  // Calculate and save today's profit report
  async generateTodaysReport() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Load all transactions and inventory
      const transactions = await TransactionStorage.loadTransactions();
      const inventory = await InventoryStorage.loadInventory();

      // Filter today's business transactions (incoming payments)
      const todaysTransactions = transactions.filter(t => {
        const txDate = new Date(t.timestamp);
        const isToday = txDate >= todayStart && txDate <= todayEnd && t.amount > 0;

        // ✅ NEW: Exclude SMS transactions with pending inventory matches
        if (t.source === 'sms_scan' && t.inventoryMatch) {
          const match = t.inventoryMatch;
          // Only include if user has confirmed the match
          if (!match.userConfirmed) {
            console.log(`⭐️ Skipping unconfirmed transaction: ${t.sender} - Ksh ${t.amount}`);
            return false;
          }
        }

        return isToday;
      });

      let totalSales = 0;
      let totalCost = 0;
      let totalProfit = 0;
      const itemsMap = {};

      // Calculate profit for each transaction
      todaysTransactions.forEach(transaction => {
        // If transaction has multiple items (cart)
        if (Array.isArray(transaction.items) && transaction.items.length > 0) {
          transaction.items.forEach(item => {
            let wholesaleCost = item.wholesalePrice || item.unitPrice || 0;
            let itemName = item.name || 'Unknown Item';
            let retailPrice = item.unitPrice || 0;
            let qty = item.quantity || 1;
            let itemId = item.id || null;

            const inventoryItem = inventory.find(inv => inv.id === itemId);
            if (inventoryItem) {
              wholesaleCost = inventoryItem.wholesalePrice || inventoryItem.unitPrice;
              itemName = inventoryItem.name;
              retailPrice = inventoryItem.unitPrice;
              itemId = inventoryItem.id;
            }

            const profit = (retailPrice - wholesaleCost) * qty;
            totalSales += retailPrice * qty;
            totalCost += wholesaleCost * qty;
            totalProfit += profit;

            const itemKey = itemId || itemName;
            if (!itemsMap[itemKey]) {
              itemsMap[itemKey] = {
                id: itemId,
                name: itemName,
                sold: 0,
                retailPrice: retailPrice,
                wholesalePrice: wholesaleCost,
                profit: 0
              };
            }
            itemsMap[itemKey].sold += qty;
            itemsMap[itemKey].profit += profit;
          });
        } else {
          // Single item transaction (legacy)
          const saleAmount = transaction.amount;
          totalSales += saleAmount;

          // Try to find matching inventory item
          let wholesaleCost = 0;
          let itemName = 'Unknown Item';
          let retailPrice = saleAmount;
          let qty = transaction.saleQuantity || 1;
          let itemId = transaction.linkedInventoryId || null;

          if (transaction.linkedInventoryId) {
            const inventoryItem = inventory.find(item => item.id === transaction.linkedInventoryId);
            if (inventoryItem) {
              wholesaleCost = inventoryItem.wholesalePrice || inventoryItem.unitPrice;
              itemName = inventoryItem.name;
              retailPrice = inventoryItem.unitPrice;
              itemId = inventoryItem.id;
            }
          } else {
            const matchingItem = inventory.find(item =>
              Math.abs(item.unitPrice - saleAmount) < 5
            );
            if (matchingItem) {
              wholesaleCost = matchingItem.wholesalePrice || matchingItem.unitPrice;
              itemName = matchingItem.name;
              retailPrice = matchingItem.unitPrice;
              itemId = matchingItem.id;
            } else {
              wholesaleCost = saleAmount * 0.7;
            }
          }

          const profit = (retailPrice - wholesaleCost) * qty;
          totalCost += wholesaleCost * qty;
          totalProfit += profit;

          // Use itemId as key if available, else fallback to itemName
          const itemKey = itemId || itemName;
          if (!itemsMap[itemKey]) {
            itemsMap[itemKey] = {
              id: itemId,
              name: itemName,
              sold: 0,
              retailPrice: retailPrice,
              wholesalePrice: wholesaleCost,
              profit: 0
            };
          }
          itemsMap[itemKey].sold += qty;
          itemsMap[itemKey].profit += profit;
        }
      });

      const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      const report = {
        date: today,
        totalSales,
        totalCost,
        totalProfit,
        margin: Number(margin.toFixed(1)),
        items: Object.values(itemsMap),
        transactionCount: todaysTransactions.length,
        bestSellingItem: Object.values(itemsMap).reduce((best, current) =>
          current.sold > (best?.sold || 0) ? current : best, null
        )
      };

      // Save the report
      await this.saveDailyReport(today, report);
      return report;

    } catch (error) {
      console.error('Error generating today report:', error);
      return null;
    }
  },

  // Save daily profit report
  async saveDailyReport(date, report) {
    try {
      const existingReports = await this.loadAllReports();
      const updatedReports = {
        ...existingReports,
        [date]: report
      };
      await AsyncStorage.setItem(PROFIT_REPORTS_KEY, JSON.stringify(updatedReports));
      return true;
    } catch (error) {
      console.error('Error saving profit report:', error);
      return false;
    }
  },

  // Load all profit reports
  async loadAllReports() {
    try {
      const reportsJson = await AsyncStorage.getItem(PROFIT_REPORTS_KEY);
      return reportsJson ? JSON.parse(reportsJson) : {};
    } catch (error) {
      console.error('Error loading profit reports:', error);
      return {};
    }
  },


  // Load report for specific date
  async loadReport(date) {
    try {
      // First try to load existing report
      const reports = await this.loadAllReports();
      const existingReport = reports[date];

      if (existingReport) {
        return existingReport;
      }

      // ✅ FIX: Only generate new report if date is TODAY
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        // Check if there are actually transactions today before generating
        const transactions = await TransactionStorage.loadTransactions();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const hasTodayTransactions = transactions.some(t => {
          const txDate = new Date(t.timestamp);
          return txDate >= todayStart && txDate <= todayEnd;
        });

        if (hasTodayTransactions) {
          return await this.generateTodaysReport();
        }
      }

      // If no report exists and it's not today (or no transactions), return null
      return null;
    } catch (error) {
      console.error('Error loading report:', error);
      return null;
    }
  },
  // Get weekly reports
  async getWeeklyReports() {
    try {
      const reports = await this.loadAllReports();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyReports = Object.entries(reports)
        .filter(([date]) => new Date(date) >= oneWeekAgo)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .reduce((acc, [date, report]) => ({ ...acc, [date]: report }), {});

      return weeklyReports;
    } catch (error) {
      console.error('Error getting weekly reports:', error);
      return {};
    }
  },

  // Get monthly reports
  async getMonthlyReports() {
    try {
      const reports = await this.loadAllReports();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const monthlyReports = Object.entries(reports)
        .filter(([date]) => new Date(date) >= oneMonthAgo)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .reduce((acc, [date, report]) => ({ ...acc, [date]: report }), {});

      return monthlyReports;
    } catch (error) {
      console.error('Error getting monthly reports:', error);
      return {};
    }
  },


  // ✅ FIXED: Get today's profit stats (updated format for ExpenseManagerScreen)
  async getTodaysProfitStats() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // First check if we have a saved report for today
      const reports = await this.loadAllReports();
      let report = reports[today];

      // Only generate new report if we don't have one AND there are transactions today
      if (!report) {
        const transactions = await TransactionStorage.loadTransactions();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Check if there are ANY transactions today
        const hasTodayTransactions = transactions.some(t => {
          const txDate = new Date(t.timestamp);
          return txDate >= todayStart && txDate <= todayEnd;
        });

        // Only generate if there are actually transactions today
        if (hasTodayTransactions) {
          report = await this.generateTodaysReport();
        }
      }

      if (!report) {
        return {
          totalSales: 0,
          totalProfit: 0,
          totalTransactions: 0,
          averageDailySales: 0,
          averageDailyProfit: 0,
          bestSellingItem: null,
          margin: 0,
          // Legacy fields for backward compatibility
          todayProfit: 0,
          itemsSold: 0,
          bestSeller: null
        };
      }

      const itemsSold = report.items.reduce((total, item) => total + item.sold, 0);

      return {
        totalSales: report.totalSales || 0,
        totalProfit: report.totalProfit || 0,
        totalTransactions: report.transactionCount || 0,
        averageDailySales: report.totalSales || 0,
        averageDailyProfit: report.totalProfit || 0,
        bestSellingItem: report.bestSellingItem,
        margin: report.margin || 0,
        // Legacy fields for backward compatibility
        todayProfit: report.totalProfit,
        itemsSold: itemsSold,
        bestSeller: report.bestSellingItem
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        totalSales: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageDailySales: 0,
        averageDailyProfit: 0,
        bestSellingItem: null,
        margin: 0,
        todayProfit: 0,
        itemsSold: 0,
        bestSeller: null
      };
    }
  },

  // ✅ NEW: Get weekly profit stats (total sales for last 7 days)
  async getWeeklyProfitStats() {
    try {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);

      // Get all reports
      const reports = await this.loadAllReports();

      // Filter for last 7 days
      const weeklyReports = Object.entries(reports)
        .filter(([date]) => {
          const reportDate = new Date(date);
          return reportDate >= weekAgo && reportDate <= today;
        })
        .map(([date, report]) => report);

      // Calculate totals
      const totalSales = weeklyReports.reduce((sum, report) => sum + (report.totalSales || 0), 0);
      const totalProfit = weeklyReports.reduce((sum, report) => sum + (report.totalProfit || 0), 0);
      const totalTransactions = weeklyReports.reduce((sum, report) => sum + (report.transactionCount || 0), 0);

      // Find best selling item for the week
      const allItems = {};
      weeklyReports.forEach(report => {
        report.items?.forEach(item => {
          const key = item.id || item.name;
          if (!allItems[key]) {
            allItems[key] = { ...item };
          } else {
            allItems[key].sold += item.sold || 0;
            allItems[key].profit += item.profit || 0;
          }
        });
      });

      const bestSellingItem = Object.values(allItems).reduce((best, current) =>
        current.sold > (best?.sold || 0) ? current : best, null
      );

      return {
        totalSales,
        totalProfit,
        totalTransactions,
        averageDailySales: totalSales / 7,
        averageDailyProfit: totalProfit / 7,
        bestSellingItem,
        margin: totalSales > 0 ? (totalProfit / totalSales * 100) : 0
      };
    } catch (error) {
      console.error('Error getting weekly profit stats:', error);
      return {
        totalSales: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageDailySales: 0,
        averageDailyProfit: 0,
        bestSellingItem: null,
        margin: 0
      };
    }
  },

  // ✅ NEW: Get monthly profit stats (total sales for current month)
  async getMonthlyProfitStats() {
    try {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get all reports
      const reports = await this.loadAllReports();

      // Filter for current month
      const monthlyReports = Object.entries(reports)
        .filter(([date]) => {
          const reportDate = new Date(date);
          return reportDate >= monthStart && reportDate <= today;
        })
        .map(([date, report]) => report);

      // Calculate totals
      const totalSales = monthlyReports.reduce((sum, report) => sum + (report.totalSales || 0), 0);
      const totalProfit = monthlyReports.reduce((sum, report) => sum + (report.totalProfit || 0), 0);
      const totalTransactions = monthlyReports.reduce((sum, report) => sum + (report.transactionCount || 0), 0);

      // Find best selling item for the month
      const allItems = {};
      monthlyReports.forEach(report => {
        report.items?.forEach(item => {
          const key = item.id || item.name;
          if (!allItems[key]) {
            allItems[key] = { ...item };
          } else {
            allItems[key].sold += item.sold || 0;
            allItems[key].profit += item.profit || 0;
          }
        });
      });

      const bestSellingItem = Object.values(allItems).reduce((best, current) =>
        current.sold > (best?.sold || 0) ? current : best, null
      );

      const daysInMonth = today.getDate(); // Days passed in current month

      return {
        totalSales,
        totalProfit,
        totalTransactions,
        averageDailySales: daysInMonth > 0 ? totalSales / daysInMonth : 0,
        averageDailyProfit: daysInMonth > 0 ? totalProfit / daysInMonth : 0,
        bestSellingItem,
        margin: totalSales > 0 ? (totalProfit / totalSales * 100) : 0
      };
    } catch (error) {
      console.error('Error getting monthly profit stats:', error);
      return {
        totalSales: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageDailySales: 0,
        averageDailyProfit: 0,
        bestSellingItem: null,
        margin: 0
      };
    }
  },

  // Manual refresh of today's report
  async refreshTodaysReport() {
    return await this.generateTodaysReport();
  },

  // Clear all reports
  async clearReports() {
    try {
      await AsyncStorage.removeItem(PROFIT_REPORTS_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing reports:', error);
      return false;
    }
  }
};

export default ProfitReportStorage;