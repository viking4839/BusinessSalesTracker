import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
    Platform,
} from 'react-native';
import {
    ArrowLeft,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    Calendar,
    User,
    Phone,
    DollarSign,
    FileText,
    Package,
    Building,
    Truck,
    MapPin,
    MoreVertical,
} from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../styles/Theme';
import ReminderStorage from '../utils/ReminderStorage';
import { formatReminderData, getCategoryIcon, getCategoryColor } from '../utils/ReminderCategories';
import NotificationService from '../services/NotificationService';

const ReminderDetailScreen = ({ route, navigation }) => {
    const { reminderId } = route.params;
    const [reminder, setReminder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReminder();
    }, [reminderId]);

    const loadReminder = async () => {
        try {
            const reminders = await ReminderStorage.loadReminders();
            const found = reminders.find(r => r.id === reminderId);
            setReminder(found);
        } catch (error) {
            console.error('Error loading reminder:', error);
            Alert.alert('Error', 'Failed to load reminder');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async () => {
        Alert.alert(
            'Mark as Completed',
            'Mark this reminder as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        try {
                            await ReminderStorage.markAsCompleted(reminderId);

                            // Cancel notification
                            if (reminder.notificationId) {
                                await NotificationService.cancelReminder(reminder.notificationId);
                            }

                            Alert.alert('Success', 'Reminder marked as completed', [
                                {
                                    text: 'OK',
                                    onPress: () => navigation.goBack()
                                }
                            ]);
                        } catch (error) {
                            console.error('Error completing reminder:', error);
                            Alert.alert('Error', 'Failed to complete reminder');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Cancel notification
                            if (reminder.notificationId) {
                                await NotificationService.cancelReminder(reminder.notificationId);
                            }

                            await ReminderStorage.deleteReminder(reminderId);
                            Alert.alert('Success', 'Reminder deleted', [
                                {
                                    text: 'OK',
                                    onPress: () => navigation.goBack()
                                }
                            ]);
                        } catch (error) {
                            console.error('Error deleting reminder:', error);
                            Alert.alert('Error', 'Failed to delete reminder');
                        }
                    }
                }
            ]
        );
    };

    const handleReactivate = async () => {
        Alert.alert(
            'Reactivate Reminder',
            'Reactivate this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reactivate',
                    onPress: async () => {
                        try {
                            await ReminderStorage.markAsActive(reminderId);

                            // Reschedule notification
                            const updatedReminders = await ReminderStorage.loadReminders();
                            const updatedReminder = updatedReminders.find(r => r.id === reminderId);
                            if (updatedReminder) {
                                await NotificationService.scheduleReminder(updatedReminder);
                            }

                            loadReminder();
                            Alert.alert('Success', 'Reminder reactivated');
                        } catch (error) {
                            console.error('Error reactivating reminder:', error);
                            Alert.alert('Error', 'Failed to reactivate reminder');
                        }
                    }
                }
            ]
        );
    };

    const renderDataField = (label, value, icon) => {
        if (!value) return null;

        return (
            <View style={styles.dataField}>
                <View style={styles.dataIcon}>
                    {icon}
                </View>
                <View style={styles.dataContent}>
                    <Text style={styles.dataLabel}>{label}</Text>
                    <Text style={styles.dataValue}>{value}</Text>
                </View>
            </View>
        );
    };

    const renderReminderData = () => {
        if (!reminder || !reminder.data) return null;

        const data = reminder.data;

        switch (reminder.category) {
            case 'cheque':
                return (
                    <>
                        {renderDataField('Type', data.chequeType, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Person/Business', data.personName, <User size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Amount', data.amount ? `Ksh ${Number(data.amount).toLocaleString()}` : null, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Bank', data.bankName, <Building size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Cheque Number', data.chequeNumber, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            case 'delivery':
                return (
                    <>
                        {renderDataField('Supplier', data.supplierName, <User size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Items Expected', data.itemsExpected, <Package size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Delivery Fee', data.deliveryFee ? `Ksh ${Number(data.deliveryFee).toLocaleString()}` : null, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Driver Contact', data.driverContact, <Phone size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Tracking Number', data.trackingNumber, <MapPin size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            case 'customer':
                return (
                    <>
                        {renderDataField('Customer Name', data.customerName, <User size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Phone Number', data.phoneNumber, <Phone size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Follow-up Reason', data.followUpReason, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Last Contact', data.lastContact ? new Date(data.lastContact).toLocaleDateString() : null, <Calendar size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Order Details', data.orderDetails, <Package size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            case 'supplier':
                return (
                    <>
                        {renderDataField('Supplier Name', data.supplierName, <User size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Amount Due', data.amountDue ? `Ksh ${Number(data.amountDue).toLocaleString()}` : null, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Invoice Number', data.invoiceNumber, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Payment Method', data.paymentMethod, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Account/Reference', data.accountNumber, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            case 'inventory':
                return (
                    <>
                        {renderDataField('Item', data.inventoryItemName, <Package size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Quantity Needed', data.quantityNeeded, <Package size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Supplier', data.supplierName, <User size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Estimated Cost', data.estimatedCost ? `Ksh ${Number(data.estimatedCost).toLocaleString()}` : null, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Urgency', data.urgency, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            case 'financial':
                return (
                    <>
                        {renderDataField('Type', data.financialType, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Institution/Department', data.institution, <Building size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Amount', data.amount ? `Ksh ${Number(data.amount).toLocaleString()}` : null, <DollarSign size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Reference Number', data.referenceNumber, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Documents Required', data.documentRequired, <FileText size={18} color={Colors.textSecondary} />)}
                        {renderDataField('Notes', data.notes, <FileText size={18} color={Colors.textSecondary} />)}
                    </>
                );

            default:
                return null;
        }
    };

    if (loading || !reminder) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={24} color={Colors.surface} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reminder Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </View>
        );
    }

    const isOverdue = reminder.status === 'overdue';
    const isCompleted = reminder.status === 'completed';
    const categoryColor = getCategoryColor(reminder.category);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: categoryColor }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{reminder.categoryName}</Text>
                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => {
                        Alert.alert(
                            'Options',
                            '',
                            [
                                !isCompleted && {
                                    text: 'Mark as Complete',
                                    onPress: handleComplete
                                },
                                isCompleted && {
                                    text: 'Reactivate',
                                    onPress: handleReactivate
                                },
                                {
                                    text: 'Delete',
                                    onPress: handleDelete,
                                    style: 'destructive'
                                },
                                {
                                    text: 'Cancel',
                                    style: 'cancel'
                                }
                            ].filter(Boolean)
                        );
                    }}
                >
                    <MoreVertical size={24} color={Colors.surface} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                {(isOverdue || isCompleted) && (
                    <View style={styles.statusBanner}>
                        {isCompleted ? (
                            <>
                                <CheckCircle size={18} color={Colors.success} />
                                <Text style={[styles.statusText, { color: Colors.success }]}>
                                    Completed
                                </Text>
                            </>
                        ) : isOverdue ? (
                            <>
                                <Clock size={18} color={Colors.error} />
                                <Text style={[styles.statusText, { color: Colors.error }]}>
                                    Overdue
                                </Text>
                            </>
                        ) : null}
                    </View>
                )}

                {/* Title */}
                <View style={styles.titleSection}>
                    <Text style={[
                        styles.title,
                        isCompleted && styles.titleCompleted
                    ]}>
                        {reminder.title}
                    </Text>
                </View>

                {/* Date & Time */}
                <View style={styles.dateTimeCard}>
                    <View style={styles.dateTimeRow}>
                        <Calendar size={20} color={categoryColor} />
                        <View style={styles.dateTimeContent}>
                            <Text style={styles.dateTimeLabel}>Date</Text>
                            <Text style={styles.dateTimeValue}>
                                {new Date(reminder.timestamp).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.dateTimeRow}>
                        <Clock size={20} color={categoryColor} />
                        <View style={styles.dateTimeContent}>
                            <Text style={styles.dateTimeLabel}>Time</Text>
                            <Text style={styles.dateTimeValue}>
                                {new Date(reminder.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Reminder Details */}
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    {renderReminderData()}
                </View>

                {/* Completed Info */}
                {isCompleted && reminder.completedAt && (
                    <View style={styles.completedCard}>
                        <CheckCircle size={18} color={Colors.success} />
                        <Text style={styles.completedText}>
                            Completed on {new Date(reminder.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Buttons */}
            {!isCompleted && (
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDelete}
                    >
                        <Trash2 size={20} color={Colors.error} />
                        <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                            Delete
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, { backgroundColor: categoryColor }]}
                        onPress={handleComplete}
                    >
                        <CheckCircle size={20} color={Colors.surface} />
                        <Text style={styles.completeButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.surface,
        textAlign: 'center',
    },
    moreButton: {
        padding: Spacing.xs,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        ...Shadows.sm,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '700',
    },
    titleSection: {
        padding: Spacing.md,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.text,
    },
    titleCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.textSecondary,
    },
    dateTimeCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        borderRadius: 16,
        padding: Spacing.md,
        ...Shadows.md,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    dateTimeContent: {
        flex: 1,
    },
    dateTimeLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    dateTimeValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    detailsSection: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        borderRadius: 16,
        padding: Spacing.md,
        ...Shadows.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    dataField: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    dataIcon: {
        marginRight: Spacing.sm,
        paddingTop: 2,
    },
    dataContent: {
        flex: 1,
    },
    dataLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    dataValue: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    completedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.success + '15',
        marginHorizontal: Spacing.md,
        padding: Spacing.md,
        borderRadius: 12,
    },
    completedText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.success,
    },
    actionBar: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...Shadows.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        borderRadius: 12,
    },
    deleteButton: {
        backgroundColor: Colors.error + '15',
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    completeButton: {
        flex: 2,
    },
    completeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
});

export default ReminderDetailScreen;