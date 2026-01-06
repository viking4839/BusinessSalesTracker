/// BusinessRemindersScreen.js - Fixed Calendar Date Issue
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
    StatusBar,
    RefreshControl,
    Dimensions,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    ArrowLeft,
    Plus,
    Search,
    X,
    Calendar,
    List,
    AlertTriangle,
    CheckCircle,
    CreditCard,
    Truck,
    UserCheck,
    PackageCheck,
    Package,
    Landmark,
    Clock,
    Edit,
    Trash2,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    User,
    Phone,
    DollarSign,
    FileText,
    Building,
    MapPin,
} from 'lucide-react-native';

// ===== CONSTANTS & CONFIGURATION =====
const { width } = Dimensions.get('window');
const REMINDERS_KEY = '@business_reminders';
const COLORS = {
    primary: '#10B981',
    primaryLight: '#D1FAE5',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
};

const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

// Categories Configuration
const CATEGORIES = {
    cheque: {
        id: 'cheque',
        name: 'Cheque',
        icon: CreditCard,
        color: '#10B981',
        fields: [
            { name: 'chequeType', label: 'Type', type: 'select', options: ['Collection', 'Handout'], required: true },
            { name: 'personName', label: 'Person/Business', type: 'text', required: true },
            { name: 'amount', label: 'Amount (Ksh)', type: 'number', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: false },
            { name: 'chequeNumber', label: 'Cheque Number', type: 'text', required: false },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
    delivery: {
        id: 'delivery',
        name: 'Delivery Expected',
        icon: Truck,
        color: '#3B82F6',
        fields: [
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
            { name: 'itemsExpected', label: 'Items Expected', type: 'textarea', required: true },
            { name: 'driverContact', label: 'Driver Contact', type: 'phone', required: false },
            { name: 'trackingNumber', label: 'Tracking Number', type: 'text', required: false },
            { name: 'deliveryFee', label: 'Delivery Fee (Ksh)', type: 'number', required: false },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
    customer: {
        id: 'customer',
        name: 'Customer Follow-up',
        icon: UserCheck,
        color: '#8B5CF6',
        fields: [
            { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
            { name: 'phoneNumber', label: 'Phone Number', type: 'phone', required: true },
            {
                name: 'followUpReason', label: 'Reason', type: 'select',
                options: ['Pending Order', 'Payment Due', 'Feedback', 'Service Check'], required: true
            },
            { name: 'orderDetails', label: 'Order Details', type: 'textarea', required: false },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
    supplier: {
        id: 'supplier',
        name: 'Supplier Payment',
        icon: PackageCheck,
        color: '#F59E0B',
        fields: [
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true },
            { name: 'amountDue', label: 'Amount Due (Ksh)', type: 'number', required: true },
            {
                name: 'paymentMethod', label: 'Payment Method', type: 'select',
                options: ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'], required: false
            },
            { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false },
            { name: 'accountNumber', label: 'Account/Reference', type: 'text', required: false },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
    inventory: {
        id: 'inventory',
        name: 'Inventory Restock',
        icon: Package,
        color: '#EC4899',
        fields: [
            { name: 'itemName', label: 'Item Name', type: 'text', required: true },
            { name: 'quantityNeeded', label: 'Quantity Needed', type: 'number', required: true },
            { name: 'supplierName', label: 'Supplier', type: 'text', required: true },
            { name: 'estimatedCost', label: 'Estimated Cost (Ksh)', type: 'number', required: false },
            {
                name: 'urgency', label: 'Urgency', type: 'select',
                options: ['Low', 'Medium', 'High', 'Critical'], required: false
            },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
    financial: {
        id: 'financial',
        name: 'Financial Task',
        icon: Landmark,
        color: '#06B6D4',
        fields: [
            {
                name: 'taskType', label: 'Task Type', type: 'select',
                options: ['Tax Payment', 'Report Submission', 'Bank Payment', 'Loan Payment'], required: true
            },
            { name: 'institution', label: 'Institution', type: 'text', required: true },
            { name: 'amount', label: 'Amount (Ksh)', type: 'number', required: false },
            { name: 'referenceNumber', label: 'Reference Number', type: 'text', required: false },
            { name: 'documentRequired', label: 'Documents Required', type: 'textarea', required: false },
            { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ]
    },
};

// ===== STORAGE SERVICE =====
class StorageService {
    static async loadReminders() {
        try {
            const data = await AsyncStorage.getItem(REMINDERS_KEY);
            const reminders = data ? JSON.parse(data) : [];

            const now = Date.now();
            const updated = reminders.map(reminder => {
                if (reminder.status === 'active' && reminder.timestamp < now) {
                    return { ...reminder, status: 'overdue' };
                }
                return reminder;
            });

            if (updated.some((r, i) => r.status !== reminders[i].status)) {
                await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
            }

            return updated;
        } catch (error) {
            console.error('Error loading reminders:', error);
            return [];
        }
    }

    static async saveReminder(reminder) {
        try {
            const reminders = await this.loadReminders();
            const newReminder = {
                ...reminder,
                id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'active',
                createdAt: new Date().toISOString(),
            };

            reminders.push(newReminder);
            await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
            return newReminder;
        } catch (error) {
            console.error('Error saving reminder:', error);
            return null;
        }
    }

    static async updateReminder(id, updates) {
        try {
            const reminders = await this.loadReminders();
            const index = reminders.findIndex(r => r.id === id);
            if (index === -1) return false;

            reminders[index] = { ...reminders[index], ...updates };
            await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
            return true;
        } catch (error) {
            console.error('Error updating reminder:', error);
            return false;
        }
    }

    static async deleteReminder(id) {
        try {
            const reminders = await this.loadReminders();
            const filtered = reminders.filter(r => r.id !== id);
            await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error deleting reminder:', error);
            return false;
        }
    }

    static async getStats() {
        const reminders = await this.loadReminders();
        const now = Date.now();
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayEnd = new Date().setHours(23, 59, 59, 999);

        const today = reminders.filter(r =>
            r.timestamp >= todayStart && r.timestamp <= todayEnd && r.status !== 'completed'
        ).length;

        const overdue = reminders.filter(r => r.status === 'overdue').length;
        const active = reminders.filter(r => r.status === 'active').length;
        const completed = reminders.filter(r => r.status === 'completed').length;

        return {
            total: reminders.length,
            active,
            today,
            overdue,
            completed,
        };
    }
}

// ===== COMPONENTS =====

// Reminder Card Component
const ReminderCard = ({ reminder, onPress, onAction }) => {
    const category = CATEGORIES[reminder.category];
    const Icon = category?.icon || Package;
    const isOverdue = reminder.status === 'overdue';
    const isCompleted = reminder.status === 'completed';
    const isToday = new Date(reminder.timestamp).toDateString() === new Date().toDateString();

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isCompleted && styles.cardCompleted,
                isOverdue && styles.cardOverdue,
                isToday && styles.cardToday,
            ]}
            onPress={() => onPress(reminder)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: `${category?.color}15` }]}>
                    <Icon size={14} color={category?.color} />
                    <Text style={[styles.categoryText, { color: category?.color }]}>
                        {category?.name}
                    </Text>
                </View>

                {isCompleted && (
                    <View style={styles.completedBadge}>
                        <CheckCircle size={14} color={COLORS.success} />
                        <Text style={styles.completedText}>Done</Text>
                    </View>
                )}

                {isOverdue && !isCompleted && (
                    <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>Overdue</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.cardTitle, isCompleted && styles.cardTitleCompleted]}>
                {reminder.title}
            </Text>

            {reminder.data?.personName && (
                <Text style={styles.cardSubtitle}>{reminder.data.personName}</Text>
            )}

            {reminder.data?.amount && (
                <Text style={styles.cardAmount}>Ksh {Number(reminder.data.amount).toLocaleString()}</Text>
            )}

            <View style={styles.cardFooter}>
                <View style={styles.timeContainer}>
                    <Clock size={14} color={isOverdue ? COLORS.error : COLORS.textSecondary} />
                    <Text style={[
                        styles.timeText,
                        { color: isOverdue ? COLORS.error : COLORS.textSecondary }
                    ]}>
                        {formatDate(reminder.timestamp)} • {formatTime(reminder.timestamp)}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => onAction(reminder)}
                >
                    <MoreVertical size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// Add/Edit Reminder Modal
const ReminderModal = ({ visible, category, selectedDate, onClose, onSave, reminderToEdit }) => {
    const [formData, setFormData] = useState({});
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (visible) {
            if (reminderToEdit) {
                setFormData(reminderToEdit.data || {});
                setDate(new Date(reminderToEdit.timestamp));
                setTime(new Date(reminderToEdit.timestamp));
            } else {
                setFormData({});
                // FIX: Use the selectedDate passed from calendar, not current date
                const targetDate = selectedDate || new Date();
                setDate(targetDate);

                // Set time to 9:00 AM as default
                const defaultTime = new Date(targetDate);
                defaultTime.setHours(9, 0, 0, 0);
                setTime(defaultTime);
            }
            setErrors({});
        }
    }, [visible, reminderToEdit, selectedDate]);

    const categoryConfig = category ? CATEGORIES[category] : null;

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!categoryConfig) {
            Alert.alert('Error', 'Please select a category');
            return false;
        }

        categoryConfig.fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = `${field.label} is required`;
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert('Missing Information', 'Please fill in all required fields');
            return false;
        }

        return true;
    };

    const handleSave = () => {
        if (!validateForm()) return;

        const reminderDateTime = new Date(date);
        reminderDateTime.setHours(time.getHours());
        reminderDateTime.setMinutes(time.getMinutes());
        reminderDateTime.setSeconds(0);

        const firstFieldValue = formData[categoryConfig.fields[0].name] || '';
        const secondFieldValue = formData[categoryConfig.fields[1]?.name] || '';

        const reminder = {
            category,
            categoryName: categoryConfig.name,
            categoryColor: categoryConfig.color,
            title: `${categoryConfig.name}: ${firstFieldValue} ${secondFieldValue ? `- ${secondFieldValue}` : ''}`.trim(),
            timestamp: reminderDateTime.getTime(),
            data: formData,
        };

        onSave(reminder, reminderToEdit?.id);
    };

    const renderField = (field) => {
        const iconMap = {
            'personName': <User size={20} color={COLORS.textSecondary} />,
            'phoneNumber': <Phone size={20} color={COLORS.textSecondary} />,
            'amount': <DollarSign size={20} color={COLORS.textSecondary} />,
            'amountDue': <DollarSign size={20} color={COLORS.textSecondary} />,
            'supplierName': <User size={20} color={COLORS.textSecondary} />,
            'customerName': <User size={20} color={COLORS.textSecondary} />,
            'bankName': <Building size={20} color={COLORS.textSecondary} />,
            'itemName': <Package size={20} color={COLORS.textSecondary} />,
            'trackingNumber': <MapPin size={20} color={COLORS.textSecondary} />,
        };

        if (field.type === 'select') {
            return (
                <View key={field.name} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                        {field.label} {field.required && <Text style={styles.required}>*</Text>}
                    </Text>
                    <View style={styles.selectContainer}>
                        {field.options.map((option, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.selectOption,
                                    formData[field.name] === option && styles.selectOptionActive
                                ]}
                                onPress={() => handleInputChange(field.name, option)}
                            >
                                <Text style={[
                                    styles.selectOptionText,
                                    formData[field.name] === option && styles.selectOptionTextActive
                                ]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors[field.name] && (
                        <Text style={styles.errorText}>{errors[field.name]}</Text>
                    )}
                </View>
            );
        }

        if (field.type === 'textarea') {
            return (
                <View key={field.name} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                        {field.label} {field.required && <Text style={styles.required}>*</Text>}
                    </Text>
                    <TextInput
                        style={[styles.textArea, errors[field.name] && styles.inputError]}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={formData[field.name] || ''}
                        onChangeText={(value) => handleInputChange(field.name, value)}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    {errors[field.name] && (
                        <Text style={styles.errorText}>{errors[field.name]}</Text>
                    )}
                </View>
            );
        }

        // Text/Number/Phone input
        return (
            <View key={field.name} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                    {field.label} {field.required && <Text style={styles.required}>*</Text>}
                </Text>
                <View style={[styles.inputContainer, errors[field.name] && styles.inputError]}>
                    {iconMap[field.name] || <FileText size={20} color={COLORS.textSecondary} />}
                    <TextInput
                        style={styles.textInput}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={formData[field.name] || ''}
                        onChangeText={(value) => handleInputChange(field.name, value)}
                        keyboardType={field.type === 'number' ? 'numeric' :
                            field.type === 'phone' ? 'phone-pad' : 'default'}
                    />
                </View>
                {errors[field.name] && (
                    <Text style={styles.errorText}>{errors[field.name]}</Text>
                )}
            </View>
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            {categoryConfig && (
                                <View style={[
                                    styles.categoryIcon,
                                    { backgroundColor: `${categoryConfig.color}20` }
                                ]}>
                                    <categoryConfig.icon size={24} color={categoryConfig.color} />
                                </View>
                            )}
                            <View>
                                <Text style={styles.modalTitle}>
                                    {reminderToEdit ? 'Edit' : 'Add'} {categoryConfig?.name || 'Reminder'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {reminderToEdit ? 'Update reminder details' : 'Fill in all required fields'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {categoryConfig?.fields.map(field => renderField(field))}

                        <View style={styles.dateTimeSection}>
                            <Text style={styles.sectionTitle}>Date & Time</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Calendar size={20} color={COLORS.primary} />
                                    <View style={styles.dateTimeText}>
                                        <Text style={styles.dateTimeLabel}>Date</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {date.toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Clock size={20} color={COLORS.primary} />
                                    <View style={styles.dateTimeText}>
                                        <Text style={styles.dateTimeLabel}>Time</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {time.toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: categoryConfig?.color || COLORS.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>
                                {reminderToEdit ? 'Update' : 'Save'} Reminder
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                            minimumDate={new Date()}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={time}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowTimePicker(false);
                                if (selectedTime) setTime(selectedTime);
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

// Category Selection Modal - UPDATED: Now accepts and passes the selected date
const CategorySelectionModal = ({ visible, onClose, onSelectCategory, selectedDate }) => {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.categoryModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    {selectedDate && (
                        <View style={styles.dateInfo}>
                            <Calendar size={16} color={COLORS.primary} />
                            <Text style={styles.dateInfoText}>
                                For {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>
                    )}

                    <ScrollView style={styles.categoriesGrid} showsVerticalScrollIndicator={false}>
                        <View style={styles.gridContainer}>
                            {Object.values(CATEGORIES).map((cat, index) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.categoryGridItem}
                                    onPress={() => {
                                        // FIX: Pass the selectedDate along with category
                                        onSelectCategory(cat.id, selectedDate);
                                    }}
                                >
                                    <View style={[styles.categoryGridIcon, { backgroundColor: `${cat.color}20` }]}>
                                        <cat.icon size={28} color={cat.color} />
                                    </View>
                                    <Text style={styles.categoryGridText}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.categoryCancelButton}
                        onPress={onClose}
                    >
                        <Text style={styles.categoryCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// Date Reminders Modal - Shows reminders for a specific date
const DateRemindersModal = ({ visible, date, reminders, onClose, onReminderPress }) => {
    if (!visible) return null;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.dateRemindersModalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            <View style={[styles.categoryIcon, { backgroundColor: `${COLORS.primary}20` }]}>
                                <Calendar size={24} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Reminders for {formattedDate}</Text>
                                <Text style={styles.modalSubtitle}>
                                    {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {reminders.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Calendar size={48} color={COLORS.border} />
                                <Text style={styles.emptyStateTitle}>No reminders for this date</Text>
                                <Text style={styles.emptyStateText}>
                                    Add a reminder by tapping the + button
                                </Text>
                            </View>
                        ) : (
                            reminders.map(reminder => (
                                <ReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => onReminderPress(reminder), 100);
                                    }}
                                    onAction={(reminder) => {
                                        Alert.alert(
                                            'Reminder Actions',
                                            '',
                                            [
                                                reminder.status !== 'completed' && {
                                                    text: 'Mark as Completed',
                                                    onPress: () => {
                                                        // This would be handled by parent
                                                        onClose();
                                                    }
                                                },
                                                {
                                                    text: 'View Details',
                                                    onPress: () => {
                                                        onClose();
                                                        setTimeout(() => onReminderPress(reminder), 100);
                                                    }
                                                },
                                                {
                                                    text: 'Cancel',
                                                    style: 'cancel'
                                                }
                                            ].filter(Boolean)
                                        );
                                    }}
                                />
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Calendar View Component
const CalendarView = ({ reminders, onDateSelect, onDateWithRemindersSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i),
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayReminders = reminders.filter(r =>
                new Date(r.timestamp).toDateString() === date.toDateString()
            );
            days.push({
                day,
                isCurrentMonth: true,
                date,
                hasReminders: dayReminders.length > 0,
                reminders: dayReminders,
            });
        }

        // Next month days
        const totalCells = 42; // 6 weeks
        while (days.length < totalCells) {
            const nextDay = days.length - (startingDay + daysInMonth) + 1;
            days.push({
                day: nextDay,
                isCurrentMonth: false,
                date: new Date(year, month + 1, nextDay),
            });
        }

        return days;
    };

    const handleDatePress = (dateInfo) => {
        setSelectedDate(dateInfo.date);
        if (dateInfo.hasReminders && dateInfo.reminders && dateInfo.reminders.length > 0) {
            // If date has reminders, show the reminders modal
            onDateWithRemindersSelect(dateInfo.date, dateInfo.reminders);
        } else {
            // If no reminders, show category selection to add new reminder
            onDateSelect(dateInfo.date);
        }
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const days = getDaysInMonth();

    return (
        <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                >
                    <ChevronLeft size={24} color={COLORS.text} />
                </TouchableOpacity>

                <Text style={styles.monthYear}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                >
                    <ChevronRight size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.dayNames}>
                {dayNames.map((day, idx) => (
                    <Text key={idx} style={[
                        styles.dayName,
                        idx === 0 && styles.sunday,
                        idx === 6 && styles.saturday,
                    ]}>
                        {day}
                    </Text>
                ))}
            </View>

            <View style={styles.calendarGrid}>
                {days.map((dayInfo, idx) => {
                    const isTodayCell = isToday(dayInfo.date);
                    const isSelectedCell = isSelected(dayInfo.date);

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.calendarCell,
                                !dayInfo.isCurrentMonth && styles.otherMonthCell,
                                isTodayCell && styles.todayCell,
                                isSelectedCell && styles.selectedCell,
                            ]}
                            onPress={() => handleDatePress(dayInfo)}
                        >
                            <Text style={[
                                styles.calendarDay,
                                !dayInfo.isCurrentMonth && styles.otherMonthText,
                                isTodayCell && styles.todayText,
                                isSelectedCell && styles.selectedText,
                            ]}>
                                {dayInfo.day}
                            </Text>
                            {dayInfo.hasReminders && (
                                <View style={styles.reminderDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.selectedDateInfo}>
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
        </View>
    );
};

// Detail Modal Component
const DetailModal = ({
    visible,
    reminder,
    onClose,
    onComplete,
    onDelete,
    onEdit
}) => {
    if (!visible || !reminder) return null;

    const category = CATEGORIES[reminder.category];
    const Icon = category?.icon || Package;
    const isCompleted = reminder.status === 'completed';
    const isOverdue = reminder.status === 'overdue';
    const isActive = reminder.status === 'active';

    // Format date and time
    const reminderDate = new Date(reminder.timestamp);
    const formattedDate = reminderDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = reminderDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Get status badge
    const getStatusBadge = () => {
        if (isCompleted) {
            return (
                <View style={[styles.statusBadge, styles.completedStatus]}>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Completed</Text>
                </View>
            );
        }
        if (isOverdue) {
            return (
                <View style={[styles.statusBadge, styles.overdueStatus]}>
                    <AlertTriangle size={16} color="#EF4444" />
                    <Text style={[styles.statusText, { color: '#EF4444' }]}>Overdue</Text>
                </View>
            );
        }
        return (
            <View style={[styles.statusBadge, styles.activeStatus]}>
                <Clock size={16} color="#3B82F6" />
                <Text style={[styles.statusText, { color: '#3B82F6' }]}>Upcoming</Text>
            </View>
        );
    };

    // Format amount if present
    const formatAmount = (key, value) => {
        if (typeof value === 'number' && key.includes('amount')) {
            return `Ksh ${Number(value).toLocaleString()}`;
        }
        return String(value);
    };

    // Get icon for field
    const getFieldIcon = (key) => {
        const iconProps = { size: 18, color: COLORS.textSecondary };
        switch (key) {
            case 'personName':
            case 'supplierName':
            case 'customerName':
                return <User {...iconProps} />;
            case 'phoneNumber':
            case 'driverContact':
                return <Phone {...iconProps} />;
            case 'amount':
            case 'amountDue':
            case 'deliveryFee':
            case 'estimatedCost':
                return <DollarSign {...iconProps} />;
            case 'itemsExpected':
            case 'itemName':
                return <Package {...iconProps} />;
            case 'institution':
            case 'bankName':
                return <Building {...iconProps} />;
            case 'trackingNumber':
                return <MapPin {...iconProps} />;
            default:
                return <FileText {...iconProps} />;
        }
    };

    // Field display
    const renderField = (key, value, label) => {
        if (!value || value === '') return null;
        return (
            <View key={key} style={styles.detailField}>
                <View style={styles.fieldHeader}>
                    {getFieldIcon(key)}
                    <Text style={styles.fieldLabel}>{label}</Text>
                </View>
                <Text style={styles.fieldValue}>{formatAmount(key, value)}</Text>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.detailModalContainer}>
                    {/* Header */}
                    <View style={[styles.detailHeader, { backgroundColor: category?.color || COLORS.primary }]}>
                        <TouchableOpacity
                            style={styles.headerBackButton}
                            onPress={onClose}
                        >
                            <ArrowLeft size={24} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <View style={styles.categoryHeader}>
                                <View style={[styles.categoryIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Icon size={20} color="#FFF" />
                                </View>
                                <Text style={styles.headerCategoryText}>{category?.name}</Text>
                            </View>
                            {getStatusBadge()}
                        </View>
                        <TouchableOpacity
                            style={styles.headerMoreButton}
                            onPress={() => {
                                Alert.alert(
                                    'Reminder Actions',
                                    'What would you like to do?',
                                    [
                                        !isCompleted && {
                                            text: 'Mark as Completed',
                                            onPress: () => {
                                                onComplete(reminder.id);
                                                onClose();
                                            }
                                        },
                                        {
                                            text: 'Edit Reminder',
                                            onPress: () => {
                                                onClose();
                                                setTimeout(() => onEdit(reminder), 100);
                                            }
                                        },
                                        {
                                            text: 'Delete Reminder',
                                            style: 'destructive',
                                            onPress: () => {
                                                Alert.alert(
                                                    'Confirm Delete',
                                                    'Are you sure you want to delete this reminder? This action cannot be undone.',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                onDelete(reminder.id);
                                                                onClose();
                                                            }
                                                        }
                                                    ]
                                                );
                                            }
                                        },
                                        { text: 'Cancel', style: 'cancel' }
                                    ].filter(Boolean)
                                );
                            }}
                        >
                            <MoreVertical size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.detailContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title Section */}
                        <View style={styles.titleSection}>
                            <Text style={styles.detailTitle}>{reminder.title}</Text>
                            <Text style={styles.detailSubtitle}>
                                Created {new Date(reminder.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </Text>
                        </View>

                        {/* Date & Time Section */}
                        <View style={styles.datetimeSection}>
                            <View style={styles.datetimeRow}>
                                <View style={styles.datetimeItem}>
                                    <View style={[styles.datetimeIcon, { backgroundColor: `${category?.color}15` }]}>
                                        <Calendar size={18} color={category?.color} />
                                    </View>
                                    <View style={styles.datetimeText}>
                                        <Text style={styles.datetimeLabel}>Date</Text>
                                        <Text style={styles.datetimeValue}>{formattedDate}</Text>
                                    </View>
                                </View>
                                <View style={styles.datetimeItem}>
                                    <View style={[styles.datetimeIcon, { backgroundColor: `${category?.color}15` }]}>
                                        <Clock size={18} color={category?.color} />
                                    </View>
                                    <View style={styles.datetimeText}>
                                        <Text style={styles.datetimeLabel}>Time</Text>
                                        <Text style={styles.datetimeValue}>{formattedTime}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Details Section */}
                        <View style={styles.detailsSection}>
                            <Text style={styles.sectionTitle}>Details</Text>
                            <View style={styles.detailsGrid}>
                                {reminder.data && Object.entries(reminder.data)
                                    .filter(([key, value]) => value && value !== '' && key !== 'notes')
                                    .map(([key, value]) => {
                                        const field = category?.fields?.find(f => f.name === key);
                                        return renderField(key, value, field?.label || key);
                                    })}
                            </View>
                        </View>

                        {/* Notes Section */}
                        {reminder.data?.notes && (
                            <View style={styles.notesSection}>
                                <View style={styles.notesHeader}>
                                    <FileText size={18} color={COLORS.textSecondary} />
                                    <Text style={styles.notesTitle}>Notes</Text>
                                </View>
                                <Text style={styles.notesText}>{reminder.data.notes}</Text>
                            </View>
                        )}

                        {/* Spacer for bottom actions */}
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionBar}>
                        {!isCompleted ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => onEdit(reminder), 100);
                                    }}
                                >
                                    <Edit size={20} color={COLORS.primary} />
                                    <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.completeButton]}
                                    onPress={() => {
                                        onComplete(reminder.id);
                                        onClose();
                                    }}
                                >
                                    <CheckCircle size={20} color="#FFF" />
                                    <Text style={[styles.actionButtonText, { color: '#FFF' }]}>Mark Complete</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.editButton, { flex: 1 }]}
                                onPress={() => {
                                    onClose();
                                    setTimeout(() => onEdit(reminder), 100);
                                }}
                            >
                                <Edit size={20} color={COLORS.primary} />
                                <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ===== MAIN SCREEN =====
export default function BusinessRemindersScreen({ navigation }) {
    const [reminders, setReminders] = useState([]);
    const [filteredReminders, setFilteredReminders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, today: 0, overdue: 0, completed: 0 });

    // UI States
    const [viewMode, setViewMode] = useState('list');
    const [filter, setFilter] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Modal States
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDateRemindersModal, setShowDateRemindersModal] = useState(false);

    // Selection States
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [reminderToEdit, setReminderToEdit] = useState(null);
    const [selectedReminder, setSelectedReminder] = useState(null);
    const [remindersForSelectedDate, setRemindersForSelectedDate] = useState([]);

    // FIX: Added state to store the date selected from calendar
    const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);

    // Load reminders on focus
    useEffect(() => {
        loadReminders();
    }, []);

    const loadReminders = async () => {
        try {
            const loadedReminders = await StorageService.loadReminders();
            const loadedStats = await StorageService.getStats();

            setReminders(loadedReminders);
            setStats(loadedStats);
            applyFilters(loadedReminders, filter, searchQuery);
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    };

    const applyFilters = (reminderList, currentFilter, query) => {
        let filtered = reminderList;

        // Status filter
        if (currentFilter === 'active') {
            filtered = filtered.filter(r => r.status === 'active' || r.status === 'overdue');
        } else if (currentFilter === 'completed') {
            filtered = filtered.filter(r => r.status === 'completed');
        }

        // Search filter
        if (query.trim()) {
            const searchLower = query.toLowerCase();
            filtered = filtered.filter(r =>
                r.title?.toLowerCase().includes(searchLower) ||
                r.categoryName?.toLowerCase().includes(searchLower) ||
                r.data?.personName?.toLowerCase().includes(searchLower) ||
                r.data?.supplierName?.toLowerCase().includes(searchLower)
            );
        }

        // Sort: overdue first, then by time
        filtered.sort((a, b) => {
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (a.status !== 'overdue' && b.status === 'overdue') return 1;
            return a.timestamp - b.timestamp;
        });

        setFilteredReminders(filtered);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadReminders();
        setRefreshing(false);
    };

    // FIX: Updated to handle calendar date selection properly
    const handleAddReminder = (category, date) => {
        setSelectedCategory(category);
        // Use calendarSelectedDate if available, otherwise use passed date
        const dateToUse = calendarSelectedDate || date || new Date();
        setSelectedDate(dateToUse);
        setReminderToEdit(null);
        setShowReminderModal(true);
    };

    const handleEditReminder = (reminder) => {
        setSelectedCategory(reminder.category);
        setReminderToEdit(reminder);
        setShowReminderModal(true);
    };

    const handleSaveReminder = async (reminder, id) => {
        try {
            if (id) {
                await StorageService.updateReminder(id, reminder);
                Alert.alert('Success', 'Reminder updated successfully!');
            } else {
                await StorageService.saveReminder(reminder);
                Alert.alert('Success', 'Reminder added successfully!');
            }

            setShowReminderModal(false);
            setSelectedCategory(null);
            setSelectedDate(null);
            setCalendarSelectedDate(null); // FIX: Reset calendar date
            setReminderToEdit(null);
            await loadReminders();
        } catch (error) {
            Alert.alert('Error', 'Failed to save reminder');
            console.error('Error saving reminder:', error);
        }
    };

    const handleCompleteReminder = async (id) => {
        try {
            await StorageService.updateReminder(id, { status: 'completed' });
            Alert.alert('Success', 'Reminder marked as completed!');
            await loadReminders();
        } catch (error) {
            Alert.alert('Error', 'Failed to complete reminder');
        }
    };

    const handleDeleteReminder = async (id) => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await StorageService.deleteReminder(id);
                            Alert.alert('Success', 'Reminder deleted');
                            await loadReminders();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete reminder');
                        }
                    }
                }
            ]
        );
    };

    const handleReminderPress = (reminder) => {
        setSelectedReminder(reminder);
        setShowDetailModal(true);
    };

    const handleReminderAction = (reminder) => {
        Alert.alert(
            'Reminder Actions',
            '',
            [
                reminder.status !== 'completed' && {
                    text: 'Mark as Completed',
                    onPress: () => handleCompleteReminder(reminder.id)
                },
                {
                    text: 'Edit',
                    onPress: () => handleEditReminder(reminder)
                },
                {
                    text: 'Delete',
                    onPress: () => handleDeleteReminder(reminder.id),
                    style: 'destructive'
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ].filter(Boolean)
        );
    };

    const handleSearchChange = (text) => {
        setSearchQuery(text);
        applyFilters(reminders, filter, text);
    };

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        applyFilters(reminders, newFilter, searchQuery);
    };

    // FIX: Updated calendar date selection
    const handleCalendarDateSelect = (date) => {
        setCalendarSelectedDate(date);
        setSelectedDate(date);
        setShowCategoryModal(true);
    };

    // FIX: Updated category selection to use calendarSelectedDate
    const handleSelectCategory = (categoryId, dateFromCalendar) => {
        setSelectedCategory(categoryId);
        // Use the date passed from category modal (which comes from calendar)
        const dateToUse = dateFromCalendar || calendarSelectedDate || new Date();
        setSelectedDate(dateToUse);
        setShowCategoryModal(false);
        setShowReminderModal(true);
    };

    const handleDateWithRemindersSelect = (date, dateReminders) => {
        setSelectedDate(date);
        setRemindersForSelectedDate(dateReminders);
        setShowDateRemindersModal(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft size={24} color={COLORS.surface} />
                    </TouchableOpacity>

                    {showSearch ? (
                        <View style={styles.searchContainer}>
                            <Search size={20} color={COLORS.textSecondary} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search reminders..."
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                autoFocus
                            />
                            <TouchableOpacity onPress={() => setShowSearch(false)}>
                                <X size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.headerTitle}>Business Reminders</Text>
                            <TouchableOpacity onPress={() => setShowSearch(true)}>
                                <Search size={24} color={COLORS.surface} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* View Tabs */}
                <View style={styles.viewTabs}>
                    <TouchableOpacity
                        style={[styles.viewTab, viewMode === 'list' && styles.viewTabActive]}
                        onPress={() => setViewMode('list')}
                    >
                        <List size={20} color={viewMode === 'list' ? COLORS.surface : COLORS.surface + '80'} />
                        <Text style={[styles.viewTabText, viewMode === 'list' && styles.viewTabTextActive]}>
                            List
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.viewTab, viewMode === 'calendar' && styles.viewTabActive]}
                        onPress={() => setViewMode('calendar')}
                    >
                        <Calendar size={20} color={viewMode === 'calendar' ? COLORS.surface : COLORS.surface + '80'} />
                        <Text style={[styles.viewTabText, viewMode === 'calendar' && styles.viewTabTextActive]}>
                            Calendar
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs (only for list view) */}
                {viewMode === 'list' && (
                    <View style={styles.filterTabs}>
                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
                            onPress={() => handleFilterChange('active')}
                        >
                            <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
                                Active ({stats.active})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
                            onPress={() => handleFilterChange('completed')}
                        >
                            <Text style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}>
                                Completed ({stats.completed})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
                            onPress={() => handleFilterChange('all')}
                        >
                            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                                All ({stats.total})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Cards */}
                {viewMode === 'list' && (
                    <View style={styles.summaryCards}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                                    <Calendar size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.summaryLabel}>Today</Text>
                                <Text style={styles.summaryValue}>{stats.today}</Text>
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIcon, { backgroundColor: `${COLORS.info}15` }]}>
                                    <Calendar size={20} color={COLORS.info} />
                                </View>
                                <Text style={styles.summaryLabel}>Active</Text>
                                <Text style={styles.summaryValue}>{stats.active}</Text>
                            </View>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIcon, { backgroundColor: `${COLORS.error}15` }]}>
                                    <AlertTriangle size={20} color={COLORS.error} />
                                </View>
                                <Text style={styles.summaryLabel}>Overdue</Text>
                                <Text style={[styles.summaryValue, { color: COLORS.error }]}>{stats.overdue}</Text>
                            </View>

                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIcon, { backgroundColor: `${COLORS.success}15` }]}>
                                    <CheckCircle size={20} color={COLORS.success} />
                                </View>
                                <Text style={styles.summaryLabel}>Completed</Text>
                                <Text style={[styles.summaryValue, { color: COLORS.success }]}>{stats.completed}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick Add Categories */}
                {viewMode === 'list' && (
                    <View style={styles.categoriesSection}>
                        <Text style={styles.sectionTitle}>Quick Add</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {Object.values(CATEGORIES).map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryButton, { borderColor: cat.color }]}
                                    onPress={() => handleAddReminder(cat.id)}
                                >
                                    <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                                        <cat.icon size={24} color={cat.color} />
                                    </View>
                                    <Text style={styles.categoryButtonText}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Main Content */}
                {viewMode === 'calendar' ? (
                    <CalendarView
                        reminders={reminders.filter(r => r.status !== 'completed')}
                        onDateSelect={handleCalendarDateSelect}
                        onDateWithRemindersSelect={handleDateWithRemindersSelect}
                    />
                ) : (
                    <View style={styles.remindersList}>
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>
                                {filter === 'active' ? 'Active Reminders' :
                                    filter === 'completed' ? 'Completed Reminders' : 'All Reminders'}
                            </Text>
                            {filteredReminders.length > 0 && (
                                <Text style={styles.countBadge}>{filteredReminders.length}</Text>
                            )}
                        </View>

                        {filteredReminders.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Calendar size={48} color={COLORS.border} />
                                <Text style={styles.emptyStateTitle}>
                                    {searchQuery ? 'No reminders found' :
                                        filter === 'completed' ? 'No completed reminders' :
                                            'No reminders yet'}
                                </Text>
                                <Text style={styles.emptyStateText}>
                                    {searchQuery ? 'Try a different search' :
                                        filter === 'active' ? 'Add your first reminder' :
                                            'Completed reminders will appear here'}
                                </Text>
                            </View>
                        ) : (
                            filteredReminders.map(reminder => (
                                <ReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onPress={handleReminderPress}
                                    onAction={handleReminderAction}
                                />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setCalendarSelectedDate(null); // FIX: Reset calendar date when adding from FAB
                    setShowCategoryModal(true);
                }}
            >
                <Plus size={28} color={COLORS.surface} />
            </TouchableOpacity>

            {/* Modals */}
            <ReminderModal
                visible={showReminderModal}
                category={selectedCategory}
                selectedDate={selectedDate}
                reminderToEdit={reminderToEdit}
                onClose={() => {
                    setShowReminderModal(false);
                    setSelectedCategory(null);
                    setSelectedDate(null);
                    setCalendarSelectedDate(null); // FIX: Reset calendar date
                    setReminderToEdit(null);
                }}
                onSave={handleSaveReminder}
            />

            <CategorySelectionModal
                visible={showCategoryModal}
                onClose={() => {
                    setShowCategoryModal(false);
                    setCalendarSelectedDate(null); // FIX: Reset calendar date when closing
                }}
                onSelectCategory={handleSelectCategory}
                selectedDate={calendarSelectedDate} // FIX: Pass calendarSelectedDate
            />

            <DateRemindersModal
                visible={showDateRemindersModal}
                date={selectedDate}
                reminders={remindersForSelectedDate}
                onClose={() => setShowDateRemindersModal(false)}
                onReminderPress={handleReminderPress}
            />

            <DetailModal
                visible={showDetailModal}
                reminder={selectedReminder}
                onClose={() => setShowDetailModal(false)}
                onComplete={handleCompleteReminder}
                onDelete={handleDeleteReminder}
                onEdit={handleEditReminder}
            />
        </View>
    );
}

// ===== STYLES =====
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
        paddingBottom: SPACING.md,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
    },
    backButton: {
        padding: SPACING.xs,
        marginRight: SPACING.sm,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.surface,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: SPACING.md,
        marginLeft: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
    },
    viewTabs: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
    },
    viewTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: 12,
        gap: 8,
    },
    viewTabActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    viewTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    viewTabTextActive: {
        color: COLORS.surface,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    filterTab: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: 20,
    },
    filterTabActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    filterTabTextActive: {
        color: COLORS.surface,
    },
    content: {
        flex: 1,
    },
    summaryCards: {
        padding: SPACING.md,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    summaryLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
    },
    categoriesSection: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    categoryButton: {
        width: 100,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
        marginRight: SPACING.sm,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    categoryButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    remindersList: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 100,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    countBadge: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    emptyStateText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardCompleted: {
        opacity: 0.7,
        borderColor: COLORS.success,
    },
    cardOverdue: {
        borderColor: COLORS.error,
        borderWidth: 2,
    },
    cardToday: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.success}20`,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    completedText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.success,
    },
    overdueBadge: {
        backgroundColor: `${COLORS.error}20`,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    overdueText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.error,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    cardTitleCompleted: {
        textDecorationLine: 'line-through',
        color: COLORS.textSecondary,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    moreButton: {
        padding: 4,
    },
    fab: {
        position: 'absolute',
        right: SPACING.md,
        bottom: SPACING.xl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    dateRemindersModalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.md,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    closeButton: {
        padding: SPACING.xs,
    },
    modalBody: {
        padding: SPACING.md,
        maxHeight: 400,
    },
    fieldContainer: {
        marginBottom: SPACING.md,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    required: {
        color: COLORS.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.sm,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        padding: 0,
    },
    textArea: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
        color: COLORS.text,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        marginTop: 4,
    },
    selectContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    selectOption: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    selectOptionActive: {
        backgroundColor: `${COLORS.primary}15`,
        borderColor: COLORS.primary,
    },
    selectOptionText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    selectOptionTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    dateTimeSection: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.primary}10`,
        borderRadius: 12,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    dateTimeText: {
        flex: 1,
    },
    dateTimeLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    dateTimeValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalActions: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    saveButton: {
        flex: 2,
        borderRadius: 12,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.surface,
    },
    // Category Selection Modal
    categoryModalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        marginTop: 'auto',
    },
    categoriesGrid: {
        padding: SPACING.md,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    categoryGridItem: {
        width: '48%',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryGridIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    categoryGridText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'center',
    },
    categoryCancelButton: {
        backgroundColor: COLORS.background,
        margin: SPACING.md,
        paddingVertical: SPACING.md,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: `${COLORS.primary}10`,
        marginHorizontal: SPACING.md,
        borderRadius: 8,
        marginBottom: SPACING.md,
    },
    dateInfoText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    // Detail Modal Styles
    detailModalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 10,
        paddingBottom: SPACING.lg,
    },
    headerBackButton: {
        padding: SPACING.xs,
        marginRight: SPACING.sm,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    categoryIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    headerCategoryText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    headerMoreButton: {
        padding: SPACING.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    activeStatus: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    overdueStatus: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    completedStatus: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    detailContent: {
        flex: 1,
        padding: SPACING.md,
    },
    titleSection: {
        marginBottom: SPACING.lg,
    },
    detailTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    detailSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    datetimeSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    datetimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    datetimeItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    datetimeIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    datetimeText: {
        flex: 1,
    },
    datetimeLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    datetimeValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    detailsSection: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    detailsGrid: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
    },
    detailField: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '30',
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.sm,
    },
    fieldLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    fieldValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'right',
        flex: 1,
        marginLeft: SPACING.md,
    },
    notesSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    notesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    notesText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    actionBar: {
        flexDirection: 'row',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: SPACING.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: 12,
    },
    editButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    completeButton: {
        backgroundColor: COLORS.primary,
        flex: 2,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Calendar Styles
    calendarContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: SPACING.md,
        margin: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthYear: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    dayNames: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.sm,
    },
    dayName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        width: 40,
        textAlign: 'center',
    },
    sunday: {
        color: COLORS.error,
    },
    saturday: {
        color: COLORS.primary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarCell: {
        width: 40,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
        borderRadius: 12,
        position: 'relative',
    },
    otherMonthCell: {
        opacity: 0.3,
    },
    todayCell: {
        backgroundColor: `${COLORS.primary}15`,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    selectedCell: {
        backgroundColor: COLORS.primary,
    },
    calendarDay: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    otherMonthText: {
        color: COLORS.textLight,
    },
    todayText: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    selectedText: {
        color: COLORS.surface,
        fontWeight: '800',
    },
    reminderDot: {
        position: 'absolute',
        bottom: 4,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    selectedDateInfo: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
        backgroundColor: COLORS.background,
        borderRadius: 16,
    },
    selectedDateTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    selectedDateYear: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
});