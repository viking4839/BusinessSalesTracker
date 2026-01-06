import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import {
    Clock,
    Calendar,
    CheckCircle,
    MoreVertical,
    Edit,
    Trash2,
    RotateCcw,
    Banknote,
    Truck,
    UserCheck,
    PackageCheck,
    Package,
    Landmark,
} from 'lucide-react-native';
import { getCategoryIcon } from '../utils/ReminderCategories';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { formatReminderData } from '../utils/ReminderCategories';

const ReminderCard = ({ reminder, onPress, onComplete, onDelete, onReactivate, onEdit }) => {
    const isOverdue = reminder.status === 'overdue';
    const isCompleted = reminder.status === 'completed';
    const isToday = reminder.status === 'active' && isDateToday(new Date(reminder.timestamp));

    const handleLongPress = () => {
        const options = [];

        if (!isCompleted) {
            options.push({
                text: 'Mark as Done',
                onPress: () => handleComplete(),
            });
        }

        if (isCompleted) {
            options.push({
                text: 'Reactivate',
                onPress: () => handleReactivate(),
            });
        }

        if (!isCompleted) {
            options.push({
                text: 'Edit',
                onPress: () => onEdit && onEdit(reminder),
            });
        }

        options.push({
            text: 'Delete',
            onPress: () => handleDelete(),
            style: 'destructive',
        });

        options.push({
            text: 'Cancel',
            style: 'cancel',
        });

        Alert.alert('Reminder Actions', '', options);
    };

    const renderCategoryIcon = () => {
        const iconName = getCategoryIcon(reminder.category);
        const iconMap = {
            Banknote: Banknote,
            Truck: Truck,
            UserCheck: UserCheck,
            PackageCheck: PackageCheck,
            Package: Package,
            Landmark: Landmark,
        };
        const IconComponent = iconMap[iconName] || Package;
        return <IconComponent size={14} color={Colors.text} />;
    };

    const handleComplete = () => {
        Alert.alert(
            'Mark as Done',
            'Mark this reminder as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: () => onComplete && onComplete(reminder.id)
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete && onDelete(reminder.id)
                },
            ]
        );
    };

    const handleReactivate = () => {
        Alert.alert(
            'Reactivate Reminder',
            'Reactivate this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reactivate',
                    onPress: () => onReactivate && onReactivate(reminder.id)
                },
            ]
        );
    };

    const formatDateTime = () => {
        try {
            const date = new Date(reminder.timestamp);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let dateStr = '';

            if (isDateToday(date)) {
                dateStr = 'Today';
            } else if (isSameDay(date, tomorrow)) {
                dateStr = 'Tomorrow';
            } else {
                dateStr = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            }

            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            return `${dateStr}, ${timeStr}`;
        } catch (e) {
            return 'Invalid date';
        }
    };

    const getStatusColor = () => {
        if (isCompleted) return Colors.success;
        if (isOverdue) return Colors.error;
        if (isToday) return Colors.primary;
        return Colors.textSecondary;
    };

    const getCardStyle = () => {
        if (isCompleted) {
            return [styles.card, styles.cardCompleted];
        }
        if (isOverdue) {
            return [styles.card, styles.cardOverdue];
        }
        if (isToday) {
            return [styles.card, styles.cardToday];
        }
        return styles.card;
    };

    const formattedData = formatReminderData(reminder);

    return (
        <TouchableOpacity
            style={getCardStyle()}
            onPress={() => onPress && onPress(reminder)}  // ← Pass reminder
            onLongPress={handleLongPress}
            activeOpacity={0.7}
        >
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                    {renderCategoryIcon()}
                    <Text style={styles.categoryName}>{reminder.categoryName}</Text>
                </View>

                {isCompleted && (
                    <View style={styles.completedBadge}>
                        <CheckCircle size={14} color={Colors.success} />
                        <Text style={styles.completedText}>Done</Text>
                    </View>
                )}

                {isOverdue && !isCompleted && (
                    <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>Overdue</Text>
                    </View>
                )}
            </View>

            {/* Title */}
            <Text style={[
                styles.title,
                isCompleted && styles.titleCompleted
            ]} numberOfLines={2}>
                {reminder.title}
            </Text>

            {/* Details */}
            {formattedData && (
                <Text style={[
                    styles.details,
                    isCompleted && styles.detailsCompleted
                ]} numberOfLines={2}>
                    {formattedData}
                </Text>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
                <View style={styles.dateTimeContainer}>
                    <Clock size={14} color={getStatusColor()} />
                    <Text style={[
                        styles.dateTimeText,
                        { color: getStatusColor() }
                    ]}>
                        {formatDateTime()}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={handleLongPress}
                >
                    <MoreVertical size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Completed At Info */}
            {isCompleted && reminder.completedAt && (
                <View style={styles.completedInfo}>
                    <CheckCircle size={12} color={Colors.success} />
                    <Text style={styles.completedInfoText}>
                        Completed {formatCompletedDate(reminder.completedAt)}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// Helper functions
const isDateToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
};

const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
};

const formatCompletedDate = (dateString) => {
    try {
        const date = new Date(dateString);
        const today = new Date();

        if (isDateToday(date)) {
            return 'today';
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (isSameDay(date, yesterday)) {
            return 'yesterday';
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return '';
    }
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.md,
    },
    cardToday: {
        borderColor: Colors.primary,
        borderWidth: 2,
        backgroundColor: Colors.surface,
        ...Shadows.lg,
    },
    cardOverdue: {
        borderColor: Colors.error,
        borderWidth: 2,
        backgroundColor: Colors.surface,
        ...Shadows.lg,
    },
    cardCompleted: {
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        opacity: 0.8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '12',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },

    categoryName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.primary,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.success + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
    },
    completedText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.success,
    },
    overdueBadge: {
        backgroundColor: Colors.error + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 10,
    },
    overdueText: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.error,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
        lineHeight: 24,
    },
    titleCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.textSecondary,
    },
    details: {
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: Spacing.md,
        lineHeight: 22,
    },
    detailsCompleted: {
        color: Colors.textLight,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
    },
    dateTimeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    moreButton: {
        padding: 4,
    },
    completedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    completedInfoText: {
        fontSize: 12,
        color: Colors.success,
        fontWeight: '500',
    },
});

export default ReminderCard;