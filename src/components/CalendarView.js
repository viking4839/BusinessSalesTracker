import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    Modal,
    Animated,
} from 'react-native';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Calendar as CalendarIcon,
    Clock,
    AlertCircle,
    CheckCircle,
    Circle
} from 'lucide-react-native';
import { Colors, Spacing, Shadows, Fonts } from '../styles/Theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAllCategories } from '../utils/ReminderCategories';

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - (Spacing.xl * 2)) / 7;

const CalendarView = ({ reminders, onDatePress, onAddReminder }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [tempDate, setTempDate] = useState(new Date());
    const [dateAnimation] = useState(new Animated.Value(0));
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showCategorySelect, setShowCategorySelect] = useState(false);

    const categories = getAllCategories();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get reminders for a specific date with category colors
    const getRemindersForDate = (date) => {
        return reminders.filter(reminder => {
            const reminderDate = new Date(reminder.timestamp);
            return (
                reminderDate.getDate() === date.getDate() &&
                reminderDate.getMonth() === date.getMonth() &&
                reminderDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Get calendar days for current month
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();

        // Last day of month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Previous month's last days
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const days = [];

        // Add previous month's trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonthLastDay - i);
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date,
                dayOfWeek: date.getDay(),
                reminders: getRemindersForDate(date),
            });
        }

        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            days.push({
                day,
                isCurrentMonth: true,
                date,
                dayOfWeek: date.getDay(),
                reminders: getRemindersForDate(date),
            });
        }

        // Add next month's leading days
        const remainingCells = 42 - days.length;
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(year, month + 1, day);
            days.push({
                day,
                isCurrentMonth: false,
                date,
                dayOfWeek: date.getDay(),
                reminders: getRemindersForDate(date),
            });
        }

        return days;
    };

    const goToPreviousMonth = () => {
        animateCalendar();
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        animateCalendar();
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        animateCalendar();
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const goToDate = (date) => {
        animateCalendar();
        setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
        setSelectedDate(date);
    };

    const isToday = (date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (date) => {
        if (!selectedDate) return false;
        return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
        );
    };

    const handleDayPress = (dateInfo) => {
        setSelectedDate(dateInfo.date);
        animateDayPress();

        if (dateInfo.reminders.length > 0) {
            onDatePress && onDatePress(dateInfo.date, dateInfo.reminders);
        } else {
            setShowAddModal(true);
        }
    };

    const handleDatePickerPress = () => {
        setPickerMode('date');
        setTempDate(selectedDate || new Date());
        setShowDatePicker(true);
    };

    const handleDatePickerChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            goToDate(date);
            setShowAddModal(true);
        }
    };

    const animateCalendar = () => {
        dateAnimation.setValue(0);
        Animated.spring(dateAnimation, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const animateDayPress = () => {
        Animated.sequence([
            Animated.spring(dateAnimation, {
                toValue: 0.95,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.spring(dateAnimation, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleAddReminder = () => {
        setShowCategorySelect(true);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setShowCategorySelect(false);
        if (onAddReminder && selectedDate) {
            onAddReminder(selectedDate, category);
        }
        setShowAddModal(false);
    };

    const renderReminderIndicators = (reminders) => {
        if (reminders.length === 0) return null;

        // Group reminders by category
        const categoryGroups = {};
        reminders.forEach(reminder => {
            if (!categoryGroups[reminder.category]) {
                categoryGroups[reminder.category] = {
                    count: 0,
                    color: reminder.categoryColor,
                    overdue: false
                };
            }
            categoryGroups[reminder.category].count++;
            if (reminder.status === 'overdue') {
                categoryGroups[reminder.category].overdue = true;
            }
        });

        const groups = Object.values(categoryGroups);

        return (
            <View style={styles.indicatorsContainer}>
                {groups.slice(0, 4).map((group, index) => (
                    <View
                        key={index}
                        style={[
                            styles.reminderIndicator,
                            {
                                backgroundColor: group.overdue ? Colors.error : group.color,
                                transform: [{ translateX: index * -2 }]
                            }
                        ]}
                    />
                ))}
                {groups.length > 4 && (
                    <Text style={styles.moreIndicator}>+{groups.length - 4}</Text>
                )}
            </View>
        );
    };

    const calendarDays = getCalendarDays();
    const scaleAnimation = dateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1]
    });

    return (
        <View style={styles.container}>
            {/* Calendar Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={goToPreviousMonth}
                    >
                        <ChevronLeft size={28} color={Colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.monthContainer}
                        onPress={handleDatePickerPress}
                        activeOpacity={0.7}
                    >
                        <CalendarIcon size={20} color={Colors.primary} />
                        <Text style={styles.monthYear}>
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </Text>
                        <ChevronRight size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navButton}
                        onPress={goToNextMonth}
                    >
                        <ChevronRight size={28} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Today Button */}
                <TouchableOpacity
                    style={styles.todayButton}
                    onPress={goToToday}
                >
                    <Text style={styles.todayButtonText}>Today</Text>
                </TouchableOpacity>
            </View>

            {/* Day Names */}
            <View style={styles.dayNamesRow}>
                {dayNames.map((day, index) => (
                    <View key={index} style={styles.dayNameCell}>
                        <Text style={[
                            styles.dayNameText,
                            index === 0 && styles.sundayText,
                            index === 6 && styles.saturdayText
                        ]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <Animated.View
                style={[
                    styles.calendarGrid,
                    { transform: [{ scale: scaleAnimation }] }
                ]}
            >
                {calendarDays.map((dateInfo, index) => {
                    const isCurrentDay = isToday(dateInfo.date);
                    const isSelectedDay = isSelected(dateInfo.date);
                    const hasReminders = dateInfo.reminders.length > 0;
                    const isWeekend = dateInfo.dayOfWeek === 0 || dateInfo.dayOfWeek === 6;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                isWeekend && styles.weekendCell,
                                isCurrentDay && styles.todayCell,
                                isSelectedDay && styles.selectedCell,
                                !dateInfo.isCurrentMonth && styles.otherMonthCell,
                            ]}
                            onPress={() => handleDayPress(dateInfo)}
                            activeOpacity={0.6}
                        >
                            <View style={styles.dayNumberContainer}>
                                <Text style={[
                                    styles.dayNumber,
                                    !dateInfo.isCurrentMonth && styles.otherMonthText,
                                    isWeekend && styles.weekendText,
                                    isCurrentDay && styles.todayText,
                                    isSelectedDay && styles.selectedText,
                                ]}>
                                    {dateInfo.day}
                                </Text>

                                {isCurrentDay && !isSelectedDay && (
                                    <View style={styles.todayDot} />
                                )}
                            </View>

                            {/* Reminder Indicators */}
                            {hasReminders && renderReminderIndicators(dateInfo.reminders)}
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>

            {/* Selected Date Info */}
            {selectedDate && (
                <View style={styles.selectedDateCard}>
                    <View style={styles.selectedDateHeader}>
                        <View style={styles.dateInfo}>
                            <Text style={styles.selectedDateTitle}>
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                            <Text style={styles.selectedDateYear}>
                                {selectedDate.getFullYear()}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addReminderButton}
                            onPress={handleAddReminder}
                        >
                            <Plus size={18} color={Colors.surface} />
                            <Text style={styles.addReminderText}>Add Reminder</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.remindersPreview}>
                        {getRemindersForDate(selectedDate).length > 0 ? (
                            <>
                                <Text style={styles.remindersCount}>
                                    {getRemindersForDate(selectedDate).length} reminder(s)
                                </Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.remindersList}
                                >
                                    {getRemindersForDate(selectedDate).slice(0, 3).map((reminder, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.reminderChip,
                                                { backgroundColor: reminder.categoryColor + '20', borderColor: reminder.categoryColor }
                                            ]}
                                        >
                                            <Text style={[styles.reminderChipText, { color: reminder.categoryColor }]}>
                                                {reminder.title}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        ) : (
                            <View style={styles.noReminders}>
                                <Clock size={20} color={Colors.textLight} />
                                <Text style={styles.noRemindersText}>
                                    No reminders scheduled
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.pickerModal}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(false)}
                                style={styles.pickerClose}
                            >
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={tempDate}
                            mode={pickerMode}
                            display="spinner"
                            onChange={handleDatePickerChange}
                            textColor={Colors.text}
                            minimumDate={new Date(2020, 0, 1)}
                            maximumDate={new Date(2030, 11, 31)}
                            style={styles.datePicker}
                        />
                        <View style={styles.pickerActions}>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.pickerButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pickerButton, styles.pickerButtonPrimary]}
                                onPress={() => {
                                    goToDate(tempDate);
                                    setShowDatePicker(false);
                                    setShowAddModal(true);
                                }}
                            >
                                <Text style={[styles.pickerButtonText, styles.pickerButtonTextPrimary]}>
                                    Go to Date
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Category Selection Modal */}
            <Modal
                visible={showCategorySelect}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategorySelect(false)}
            >
                <View style={styles.categoryModal}>
                    <View style={styles.categoryContainer}>
                        <View style={styles.categoryHeader}>
                            <Text style={styles.categoryTitle}>
                                Select Category
                            </Text>
                            <Text style={styles.categorySubtitle}>
                                Choose a category for your reminder
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowCategorySelect(false)}
                                style={styles.categoryClose}
                            >
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.categoriesList}
                            showsVerticalScrollIndicator={false}
                        >
                            {categories.map((category) => {
                                const IconComponent = category.icon;
                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryOption,
                                            { borderLeftColor: category.color }
                                        ]}
                                        onPress={() => handleCategorySelect(category.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.categoryIconContainer,
                                            { backgroundColor: category.color + '20' }
                                        ]}>
                                            <IconComponent size={20} color={category.color} />
                                        </View>
                                        <View style={styles.categoryInfo}>
                                            <Text style={styles.categoryName}>
                                                {category.name}
                                            </Text>
                                            <Text style={styles.categoryDescription}>
                                                {category.description}
                                            </Text>
                                        </View>
                                        <ChevronRight size={18} color={Colors.textLight} />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.categoryActions}>
                            <TouchableOpacity
                                style={styles.categoryCancel}
                                onPress={() => setShowCategorySelect(false)}
                            >
                                <Text style={styles.categoryCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Reminder Modal (Quick prompt) */}
            {showAddModal && selectedDate && (
                <Modal
                    visible={showAddModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowAddModal(false)}
                >
                    <View style={styles.addModal}>
                        <View style={styles.addModalContent}>
                            <View style={styles.addModalHeader}>
                                <Text style={styles.addModalTitle}>Quick Add Reminder</Text>
                                <Text style={styles.addModalSubtitle}>
                                    {selectedDate.toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.addModalButton}
                                onPress={() => {
                                    setShowAddModal(false);
                                    setShowCategorySelect(true);
                                }}
                            >
                                <Plus size={20} color={Colors.primary} />
                                <Text style={styles.addModalButtonText}>
                                    Choose Category
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.addModalCancel}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={styles.addModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: Spacing.lg,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        ...Shadows.lg,
    },
    header: {
        marginBottom: Spacing.lg,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    monthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.background,
        borderRadius: 16,
        ...Shadows.sm,
    },
    monthYear: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        fontFamily: Fonts.bold,
    },
    todayButton: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
    },
    todayButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Fonts.semiBold,
    },
    dayNamesRow: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
        paddingHorizontal: 2,
    },
    dayNameCell: {
        width: CELL_WIDTH,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    dayNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        fontFamily: Fonts.medium,
        letterSpacing: 0.5,
    },
    sundayText: {
        color: Colors.error,
    },
    saturdayText: {
        color: Colors.primary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 8,
        ...Shadows.sm,
    },
    dayCell: {
        width: CELL_WIDTH,
        height: CELL_WIDTH * 1.2,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        borderRadius: 12,
        margin: 2,
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: 'transparent',
        ...Shadows.xs,
    },
    weekendCell: {
        backgroundColor: Colors.background,
    },
    todayCell: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    selectedCell: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    otherMonthCell: {
        backgroundColor: Colors.background + '80',
    },
    dayNumberContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        fontFamily: Fonts.semiBold,
    },
    weekendText: {
        color: Colors.textSecondary,
    },
    otherMonthText: {
        color: Colors.textLight,
        opacity: 0.5,
    },
    todayText: {
        color: Colors.primary,
        fontWeight: '800',
    },
    selectedText: {
        color: Colors.surface,
        fontWeight: '800',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
        marginTop: 2,
    },
    indicatorsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 2,
        maxWidth: CELL_WIDTH - 16,
    },
    reminderIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 1,
    },
    moreIndicator: {
        fontSize: 9,
        fontWeight: '800',
        color: Colors.textSecondary,
        marginLeft: 2,
    },
    selectedDateCard: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.background,
        borderRadius: 20,
        padding: Spacing.lg,
        ...Shadows.md,
    },
    selectedDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    dateInfo: {
        flex: 1,
    },
    selectedDateTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        fontFamily: Fonts.bold,
        marginBottom: 2,
    },
    selectedDateYear: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.medium,
    },
    addReminderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 12,
        gap: Spacing.xs,
        ...Shadows.sm,
    },
    addReminderText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.surface,
        fontFamily: Fonts.semiBold,
    },
    remindersPreview: {
        minHeight: 60,
    },
    remindersCount: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        fontFamily: Fonts.medium,
    },
    remindersList: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    reminderChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: Spacing.xs,
    },
    reminderChipText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    noReminders: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    noRemindersText: {
        fontSize: 14,
        color: Colors.textLight,
        fontFamily: Fonts.regular,
    },
    pickerModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        width: width * 0.9,
        maxHeight: '80%',
        padding: Spacing.lg,
        ...Shadows.lg,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    pickerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        fontFamily: Fonts.bold,
    },
    pickerClose: {
        padding: Spacing.xs,
    },
    datePicker: {
        height: 200,
        marginBottom: Spacing.lg,
    },
    pickerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    pickerButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: 12,
    },
    pickerButtonPrimary: {
        backgroundColor: Colors.primary,
    },
    pickerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        fontFamily: Fonts.semiBold,
    },
    pickerButtonTextPrimary: {
        color: Colors.surface,
    },
    categoryModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    categoryContainer: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: Spacing.xl,
    },
    categoryHeader: {
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        position: 'relative',
    },
    categoryTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
    },
    categoryClose: {
        position: 'absolute',
        top: Spacing.lg,
        right: Spacing.lg,
        padding: Spacing.xs,
    },
    categoriesList: {
        padding: Spacing.lg,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 4,
        gap: Spacing.md,
        ...Shadows.sm,
    },
    categoryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        fontFamily: Fonts.semiBold,
        marginBottom: 2,
    },
    categoryDescription: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
    },
    categoryActions: {
        padding: Spacing.lg,
        paddingTop: 0,
    },
    categoryCancel: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    categoryCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        fontFamily: Fonts.semiBold,
    },
    addModal: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addModalContent: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        width: width * 0.8,
        padding: Spacing.xl,
        ...Shadows.lg,
    },
    addModalHeader: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    addModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    addModalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
    },
    addModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary + '15',
        padding: Spacing.lg,
        borderRadius: 16,
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    addModalButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
        fontFamily: Fonts.semiBold,
    },
    addModalCancel: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    addModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
    },
});

export default CalendarView;