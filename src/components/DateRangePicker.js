import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../styles/Theme';

const { width } = Dimensions.get('window');

const DateRangePicker = ({
    visible,
    onClose,
    onSelectDate,
    onSelectRange,
    selectedDate,
    startDate,
    endDate,
    mode = 'single' // 'single' or 'range'
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);
    const [selectingEnd, setSelectingEnd] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];

        // Add empty slots for days before the first day of month
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const navigateMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const isDateSelected = (date) => {
        if (!date) return false;
        const dateString = date.toISOString().split('T')[0];

        if (mode === 'single') {
            return selectedDate === dateString;
        } else {
            if (tempStartDate && tempEndDate) {
                return dateString >= tempStartDate && dateString <= tempEndDate;
            }
            return dateString === tempStartDate || dateString === tempEndDate;
        }
    };

    const isStartDate = (date) => {
        if (!date || !tempStartDate) return false;
        return date.toISOString().split('T')[0] === tempStartDate;
    };

    const isEndDate = (date) => {
        if (!date || !tempEndDate) return false;
        return date.toISOString().split('T')[0] === tempEndDate;
    };

    const isToday = (date) => {
        if (!date) return false;
        const today = new Date().toISOString().split('T')[0];
        return date.toISOString().split('T')[0] === today;
    };

    const isFutureDate = (date) => {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    };

    const handleDatePress = (date) => {
        if (!date || isFutureDate(date)) return;

        const dateString = date.toISOString().split('T')[0];

        if (mode === 'single') {
            onSelectDate(dateString);
            onClose();
        } else {
            if (!tempStartDate || (tempStartDate && tempEndDate)) {
                // Start new selection
                setTempStartDate(dateString);
                setTempEndDate(null);
                setSelectingEnd(true);
            } else if (selectingEnd) {
                // Set end date
                if (dateString < tempStartDate) {
                    setTempEndDate(tempStartDate);
                    setTempStartDate(dateString);
                } else {
                    setTempEndDate(dateString);
                }
                setSelectingEnd(false);
            }
        }
    };

    const handleApplyRange = () => {
        if (tempStartDate && tempEndDate) {
            onSelectRange(tempStartDate, tempEndDate);
            onClose();
        } else if (tempStartDate) {
            onSelectRange(tempStartDate, tempStartDate);
            onClose();
        }
    };

    const handleQuickSelect = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const startString = start.toISOString().split('T')[0];
        const endString = end.toISOString().split('T')[0];

        if (mode === 'single') {
            onSelectDate(endString);
            onClose();
        } else {
            setTempStartDate(startString);
            setTempEndDate(endString);
        }
    };

    const handleSelectMonth = (monthOffset) => {
        const now = new Date();
        const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);

        const startString = targetMonth.toISOString().split('T')[0];
        const endString = monthOffset === 0
            ? now.toISOString().split('T')[0]
            : lastDay.toISOString().split('T')[0];

        if (mode === 'range') {
            setTempStartDate(startString);
            setTempEndDate(endString);
        }
    };

    const days = getDaysInMonth(currentMonth);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {mode === 'single' ? 'Select Date' : 'Select Date Range'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Select Options */}
                    <View style={styles.quickSelect}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={styles.quickSelectButton}
                                onPress={() => handleQuickSelect(0)}
                            >
                                <Text style={styles.quickSelectText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickSelectButton}
                                onPress={() => handleQuickSelect(6)}
                            >
                                <Text style={styles.quickSelectText}>Last 7 Days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickSelectButton}
                                onPress={() => handleQuickSelect(29)}
                            >
                                <Text style={styles.quickSelectText}>Last 30 Days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickSelectButton}
                                onPress={() => handleSelectMonth(0)}
                            >
                                <Text style={styles.quickSelectText}>This Month</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickSelectButton}
                                onPress={() => handleSelectMonth(-1)}
                            >
                                <Text style={styles.quickSelectText}>Last Month</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Month Navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                            <ChevronLeft size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                            <ChevronRight size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Days of Week Header */}
                    <View style={styles.weekHeader}>
                        {daysOfWeek.map(day => (
                            <Text key={day} style={styles.weekDay}>{day}</Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                        {days.map((date, index) => {
                            const isSelected = isDateSelected(date);
                            const isStart = isStartDate(date);
                            const isEnd = isEndDate(date);
                            const today = isToday(date);
                            const future = isFutureDate(date);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.dayButton,
                                        isSelected && styles.dayButtonSelected,
                                        isStart && styles.dayButtonStart,
                                        isEnd && styles.dayButtonEnd,
                                        today && !isSelected && styles.dayButtonToday,
                                        future && styles.dayButtonDisabled,
                                    ]}
                                    onPress={() => handleDatePress(date)}
                                    disabled={future || !date}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isSelected && styles.dayTextSelected,
                                        today && !isSelected && styles.dayTextToday,
                                        future && styles.dayTextDisabled,
                                    ]}>
                                        {date ? date.getDate() : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected Range Display */}
                    {mode === 'range' && (tempStartDate || tempEndDate) && (
                        <View style={styles.selectedRange}>
                            <View style={styles.selectedDateBox}>
                                <Text style={styles.selectedDateLabel}>From</Text>
                                <Text style={styles.selectedDateValue}>
                                    {tempStartDate ? new Date(tempStartDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }) : 'Select'}
                                </Text>
                            </View>
                            <View style={styles.rangeDivider}>
                                <View style={styles.rangeLine} />
                            </View>
                            <View style={styles.selectedDateBox}>
                                <Text style={styles.selectedDateLabel}>To</Text>
                                <Text style={styles.selectedDateValue}>
                                    {tempEndDate ? new Date(tempEndDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }) : 'Select'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Apply Button for Range Mode */}
                    {mode === 'range' && (
                        <TouchableOpacity
                            style={[
                                styles.applyButton,
                                (!tempStartDate) && styles.applyButtonDisabled
                            ]}
                            onPress={handleApplyRange}
                            disabled={!tempStartDate}
                        >
                            <Check size={20} color={Colors.surface} />
                            <Text style={styles.applyButtonText}>Apply Date Range</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Spacing.xl,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    quickSelect: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    quickSelectButton: {
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        marginRight: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickSelectText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    navButton: {
        padding: Spacing.sm,
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },
    weekHeader: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    weekDay: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.md,
    },
    dayButton: {
        width: (width - Spacing.md * 2) / 7,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    dayButtonSelected: {
        backgroundColor: Colors.primary,
    },
    dayButtonStart: {
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    dayButtonEnd: {
        backgroundColor: Colors.primary,
        borderTopRightRadius: 22,
        borderBottomRightRadius: 22,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
    },
    dayButtonToday: {
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    dayButtonDisabled: {
        opacity: 0.3,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    dayTextSelected: {
        color: Colors.surface,
    },
    dayTextToday: {
        color: Colors.primary,
    },
    dayTextDisabled: {
        color: Colors.textLight,
    },
    selectedRange: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background,
        marginHorizontal: Spacing.md,
        borderRadius: 12,
        marginTop: Spacing.md,
    },
    selectedDateBox: {
        flex: 1,
    },
    selectedDateLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: 2,
    },
    selectedDateValue: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '700',
    },
    rangeDivider: {
        paddingHorizontal: Spacing.md,
    },
    rangeLine: {
        width: 20,
        height: 2,
        backgroundColor: Colors.primary,
    },
    applyButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        ...Shadows.md,
    },
    applyButtonDisabled: {
        backgroundColor: Colors.textLight,
    },
    applyButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.surface,
    },
});

export default DateRangePicker;