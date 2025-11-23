// utils/ProfitReportStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFIT_REPORTS_KEY = '@profit_reports';
const DAILY_SALES_KEY = '@daily_sales';

export const ProfitReportStorage = {
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
    const reports = await this.loadAllReports();
    return reports[date] || null;
  },

  // Record a sale for profit calculation
  async recordSale(saleData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingSales = await this.loadTodaysSales();
      
      const saleWithProfit = {
        ...saleData,
        id: `sale_${Date.now()}`,
        timestamp: new Date().toISOString(),
        profit: saleData.retailPrice - saleData.wholesalePrice,
        profitMargin: ((saleData.retailPrice - saleData.wholesalePrice) / saleData.retailPrice * 100).toFixed(1)
      };

      const updatedSales = [...existingSales, saleWithProfit];
      await AsyncStorage.setItem(`${DAILY_SALES_KEY}_${today}`, JSON.stringify(updatedSales));
      
      // Update today's profit report
      await this.updateTodaysReport(updatedSales);
      
      return saleWithProfit;
    } catch (error) {
      console.error('Error recording sale:', error);
      return null;
    }
  },

  // Load today's sales
  async loadTodaysSales() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const salesJson = await AsyncStorage.getItem(`${DAILY_SALES_KEY}_${today}`);
      return salesJson ? JSON.parse(salesJson) : [];
    } catch (error) {
      console.error('Error loading today\'s sales:', error);
      return [];
    }
  },

  // Update today's profit report
  async updateTodaysReport(sales) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let totalSales = 0;
      let totalCost = 0;
      let totalProfit = 0;
      const items = {};

      sales.forEach(sale => {
        totalSales += sale.retailPrice * sale.quantity;
        totalCost += sale.wholesalePrice * sale.quantity;
        totalProfit += sale.profit * sale.quantity;

        if (!items[sale.itemId]) {
          items[sale.itemId] = {
            name: sale.itemName,
            sold: 0,
            retailPrice: sale.retailPrice,
            wholesalePrice: sale.wholesalePrice,
            profit: 0
          };
        }
        
        items[sale.itemId].sold += sale.quantity;
        items[sale.itemId].profit += sale.profit * sale.quantity;
      });

      const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      const report = {
        date: today,
        totalSales,
        totalCost,
        totalProfit,
        margin: Number(margin.toFixed(1)),
        items: Object.values(items),
        transactionCount: sales.length,
        bestSellingItem: Object.values(items).reduce((best, current) => 
          current.sold > (best?.sold || 0) ? current : best, null
        )
      };

      await this.saveDailyReport(today, report);
      return report;
    } catch (error) {
      console.error('Error updating today\'s report:', error);
      return null;
    }
  },

  // Get profit stats for HomeScreen metric card
  async getTodaysProfitStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const report = await this.loadReport(today);
      
      if (!report) {
        return {
          todayProfit: 0,
          margin: 0,
          itemsSold: 0,
          bestSeller: null
        };
      }

      return {
        todayProfit: report.totalProfit,
        margin: report.margin,
        itemsSold: report.items.reduce((total, item) => total + item.sold, 0),
        bestSeller: report.bestSellingItem
      };
    } catch (error) {
      console.error('Error getting today\'s profit stats:', error);
      return {
        todayProfit: 0,
        margin: 0,
        itemsSold: 0,
        bestSeller: null
      };
    }
  },

  // Get weekly reports
  async getWeeklyReports() {
    const reports = await this.loadAllReports();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return Object.entries(reports)
      .filter(([date]) => new Date(date) >= oneWeekAgo)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .reduce((acc, [date, report]) => ({ ...acc, [date]: report }), {});
  },

  // Get monthly reports
  async getMonthlyReports() {
    const reports = await this.loadAllReports();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return Object.entries(reports)
      .filter(([date]) => new Date(date) >= oneMonthAgo)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .reduce((acc, [date, report]) => ({ ...acc, [date]: report }), {});
  }
};

export default ProfitReportStorage;