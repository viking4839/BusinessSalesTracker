import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Platform,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    X,
    Calendar,
    Clock,
    User,
    Phone,
    DollarSign,
    FileText,
    Package,
    Building,
    CreditCard,
    Truck,
    Hash,
    MapPin,
    Banknote,
    UserCheck,
    PackageCheck,
    Landmark,
} from 'lucide-react-native';
import { getCategoryIcon } from '../utils/ReminderCategories';
import { Colors, Spacing, BorderRadius, Shadows } from '../styles/Theme';
import { getCategory } from '../utils/ReminderCategories';
import ReminderStorage from '../utils/ReminderStorage';
import InventoryStorage from '../utils/InventoryStorage';
import NotificationService from '../services/NotificationService';

const AddReminderModal = ({ visible, onClose, category, preSelectedDate, onReminderAdded }) => {
    const [formData, setFormData] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
    const [errors, setErrors] = useState({});

    const categoryConfig = category ? getCategory(category) : null;

    useEffect(() => {
        if (visible && category) {
            resetForm();
            if (category === 'inventory') {
                loadInventoryItems();
            }
        }
    }, [visible, category]);

    const loadInventoryItems = async () => {
        const items = await InventoryStorage.loadInventory();
        setInventoryItems(items.filter(item => item.quantity > 0)); // Only show items in stock
    };

    const resetForm = () => {
        setFormData({});
        // Use pre-selected date from calendar if provided
        setSelectedDate(preSelectedDate || new Date());
        const defaultTime = new Date();
        defaultTime.setHours(14, 0, 0, 0);
        setSelectedTime(defaultTime);
        setSelectedInventoryItem(null);
        setErrors({});
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    const handleInventorySelect = (item) => {
        setSelectedInventoryItem(item);
        setFormData(prev => ({
            ...prev,
            inventoryItemId: item.id,
            inventoryItemName: item.name,
        }));
        if (errors.inventoryItemId) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.inventoryItemId;
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!categoryConfig) {
            Alert.alert('Error', 'Invalid category');
            return false;
        }

        // Validate required fields
        categoryConfig.fields.forEach(field => {
            if (field.required) {
                const value = formData[field.name];
                if (!value || (typeof value === 'string' && value.trim() === '')) {
                    newErrors[field.name] = `${field.label} is required`;
                }
            }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            Alert.alert('Missing Information', 'Please fill in all required fields');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            // Combine date and time
            const reminderDateTime = new Date(selectedDate);
            reminderDateTime.setHours(selectedTime.getHours());
            reminderDateTime.setMinutes(selectedTime.getMinutes());
            reminderDateTime.setSeconds(0);

            const timestamp = reminderDateTime.getTime();

            // Generate title based on category
            let title = '';
            switch (category) {
                case 'cheque':
                    title = `${formData.chequeType} Cheque - ${formData.personName}`;
                    break;
                case 'delivery':
                    title = `Delivery from ${formData.supplierName}`;
                    break;
                case 'customer':
                    title = `Follow up with ${formData.customerName}`;
                    break;
                case 'supplier':
                    title = `Pay ${formData.supplierName}`;
                    break;
                case 'inventory':
                    title = `Restock ${formData.inventoryItemName}`;
                    break;
                case 'financial':
                    title = `${formData.financialType} - ${formData.institution}`;
                    break;
                default:
                    title = 'Business Reminder';
            }

            const reminderData = {
                category: category,
                categoryIcon: categoryConfig.icon,
                categoryName: categoryConfig.name,
                categoryColor: categoryConfig.color,
                title: title,
                timestamp: timestamp,
                reminderDate: selectedDate.toISOString().split('T')[0],
                reminderTime: `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`,
                data: formData,
            };

            const newReminder = await ReminderStorage.addReminder(reminderData);

            if (newReminder) {
                // Schedule notification
                await NotificationService.scheduleReminder(newReminder);

                Alert.alert('Success', 'Reminder added successfully!');

                if (onReminderAdded) {
                    onReminderAdded(newReminder);
                }

                onClose();
            } else {
                Alert.alert('Error', 'Failed to add reminder');
            }
        } catch (error) {
            console.error('Error saving reminder:', error);
            Alert.alert('Error', 'Failed to save reminder');
        }
    };

    const onDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
        }
    };

    const onTimeChange = (event, time) => {
        setShowTimePicker(false);
        if (time) {
            setSelectedTime(time);
        }
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (time) => {
        return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const renderCategoryIcon = () => {
        const iconName = getCategoryIcon(category);
        const iconMap = {
            Banknote: Banknote,
            Truck: Truck,
            UserCheck: UserCheck,
            PackageCheck: PackageCheck,
            Package: Package,
            Landmark: Landmark,
        };
        const IconComponent = iconMap[iconName] || Package;
        return <IconComponent size={28} color={categoryConfig.color} />;
    };

    const renderSelectField = (field) => (
        <View key={field.name} style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>
                {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectScroll}
            >
                {field.options.map((option, index) => (
                    <TouchableOpacity
                        key={index}
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
            </ScrollView>
            {errors[field.name] && (
                <Text style={styles.errorText}>{errors[field.name]}</Text>
            )}
        </View>
    );


    const renderTextField = (field, icon) => (
        <View key={field.name} style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>
                {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={[styles.inputContainer, errors[field.name] && styles.inputError]}>
                {icon}
                <TextInput
                    style={styles.textInput}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.name] || ''}
                    onChangeText={(value) => handleInputChange(field.name, value)}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={field.type === 'number' ? 'numeric' :
                        field.type === 'phone' ? 'phone-pad' : 'default'}
                />
            </View>
            {errors[field.name] && (
                <Text style={styles.errorText}>{errors[field.name]}</Text>
            )}
        </View>
    );

    const renderTextAreaField = (field) => (
        <View key={field.name} style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>
                {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={[styles.textAreaContainer, errors[field.name] && styles.inputError]}>
                <TextInput
                    style={styles.textArea}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={formData[field.name] || ''}
                    onChangeText={(value) => handleInputChange(field.name, value)}
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
            {errors[field.name] && (
                <Text style={styles.errorText}>{errors[field.name]}</Text>
            )}
        </View>
    );

    const renderInventorySelect = () => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>
                Select Item from Inventory <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.inventoryScroll}
            >
                {inventoryItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.inventoryCard,
                            selectedInventoryItem?.id === item.id && styles.inventoryCardActive
                        ]}
                        onPress={() => handleInventorySelect(item)}
                    >
                        <View style={styles.inventoryCardHeader}>
                            <Package size={16} color={selectedInventoryItem?.id === item.id ? Colors.primary : Colors.textSecondary} />
                            <Text style={styles.inventoryCardStock}>{item.quantity} left</Text>
                        </View>
                        <Text style={[
                            styles.inventoryCardName,
                            selectedInventoryItem?.id === item.id && styles.inventoryCardNameActive
                        ]} numberOfLines={2}>
                            {item.name}
                        </Text>
                        <Text style={styles.inventoryCardPrice}>
                            Ksh {item.unitPrice.toLocaleString()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {inventoryItems.length === 0 && (
                <View style={styles.emptyInventory}>
                    <Package size={32} color={Colors.border} />
                    <Text style={styles.emptyInventoryText}>No items in inventory</Text>
                </View>
            )}
            {errors.inventoryItemId && (
                <Text style={styles.errorText}>{errors.inventoryItemId}</Text>
            )}
        </View>
    );

    const renderCategoryForm = () => {
        if (!categoryConfig) return null;

        return categoryConfig.fields.map((field) => {
            if (field.type === 'select') {
                return renderSelectField(field);
            } else if (field.type === 'textarea') {
                return renderTextAreaField(field);
            } else if (field.type === 'inventory-select') {
                return renderInventorySelect();
            } else {
                // Determine icon based on field name
                let icon = <FileText size={18} color={Colors.textSecondary} />;

                if (field.name.includes('Name') || field.name.includes('person')) {
                    icon = <User size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('phone') || field.name.includes('Phone')) {
                    icon = <Phone size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('amount') || field.name.includes('Amount') || field.name.includes('cost') || field.name.includes('Cost') || field.name.includes('Fee')) {
                    icon = <DollarSign size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('bank') || field.name.includes('Bank') || field.name.includes('institution')) {
                    icon = <Building size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('Number') || field.name.includes('number')) {
                    icon = <Hash size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('supplier') || field.name.includes('Supplier')) {
                    icon = <Truck size={18} color={Colors.textSecondary} />;
                } else if (field.name.includes('quantity') || field.name.includes('Quantity')) {
                    icon = <Package size={18} color={Colors.textSecondary} />;
                }

                return renderTextField(field, icon);
            }
        });
    };

    if (!visible || !categoryConfig) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLeft}>
                            <View style={[styles.categoryIcon, { backgroundColor: categoryConfig.color + '20' }]}>
                                {renderCategoryIcon()}
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Add {categoryConfig.name}</Text>
                                <Text style={styles.modalSubtitle}>{categoryConfig.description}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalScroll}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Category-specific form */}
                        {renderCategoryForm()}

                        {/* Date & Time Selection */}
                        <View style={styles.dateTimeSection}>
                            <Text style={styles.sectionTitle}>Reminder Date & Time</Text>

                            <View style={styles.dateTimeRow}>
                                {/* Date Picker */}
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Calendar size={18} color={Colors.primary} />
                                    <View style={styles.dateTimeTextContainer}>
                                        <Text style={styles.dateTimeLabel}>Date</Text>
                                        <Text style={styles.dateTimeValue}>{formatDate(selectedDate)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Time Picker */}
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Clock size={18} color={Colors.primary} />
                                    <View style={styles.dateTimeTextContainer}>
                                        <Text style={styles.dateTimeLabel}>Time</Text>
                                        <Text style={styles.dateTimeValue}>{formatTime(selectedTime)}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: categoryConfig.color }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Add Reminder</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    {/* Time Picker Modal */}
                    {showTimePicker && (
                        <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onTimeChange}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    modalSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    modalScroll: {
        padding: Spacing.md,
    },
    inputWrapper: {
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.xs,
    },
    inputError: {
        borderColor: Colors.error,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
        padding: Spacing.xs,
    },
    textAreaContainer: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    textArea: {
        fontSize: 15,
        color: Colors.text,
        minHeight: 80,
        textAlignVertical: 'top',
        padding: Spacing.xs,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
    },
    selectScroll: {
        marginTop: 4,
    },
    selectOption: {
        backgroundColor: Colors.background,
        borderWidth: 2,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginRight: Spacing.xs,
    },
    selectOptionActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    selectOptionText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    selectOptionTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    inventoryScroll: {
        marginTop: 8,
    },
    inventoryCard: {
        width: 120,
        backgroundColor: Colors.background,
        borderWidth: 2,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: Spacing.sm,
        marginRight: Spacing.sm,
    },
    inventoryCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    inventoryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    inventoryCardStock: {
        fontSize: 10,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    inventoryCardName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
        minHeight: 32,
    },
    inventoryCardNameActive: {
        color: Colors.primary,
    },
    inventoryCardPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    emptyInventory: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.background,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    emptyInventoryText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    dateTimeSection: {
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        borderRadius: 12,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    dateTimeTextContainer: {
        flex: 1,
    },
    dateTimeLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    dateTimeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    modalActions: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    saveButton: {
        flex: 1.5,
        borderRadius: 12,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.surface,
    },
});

export default AddReminderModal;
