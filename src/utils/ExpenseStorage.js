import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPENSES_KEY = '@business_expenses';

const CATEGORIES = {
    rent: { id: 'rent', name: 'Rent & Utilities', icon: '🏠', color: '#EF4444' },
    stock: { id: 'stock', name: 'Stock Purchase', icon: '📦', color: '#F59E0B' },
    transport: { id: 'transport', name: 'Transport', icon: '🚛', color: '#3B82F6' },
    salary: { id: 'salary', name: 'Salaries', icon: '👥', color: '#8B5CF6' },
    bills: { id: 'bills', name: 'Electricity/Water', icon: '⚡', color: '#10B981' },
    supplies: { id: 'supplies', name: 'Shop Supplies', icon: '🛒', color: '#EC4899' },
    maintenance: { id: 'maintenance', name: 'Repairs', icon: '🔧', color: '#6B7280' },
    marketing: { id: 'marketing', name: 'Marketing', icon: '📢', color: '#06B6D4' },
    fees: { id: 'fees', name: 'Licenses/Fees', icon: '📄', color: '#64748B' },
    meals: { id: 'meals', name: 'Meals', icon: '☕', color: '#D97706' },
    other: { id: 'other', name: 'Other', icon: '•••', color: '#94A3B8' },
};

class ExpenseStorage {
    // ==================== CORE CRUD ====================

    static async loadExpenses() {
        try {
            const data = await AsyncStorage.getItem(EXPENSES_KEY);
            const expenses = data ? JSON.parse(data) : [];
            return expenses.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Load expenses error:', error);
            return [];
        }
    }

    static async addExpense(data) {
        try {
            const expenses = await this.loadExpenses();
            const category = CATEGORIES[data.category] || CATEGORIES.other;

            const newExpense = {
                id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                amount: Number(data.amount) || 0,
                category: data.category || 'other',
                categoryName: category.name,
                categoryIcon: category.icon,
                categoryColor: category.color,
                note: data.note || '',
                date: data.date || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                timestamp: new Date().getTime()
            };

            expenses.unshift(newExpense);
            await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
            console.log('✅ Expense added:', newExpense.id, '-', newExpense.categoryName, 'Ksh', newExpense.amount);
            return newExpense;
        } catch (error) {
            console.error('Add expense error:', error);
            return null;
        }
    }

    static async updateExpense(id, updates) {
        try {
            const expenses = await this.loadExpenses();
            const index = expenses.findIndex(e => e.id === id);

            if (index === -1) {
                console.error('Expense not found:', id);
                return false;
            }

            const category = CATEGORIES[updates.category] || CATEGORIES[expenses[index].category];

            expenses[index] = {
                ...expenses[index],
                ...updates,
                categoryName: category.name,
                categoryIcon: category.icon,
                categoryColor: category.color,
                updatedAt: new Date().toISOString()
            };

            await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
            console.log('✅ Expense updated:', id);
            return true;
        } catch (error) {
            console.error('Update expense error:', error);
            return false;
        }
    }

    static async deleteExpense(id) {
        try {
            const expenses = await this.loadExpenses();
            const filtered = expenses.filter(e => e.id !== id);
            await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered));
            console.log('✅ Expense deleted:', id);
            return true;
        } catch (error) {
            console.error('Delete expense error:', error);
            return false;
        }
    }

    // ==================== PERIOD-BASED STATISTICS ====================

    static async getTodayStats() {
        return this.getStatsForPeriod('today');
    }

    static async getWeeklyStats() {
        return this.getStatsForPeriod('week');
    }

    static async getMonthlyStats() {
        return this.getStatsForPeriod('month');
    }

    static async getStatsForPeriod(period = 'today') {
        try {
            const expenses = await this.loadExpenses();
            const today = new Date();
            let startDate, endDate;

            switch (period) {
                case 'today':
                    const todayStr = today.toISOString().split('T')[0];
                    startDate = todayStr;
                    endDate = todayStr;
                    break;
                case 'week':
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - 7);
                    startDate = weekStart.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    startDate = monthStart.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                default:
                    return { total: 0, count: 0, items: [], byCategory: [] };
            }

            const periodExpenses = expenses.filter(e => {
                const expDate = new Date(e.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return expDate >= start && expDate <= end;
            });

            const totalAmount = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            // Category breakdown
            const byCategory = {};
            periodExpenses.forEach(exp => {
                if (!byCategory[exp.category]) {
                    byCategory[exp.category] = {
                        category: exp.category,
                        name: exp.categoryName,
                        icon: exp.categoryIcon,
                        color: exp.categoryColor,
                        total: 0,
                        count: 0
                    };
                }
                byCategory[exp.category].total += exp.amount;
                byCategory[exp.category].count += 1;
            });

            return {
                total: totalAmount,
                count: periodExpenses.length,
                items: periodExpenses,
                byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
                average: periodExpenses.length > 0 ? totalAmount / periodExpenses.length : 0
            };
        } catch (error) {
            console.error(`Get ${period} stats error:`, error);
            return { total: 0, count: 0, items: [], byCategory: [], average: 0 };
        }
    }

    // ==================== NET PROFIT CALCULATIONS ====================

    static async calculateNetProfit(revenue, period = 'today') {
        try {
            const stats = await this.getStatsForPeriod(period);
            const expenseTotal = stats.total || 0;

            const netProfit = revenue - expenseTotal;
            const netMargin = revenue > 0 ? (netProfit / revenue * 100) : 0;
            const expenseRatio = revenue > 0 ? (expenseTotal / revenue * 100) : 0;

            return {
                revenue,
                expenses: expenseTotal,
                netProfit,
                netMargin: Math.round(netMargin * 10) / 10,
                expenseRatio: Math.round(expenseRatio),
                status: this.getNetProfitStatus(netMargin)
            };
        } catch (error) {
            console.error('Calculate net profit error:', error);
            return {
                revenue,
                expenses: 0,
                netProfit: revenue,
                netMargin: 100,
                expenseRatio: 0,
                status: 'excellent'
            };
        }
    }

    static getNetProfitStatus(netMargin) {
        if (netMargin >= 50) return 'excellent';
        if (netMargin >= 30) return 'great';
        if (netMargin >= 15) return 'good';
        if (netMargin >= 5) return 'fair';
        if (netMargin < 0) return 'loss';
        return 'warning';
    }

    static getStatusColor(status) {
        const colors = {
            excellent: '#10B981',
            great: '#3B82F6',
            good: '#F59E0B',
            fair: '#EF4444',
            warning: '#DC2626',
            loss: '#991B1B'
        };
        return colors[status] || '#6B7280';
    }

    static getStatusLabel(status) {
        const labels = {
            excellent: 'Excellent!',
            great: 'Great!',
            good: 'Good',
            fair: 'Fair',
            warning: 'Needs Attention',
            loss: 'LOSS!'
        };
        return labels[status] || 'Unknown';
    }

    // ==================== CATEGORY MANAGEMENT ====================

    static getCategories() {
        return Object.values(CATEGORIES);
    }

    static getCategory(id) {
        return CATEGORIES[id] || CATEGORIES.other;
    }

    static getCategoryColor(id) {
        return (CATEGORIES[id] || CATEGORIES.other).color;
    }

    static getCategoryIcon(id) {
        return (CATEGORIES[id] || CATEGORIES.other).icon;
    }

    // ==================== SEARCH & FILTER ====================

    static async searchExpenses(query) {
        try {
            const expenses = await this.loadExpenses();
            const searchLower = query.toLowerCase();

            return expenses.filter(e =>
                e.note?.toLowerCase().includes(searchLower) ||
                e.categoryName?.toLowerCase().includes(searchLower)
            );
        } catch (error) {
            console.error('Search expenses error:', error);
            return [];
        }
    }

    static async getExpensesByCategory(category) {
        try {
            const expenses = await this.loadExpenses();
            return expenses.filter(e => e.category === category);
        } catch (error) {
            console.error('Get by category error:', error);
            return [];
        }
    }

    static async getExpensesByDateRange(startDate, endDate) {
        try {
            const expenses = await this.loadExpenses();
            return expenses.filter(e => {
                const expDate = new Date(e.date);
                return expDate >= startDate && expDate <= endDate;
            });
        } catch (error) {
            console.error('Get by date range error:', error);
            return [];
        }
    }

    // ==================== ENHANCED INSIGHTS & WARNINGS ====================

    static async getExpenseInsights(revenue, period = 'today') {
        try {
            const stats = await this.getStatsForPeriod(period);
            const previousPeriodStats = await this.getPreviousPeriodStats(period);

            const insights = [];

            // High expense ratio warning
            if (revenue > 0) {
                const expenseRatio = (stats.total / revenue) * 100;
                if (expenseRatio > 70) {
                    insights.push({
                        type: 'warning',
                        title: 'High Expense Ratio',
                        message: `Expenses are ${Math.round(expenseRatio)}% of revenue`,
                        suggestion: 'Consider reducing discretionary spending'
                    });
                } else if (expenseRatio < 20) {
                    insights.push({
                        type: 'info',
                        title: 'Good Cost Control',
                        message: `Expense ratio is only ${Math.round(expenseRatio)}%`,
                        suggestion: 'Great job managing costs!'
                    });
                }
            }

            // Top expense category
            if (stats.byCategory.length > 0) {
                const top = stats.byCategory[0];
                const percentage = stats.total > 0 ? (top.total / stats.total * 100).toFixed(0) : 0;

                if (percentage > 50) {
                    insights.push({
                        type: 'warning',
                        title: 'Category Concentration',
                        message: `${top.name} makes up ${percentage}% of expenses`,
                        suggestion: 'Consider diversifying expenses'
                    });
                } else {
                    insights.push({
                        type: 'info',
                        title: 'Top Spending Category',
                        message: `${top.name}: Ksh ${top.total.toLocaleString()} (${percentage}%)`,
                        suggestion: 'Monitor this category closely'
                    });
                }
            }

            // Spending trend compared to previous period
            if (previousPeriodStats.total > 0) {
                const change = ((stats.total - previousPeriodStats.total) / previousPeriodStats.total * 100);

                if (change > 30) {
                    insights.push({
                        type: 'warning',
                        title: 'Spending Increase',
                        message: `Expenses increased by ${Math.abs(change).toFixed(0)}% compared to last ${period}`,
                        suggestion: 'Review recent purchases'
                    });
                } else if (change < -20) {
                    insights.push({
                        type: 'info',
                        title: 'Cost Savings',
                        message: `Expenses decreased by ${Math.abs(change).toFixed(0)}% compared to last ${period}`,
                        suggestion: 'Great cost management!'
                    });
                }
            }

            // No expenses insight
            if (stats.count === 0) {
                insights.push({
                    type: 'info',
                    title: 'No Expenses Recorded',
                    message: `No expenses for this ${period}`,
                    suggestion: 'Record your first expense to start tracking'
                });
            }

            return insights;
        } catch (error) {
            console.error('Get insights error:', error);
            return [];
        }
    }

    static async getPreviousPeriodStats(currentPeriod) {
        try {
            const expenses = await this.loadExpenses();
            const today = new Date();
            let startDate, endDate;

            switch (currentPeriod) {
                case 'today':
                    // Previous day
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    startDate = yesterday.toISOString().split('T')[0];
                    endDate = startDate;
                    break;
                case 'week':
                    // Previous week
                    const lastWeekStart = new Date(today);
                    lastWeekStart.setDate(today.getDate() - 14);
                    const lastWeekEnd = new Date(today);
                    lastWeekEnd.setDate(today.getDate() - 7);
                    startDate = lastWeekStart.toISOString().split('T')[0];
                    endDate = lastWeekEnd.toISOString().split('T')[0];
                    break;
                case 'month':
                    // Previous month
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    startDate = lastMonth.toISOString().split('T')[0];
                    endDate = lastMonthEnd.toISOString().split('T')[0];
                    break;
                default:
                    return { total: 0, count: 0 };
            }

            const previousExpenses = expenses.filter(e => {
                const expDate = new Date(e.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return expDate >= start && expDate <= end;
            });

            const total = previousExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            return {
                total,
                count: previousExpenses.length,
                average: previousExpenses.length > 0 ? total / previousExpenses.length : 0
            };
        } catch (error) {
            console.error('Get previous period stats error:', error);
            return { total: 0, count: 0, average: 0 };
        }
    }

    // ==================== DATA MANAGEMENT ====================

    static async exportExpenses(startDate, endDate) {
        try {
            const expenses = await this.getExpensesByDateRange(startDate, endDate);

            const csv = [
                'Date,Category,Amount,Note',
                ...expenses.map(e =>
                    `${e.date},${e.categoryName},${e.amount},"${e.note || ''}"`
                )
            ].join('\n');

            return csv;
        } catch (error) {
            console.error('Export expenses error:', error);
            return '';
        }
    }

    static async clearAllExpenses() {
        try {
            await AsyncStorage.removeItem(EXPENSES_KEY);
            console.log('✅ All expenses cleared');
            return true;
        } catch (error) {
            console.error('Clear expenses error:', error);
            return false;
        }
    }

    // ==================== BULK OPERATIONS ====================

    static async getExpenseSummary() {
        try {
            const expenses = await this.loadExpenses();
            const today = new Date();
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const allTime = expenses.reduce((sum, e) => sum + e.amount, 0);
            const monthly = expenses
                .filter(e => new Date(e.date) >= thisMonth)
                .reduce((sum, e) => sum + e.amount, 0);

            const byCategory = {};
            expenses.forEach(exp => {
                if (!byCategory[exp.category]) {
                    byCategory[exp.category] = {
                        name: exp.categoryName,
                        total: 0,
                        count: 0
                    };
                }
                byCategory[exp.category].total += exp.amount;
                byCategory[exp.category].count += 1;
            });

            return {
                allTime,
                monthly,
                categorySummary: Object.values(byCategory).sort((a, b) => b.total - a.total),
                totalExpenses: expenses.length
            };
        } catch (error) {
            console.error('Get expense summary error:', error);
            return { allTime: 0, monthly: 0, categorySummary: [], totalExpenses: 0 };
        }
    }
}

export default ExpenseStorage;