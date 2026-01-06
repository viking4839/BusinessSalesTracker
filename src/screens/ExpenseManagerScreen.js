import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    RefreshControl, StatusBar, TextInput, Alert, Modal, Dimensions,
    Animated, Platform
} from 'react-native';
import {
    ArrowLeft, Plus, X, TrendingUp, TrendingDown, DollarSign,
    Trash2, Edit2, AlertCircle, Info, Filter, Calendar, Download,
    Home, Package, Truck, Users, Zap, ShoppingCart, Wrench,
    Megaphone, FileText, Coffee, MoreHorizontal, PieChart,
    Target, BarChart3, Clock, CheckCircle, ChevronRight
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Shadows } from '../styles/Theme';
import ExpenseStorage from '../utils/ExpenseStorage';
import ProfitReportStorage from '../utils/ProfitReportStorage';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Updated categories with Lucide icons
const LUCIDE_CATEGORIES = {
    rent: { icon: Home, color: '#EF4444' },
    stock: { icon: Package, color: '#F59E0B' },
    transport: { icon: Truck, color: '#3B82F6' },
    salary: { icon: Users, color: '#8B5CF6' },
    bills: { icon: Zap, color: '#10B981' },
    supplies: { icon: ShoppingCart, color: '#EC4899' },
    maintenance: { icon: Wrench, color: '#6B7280' },
    marketing: { icon: Megaphone, color: '#06B6D4' },
    fees: { icon: FileText, color: '#64748B' },
    meals: { icon: Coffee, color: '#D97706' },
    other: { icon: MoreHorizontal, color: '#94A3B8' },
};

// --- ENHANCED COMPONENTS ---

const PeriodSelector = ({ selectedPeriod, onSelect }) => {
    const periods = [
        { id: 'today', label: 'Today', icon: Clock },
        { id: 'week', label: 'Week', icon: Calendar },
        { id: 'month', label: 'Month', icon: BarChart3 },
    ];

    return (
        <View style={styles.periodContainer}>
            {periods.map(period => {
                const Icon = period.icon;
                const isActive = selectedPeriod === period.id;
                return (
                    <TouchableOpacity
                        key={period.id}
                        style={[styles.periodBtn, isActive && styles.periodBtnActive]}
                        onPress={() => onSelect(period.id)}
                    >
                        <Icon size={16} color={isActive ? Colors.primary : Colors.textSecondary} />
                        <Text style={[
                            styles.periodBtnText,
                            isActive && styles.periodBtnTextActive
                        ]}>
                            {period.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

// Replace the NetProfitCard component with this corrected version:
const NetProfitCard = ({ stats = {}, period }) => {
    const safeStats = {
        netProfit: stats.netProfit || 0,
        netMargin: stats.netMargin || 0,
        revenue: stats.revenue || 0,
        expenses: stats.expenses || 0
    };

    const getStatusColor = () => {
        if (safeStats.netMargin >= 50) return '#10B981';
        if (safeStats.netMargin >= 30) return '#3B82F6';
        if (safeStats.netMargin >= 15) return '#F59E0B';
        if (safeStats.netMargin >= 5) return '#EF4444';
        if (safeStats.netMargin < 0) return '#991B1B';
        return '#DC2626';
    };

    const getStatusLabel = () => {
        if (safeStats.netMargin >= 50) return 'Excellent!';
        if (safeStats.netMargin >= 30) return 'Great!';
        if (safeStats.netMargin >= 15) return 'Good';
        if (safeStats.netMargin >= 5) return 'Fair';
        if (safeStats.netMargin < 0) return 'LOSS!';
        return 'Needs Attention';
    };

    const StatusIcon = safeStats.netProfit >= 0 ? TrendingUp : TrendingDown;

    return (
        <View style={styles.netProfitCard}>
            <View style={styles.netProfitHeader}>
                <View style={styles.netProfitTitleRow}>
                    <StatusIcon size={22} color={getStatusColor()} />
                    <Text style={styles.netProfitLabel}>Net Profit ({period})</Text>
                </View>
                <View style={styles.profitAmountContainer}>
                    <Text style={[styles.netProfitAmount, { color: getStatusColor() }]}>
                        Ksh {Math.abs(safeStats.netProfit).toLocaleString()}
                    </Text>
                    {safeStats.netProfit < 0 && (
                        <Text style={styles.lossBadge}>LOSS</Text>
                    )}
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${Math.min(Math.abs(safeStats.netMargin), 100)}%`,
                                backgroundColor: getStatusColor()
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    Profit Margin: <Text style={{ color: getStatusColor(), fontWeight: '700' }}>
                        {safeStats.netMargin.toFixed(1)}%
                    </Text>
                </Text>
            </View>

            <View style={styles.netProfitDetails}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Revenue</Text>
                    <Text style={styles.detailValue}>
                        Ksh {safeStats.revenue.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Expenses</Text>
                    <Text style={[styles.detailValue, { color: Colors.error }]}>
                        -Ksh {safeStats.expenses.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor() }]}>
                        {getStatusLabel()}
                    </Text>
                </View>
            </View>
        </View>
    );
};
// Replace the QuickStats component with this corrected version:
const QuickStats = ({ stats = {} }) => {
    const safeStats = {
        total: stats.total || 0,
        count: stats.count || 0,
        average: stats.average || 0
    };

    return (
        <View style={styles.quickStatsContainer}>
            <View style={styles.quickStatItem}>
                <DollarSign size={20} color={Colors.primary} />
                <View style={styles.quickStatTextContainer}>
                    <Text style={styles.quickStatLabel}>Total Expenses</Text>
                    <Text style={styles.quickStatValue}>
                        Ksh {safeStats.total.toLocaleString()}
                    </Text>
                </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
                <ShoppingCart size={20} color="#F59E0B" />
                <View style={styles.quickStatTextContainer}>
                    <Text style={styles.quickStatLabel}>Transactions</Text>
                    <Text style={styles.quickStatValue}>{safeStats.count}</Text>
                </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
                <Target size={20} color="#10B981" />
                <View style={styles.quickStatTextContainer}>
                    <Text style={styles.quickStatLabel}>Avg/Item</Text>
                    <Text style={styles.quickStatValue}>
                        Ksh {safeStats.average ? Math.round(safeStats.average).toLocaleString() : '0'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const InsightCard = ({ insight }) => {
    const Icon = insight.type === 'warning' ? AlertCircle : Info;
    const color = insight.type === 'warning' ? Colors.warning : Colors.primary;

    return (
        <View style={[styles.insightCard, { borderLeftColor: color }]}>
            <Icon size={22} color={color} />
            <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightMessage}>{insight.message}</Text>
                {insight.suggestion && (
                    <Text style={styles.insightSuggestion}>{insight.suggestion}</Text>
                )}
            </View>
        </View>
    );
};

const CategoryBreakdownCard = ({ categories, totalExpenses, onCategoryPress }) => {
    if (!categories || categories.length === 0) {
        return (
            <View style={styles.categoryCard}>
                <Text style={styles.categoryCardTitle}>Expense Categories</Text>
                <Text style={styles.emptyCategoryText}>No expenses recorded</Text>
            </View>
        );
    }

    return (
        <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
                <Text style={styles.categoryCardTitle}>Top Categories</Text>
                <TouchableOpacity onPress={() => onCategoryPress('all')}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {categories.slice(0, 4).map((cat) => {
                const percentage = totalExpenses > 0 ? (cat.total / totalExpenses * 100) : 0;
                const CategoryIcon = LUCIDE_CATEGORIES[cat.category]?.icon || MoreHorizontal;

                return (
                    <TouchableOpacity
                        key={cat.category}
                        style={styles.categoryItem}
                        onPress={() => onCategoryPress(cat.category)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.categoryLeft}>
                            <View style={[
                                styles.categoryIconContainer,
                                { backgroundColor: `${cat.color}15` }
                            ]}>
                                <CategoryIcon
                                    size={20}
                                    color={cat.color}
                                />
                            </View>
                            <View style={styles.categoryInfo}>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                                <Text style={styles.categoryCount}>{cat.count} items</Text>
                            </View>
                        </View>
                        <View style={styles.categoryRight}>
                            <Text style={styles.categoryAmount}>
                                Ksh {cat.total.toLocaleString()}
                            </Text>
                            <View style={styles.percentageContainer}>
                                <View style={styles.percentageBar}>
                                    <View
                                        style={[
                                            styles.percentageFill,
                                            { width: `${Math.min(percentage, 100)}%`, backgroundColor: cat.color }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.categoryPercent}>{percentage.toFixed(0)}%</Text>
                            </View>
                        </View>
                        <ChevronRight size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const ExpenseCard = ({ item, onDelete, onEdit }) => {
    const CategoryIcon = LUCIDE_CATEGORIES[item.category]?.icon || MoreHorizontal;
    const categoryColor = LUCIDE_CATEGORIES[item.category]?.color || '#94A3B8';

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onEdit && onEdit(item)}
            onLongPress={() => {
                Alert.alert(
                    'Expense Options',
                    `Expense: ${item.categoryName} - Ksh ${item.amount.toLocaleString()}`,
                    [
                        { text: 'Edit', onPress: () => onEdit(item) },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item) },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            }}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: `${categoryColor}15` }]}>
                <CategoryIcon size={22} color={categoryColor} />
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.categoryName}</Text>
                    <Text style={styles.cardAmount}>
                        -Ksh {Number(item.amount).toLocaleString()}
                    </Text>
                </View>
                {item.note ? (
                    <Text style={styles.cardNote} numberOfLines={2}>
                        {item.note}
                    </Text>
                ) : null}
                <View style={styles.cardFooter}>
                    <Text style={styles.cardTime}>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                    <Text style={styles.cardDate}>
                        {new Date(item.date).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.cardDeleteButton}
                onPress={() => onDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const AddExpenseModal = ({ visible, onClose, onSave, editingExpense, onDelete }) => {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('other');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const categories = ExpenseStorage.getCategories();
    const categoryRows = [];
    for (let i = 0; i < categories.length; i += 3) {
        categoryRows.push(categories.slice(i, i + 3));
    }

    useEffect(() => {
        if (editingExpense) {
            setAmount(editingExpense.amount.toString());
            setNote(editingExpense.note || '');
            setCategory(editingExpense.category);
            setDate(new Date(editingExpense.date));
        } else {
            setAmount('');
            setNote('');
            setCategory('other');
            setDate(new Date());
        }
    }, [editingExpense, visible]);

    const handleSave = () => {
        if (!amount || Number(amount) <= 0) {
            return Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
        }

        onSave({
            id: editingExpense?.id,
            amount: Number(amount),
            category,
            note,
            date: date.toISOString().split('T')[0]
        });

        onClose();
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(editingExpense.id);
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderContent}>
                            <Text style={styles.modalTitle}>
                                {editingExpense ? 'Edit Expense' : 'New Expense'}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {editingExpense ? 'Update expense details' : 'Record a business expense'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalBody}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 30 }}
                    >
                        {/* Amount Section */}
                        <View style={styles.amountSection}>
                            <Text style={styles.amountLabel}>Amount (Ksh)</Text>
                            <View style={styles.amountInputContainer}>
                                <Text style={styles.currencySymbol}>Ksh</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor={Colors.textLight + '80'}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus={!editingExpense}
                                />
                            </View>
                        </View>

                        {/* Date Picker */}
                        <View style={styles.dateSection}>
                            <Text style={styles.sectionLabel}>Date</Text>
                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <View style={styles.dateIcon}>
                                    <Calendar size={20} color={Colors.primary} />
                                </View>
                                <Text style={styles.datePickerText}>
                                    {date.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                                <Text style={styles.changeDateText}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Category Section */}
                        <View style={styles.categorySection}>
                            <Text style={styles.sectionLabel}>Category</Text>
                            <Text style={styles.sectionSubtitle}>Select expense category</Text>
                            <View style={styles.categoryGrid}>
                                {categoryRows.map((row, rowIndex) => (
                                    <View
                                        key={rowIndex}
                                        style={[
                                            styles.categoryRow,
                                            rowIndex === categoryRows.length - 1 && styles.lastCategoryRow
                                        ]}
                                    >
                                        {row.map(c => {
                                            const CategoryIcon = LUCIDE_CATEGORIES[c.id]?.icon || MoreHorizontal;
                                            const isSelected = category === c.id;
                                            return (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    style={[
                                                        styles.categoryOption,
                                                        isSelected && styles.categoryOptionSelected,
                                                        { borderColor: isSelected ? c.color : Colors.border },
                                                        row.length < 3 && styles.centeredCategoryOption
                                                    ]}
                                                    onPress={() => setCategory(c.id)}
                                                >
                                                    <View style={[
                                                        styles.categoryOptionIcon,
                                                        { backgroundColor: isSelected ? c.color : `${c.color}15` }
                                                    ]}>
                                                        <CategoryIcon
                                                            size={22}
                                                            color={isSelected ? '#FFFFFF' : c.color}
                                                        />
                                                    </View>
                                                    <Text style={[
                                                        styles.categoryOptionText,
                                                        isSelected && { color: c.color, fontWeight: '700' }
                                                    ]} numberOfLines={2}>
                                                        {c.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Note Section */}
                        <View style={styles.noteSection}>
                            <Text style={styles.sectionLabel}>Notes (Optional)</Text>
                            <Text style={styles.sectionSubtitle}>Add description or details</Text>
                            <View style={styles.noteInputContainer}>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="e.g., Lunch for staff, Shop rent, Supplies purchase, Office materials..."
                                    placeholderTextColor={Colors.textLight}
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                <View style={styles.noteIcon}>
                                    <FileText size={20} color={Colors.textSecondary} />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>
                                {editingExpense ? 'Update Expense' : 'Save Expense'}
                            </Text>
                        </TouchableOpacity>

                        {editingExpense ? (
                            // When editing, show Delete, Cancel, Update buttons
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={handleDelete}
                                >
                                    <Trash2 size={20} color="#FFF" />
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.cancelButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.saveButton]}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.saveButtonText}>Update</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // When adding new, show Cancel, Save buttons
                            <>
                                
                            </>
                        )}

                    </View>
                </View>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}
        </Modal>
    );
};

// --- MAIN SCREEN ---

const ExpenseManagerScreen = ({ navigation }) => {
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        netMargin: 0,
        count: 0,
        average: 0
    });
    const [insights, setInsights] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [summaryStats, setSummaryStats] = useState({});

    const loadData = async (period = selectedPeriod) => {
        setRefreshing(true);
        try {
            let expenseStats, revenue;

            // Load data based on selected period
            switch (period) {
                case 'today':
                    expenseStats = await ExpenseStorage.getTodayStats();
                    const todayProfit = await ProfitReportStorage.getTodaysProfitStats();
                    revenue = todayProfit?.totalSales || 0;
                    break;
                case 'week':
                    expenseStats = await ExpenseStorage.getWeeklyStats();
                    const weekProfit = await ProfitReportStorage.getWeeklyProfitStats();
                    revenue = weekProfit?.totalSales || 0;
                    break;
                case 'month':
                    expenseStats = await ExpenseStorage.getMonthlyStats();
                    const monthProfit = await ProfitReportStorage.getMonthlyProfitStats();
                    revenue = monthProfit?.totalSales || 0;
                    break;
                default:
                    expenseStats = await ExpenseStorage.getTodayStats();
                    revenue = 0;
            }

            // Calculate net profit
            const netProfitData = await ExpenseStorage.calculateNetProfit(revenue, period);

            // Get insights
            const expenseInsights = await ExpenseStorage.getExpenseInsights(revenue);

            // Set state
            setExpenses(expenseStats.items || []);
            setFilteredExpenses(expenseStats.items || []);
            setCategoryBreakdown(expenseStats.byCategory || []);
            setStats({
                total: expenseStats.total || 0,
                revenue: revenue,
                expenses: expenseStats.total || 0,
                netProfit: netProfitData.netProfit || 0,
                netMargin: netProfitData.netMargin || 0,
                count: expenseStats.count || 0,
                average: expenseStats.count > 0 ? expenseStats.total / expenseStats.count : 0
            });
            setInsights(expenseInsights);
            setSummaryStats(expenseStats);

        } catch (error) {
            console.error('Load expense data error:', error);
            Alert.alert('Error', 'Failed to load expense data');
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handlePeriodChange = (period) => {
        setSelectedPeriod(period);
        loadData(period);
        setActiveFilter('all'); // Reset filter when period changes
    };

    const handleAdd = async (data) => {
        try {
            if (data.id) {
                // Update existing
                await ExpenseStorage.updateExpense(data.id, data);
            } else {
                // Add new
                await ExpenseStorage.addExpense(data);
            }
            setEditingExpense(null);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save expense');
        }
    };

    const handleEdit = (item) => {
        setEditingExpense(item);
        setModalVisible(true);
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Delete Expense?',
            `Are you sure you want to delete this ${item.categoryName} expense of Ksh ${item.amount.toLocaleString()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ExpenseStorage.deleteExpense(item.id);
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete expense');
                        }
                    }
                }
            ]
        );
    };

    const handleCategoryFilter = (categoryId) => {
        setActiveFilter(categoryId);
        if (categoryId === 'all') {
            setFilteredExpenses(expenses);
        } else {
            const filtered = expenses.filter(e => e.category === categoryId);
            setFilteredExpenses(filtered);
        }
    };

    const getFilterLabel = () => {
        if (activeFilter === 'all') return 'All Expenses';
        const cat = ExpenseStorage.getCategory(activeFilter);
        return cat.name;
    };

    const handleClearFilter = () => {
        setActiveFilter('all');
        setFilteredExpenses(expenses);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Expense Tracker</Text>
                    <TouchableOpacity onPress={() => loadData()} style={styles.refreshButton}>
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>
                    Track and manage your business expenses
                </Text>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadData()}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Period Selector */}
                <PeriodSelector
                    selectedPeriod={selectedPeriod}
                    onSelect={handlePeriodChange}
                />

                {/* Net Profit Card */}
                <NetProfitCard stats={stats} period={selectedPeriod} />

                {/* Quick Stats */}
                <QuickStats stats={summaryStats} />

                {/* Insights */}
                {insights.length > 0 && (
                    <View style={styles.insightsSection}>
                        <Text style={styles.sectionTitle}>Insights</Text>
                        {insights.map((insight, index) => (
                            <InsightCard key={index} insight={insight} />
                        ))}
                    </View>
                )}

                {/* Category Breakdown */}
                <CategoryBreakdownCard
                    categories={categoryBreakdown}
                    totalExpenses={stats.total}
                    onCategoryPress={handleCategoryFilter}
                />

                {/* Expense List Header */}
                <View style={styles.listHeader}>
                    <View>
                        <Text style={styles.listTitle}>
                            {getFilterLabel()} ({filteredExpenses.length})
                        </Text>
                        {activeFilter !== 'all' && (
                            <TouchableOpacity onPress={handleClearFilter}>
                                <Text style={styles.clearFilter}>Clear filter</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {expenses.length > 0 && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => {
                                setEditingExpense(null);
                                setModalVisible(true);
                            }}
                        >
                            <Plus size={18} color={Colors.primary} />
                            <Text style={styles.addButtonText}>Add Expense</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Expense List */}
                {filteredExpenses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <DollarSign size={48} color={Colors.border} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {activeFilter === 'all'
                                ? 'No expenses recorded'
                                : 'No expenses in this category'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeFilter === 'all'
                                ? 'Tap the + button to add your first expense'
                                : 'Try selecting a different category or period'}
                        </Text>
                        {activeFilter !== 'all' && (
                            <TouchableOpacity
                                style={styles.emptyActionButton}
                                onPress={handleClearFilter}
                            >
                                <Text style={styles.emptyActionText}>Show All Expenses</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    filteredExpenses.map(item => (
                        <ExpenseCard
                            key={item.id}
                            item={item}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setEditingExpense(null);
                    setModalVisible(true);
                }}
                activeOpacity={0.9}
            >
                <Plus size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Modals */}
            <AddExpenseModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setEditingExpense(null);
                }}
                onSave={handleAdd}
                onDelete={handleDelete}  // Add this prop
                editingExpense={editingExpense}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 15,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
        ...Shadows.md
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        flex: 1
    },
    refreshButton: {
        padding: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8
    },
    refreshText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600'
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 4
    },
    content: {
        flex: 1,
        padding: Spacing.md
    },

    // Add these styles to the StyleSheet
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: 12,
        backgroundColor: Colors.error,
        gap: 6,
    },
    deleteButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },

    // Update modalActions style to handle 3 buttons
    modalActions: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '20',
        backgroundColor: Colors.surface
    },
    actionButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    // Period Selector
    periodContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: Spacing.md,
        ...Shadows.sm
    },
    periodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6
    },
    periodBtnActive: {
        backgroundColor: Colors.primary + '15'
    },
    periodBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary
    },
    periodBtnTextActive: {
        color: Colors.primary
    },

    cardDeleteButton: {
        padding: 6,
        marginLeft: 8,
        opacity: 0.7,
    },
    // Net Profit Card
    netProfitCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.md
    },
    netProfitHeader: {
        marginBottom: Spacing.lg
    },
    netProfitTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
    },
    netProfitLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    profitAmountContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8
    },
    netProfitAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.text
    },
    lossBadge: {
        backgroundColor: '#991B1B15',
        color: '#991B1B',
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        textTransform: 'uppercase'
    },
    progressContainer: {
        marginBottom: Spacing.lg
    },
    progressBar: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        borderRadius: 4
    },
    progressText: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center'
    },
    netProfitDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border
    },
    detailItem: {
        flex: 1,
        alignItems: 'center'
    },
    detailLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text
    },
    detailDivider: {
        width: 1,
        backgroundColor: Colors.border
    },

    // Quick Stats
    quickStatsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm
    },
    quickStatItem: {
        flex: 1,
        alignItems: 'center'
    },
    quickStatTextContainer: {
        alignItems: 'center',
        marginTop: 8
    },
    quickStatLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2
    },
    quickStatValue: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: Colors.border
    },

    // Insights
    insightsSection: {
        marginBottom: Spacing.md
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm
    },
    insightCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 4,
        ...Shadows.sm
    },
    insightContent: {
        flex: 1,
        marginLeft: 12
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4
    },
    insightMessage: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 4
    },
    insightSuggestion: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600'
    },

    // Category Card
    categoryCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md
    },
    categoryCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text
    },
    viewAllText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600'
    },
    emptyCategoryText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        fontSize: 13,
        padding: Spacing.lg
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '30'
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    categoryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    categoryInfo: {
        flex: 1
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2
    },
    categoryCount: {
        fontSize: 11,
        color: Colors.textLight
    },
    categoryRight: {
        alignItems: 'flex-end',
        marginRight: 8
    },
    categoryAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4
    },
    percentageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    percentageBar: {
        width: 60,
        height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        overflow: 'hidden'
    },
    percentageFill: {
        height: '100%',
        borderRadius: 2
    },
    categoryPercent: {
        fontSize: 11,
        color: Colors.textSecondary,
        minWidth: 24
    },

    // List Header
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        marginTop: Spacing.lg
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text
    },
    clearFilter: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 2
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.primary + '15'
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: Spacing.xl
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.border + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
        textAlign: 'center'
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 20
    },
    emptyActionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.primary + '15',
        borderRadius: 8
    },
    emptyActionText: {
        color: Colors.primary,
        fontWeight: '600',
        fontSize: 14
    },

    // Expense Card
    card: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
        alignItems: 'center'
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    cardContent: {
        flex: 1
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        flex: 1
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.error,
        marginLeft: 8
    },
    cardNote: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 6
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    cardTime: {
        fontSize: 11,
        color: Colors.textLight
    },
    cardDate: {
        fontSize: 11,
        color: Colors.textLight
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 0
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        flex: 1
    },
    closeButton: {
        padding: 4
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        marginTop: Spacing.md
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginRight: 8
    },
    amountInput: {
        flex: 1,
        fontSize: 40,
        fontWeight: '800',
        color: Colors.text,
        padding: 0,
        minHeight: 50
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg
    },
    datePickerText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '600'
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg
    },
    categoryOption: {
        width: (width - Spacing.lg * 2 - 20) / 3,
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        backgroundColor: Colors.background
    },
    categoryOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6
    },
    categoryOptionText: {
        fontSize: 10,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600'
    },
    noteInput: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 80
    },
    modalActions: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '20',
        backgroundColor: Colors.surface
    },
    actionButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    cancelButton: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border
    },
    cancelButtonText: {
        color: Colors.text,
        fontWeight: '700',
        fontSize: 15
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.error,
    },
    deleteButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15
    },
    saveButton: {
        backgroundColor: Colors.primary,
        ...Shadows.sm
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '20'
    },
    modalHeaderContent: {
        flex: 1
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 4
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border
    },
    modalBody: {
        paddingHorizontal: Spacing.lg
    },

    // Amount Section
    amountSection: {
        marginTop: Spacing.md,
        marginBottom: Spacing.lg
    },
    amountLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 16,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.primary + '30'
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.primary,
        marginRight: Spacing.sm
    },
    amountInput: {
        flex: 1,
        fontSize: 40,
        fontWeight: '800',
        color: Colors.text,
        padding: 0,
        minHeight: 50
    },

    // Date Section
    dateSection: {
        marginBottom: Spacing.lg
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4
    },
    sectionSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.md
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border
    },
    dateIcon: {
        marginRight: Spacing.sm
    },
    datePickerText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text
    },
    changeDateText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600'
    },

    // Category Section
    categorySection: {
        marginBottom: Spacing.lg
    },
    categoryGrid: {
        marginTop: Spacing.sm
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    lastCategoryRow: {
        justifyContent: 'flex-start',
        gap: '4%'
    },
    categoryOption: {
        width: '31%', // 3 items per row with 3.5% gap total
        alignItems: 'center',
        padding: Spacing.sm,
        borderWidth: 2,
        borderRadius: 12,
        backgroundColor: Colors.background,
        minHeight: 100
    },
    centeredCategoryOption: {
        width: '48%' // For last row with 2 items
    },
    categoryOptionSelected: {
        backgroundColor: Colors.background,
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
        ...Shadows.sm
    },
    categoryOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    categoryOptionText: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 16,
        maxWidth: '100%',
        flexShrink: 1
    },

    // Note Section
    noteSection: {
        marginBottom: Spacing.xl
    },
    noteInputContainer: {
        position: 'relative'
    },
    noteInput: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        paddingLeft: Spacing.xl + 8,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 100,
        textAlignVertical: 'top'
    },
    noteIcon: {
        position: 'absolute',
        left: Spacing.md,
        top: Spacing.md
    },

    // Modal Actions
    modalActions: {
        flexDirection: 'row',
        padding: Spacing.lg,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '20',
        backgroundColor: Colors.surface
    },
    actionButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border
    },
    cancelButtonText: {
        color: Colors.text,
        fontWeight: '700',
        fontSize: 15
    },
    saveButton: {
        backgroundColor: Colors.primary,
        ...Shadows.sm
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15
    },

    // FAB
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.lg
    }
});

export default ExpenseManagerScreen;