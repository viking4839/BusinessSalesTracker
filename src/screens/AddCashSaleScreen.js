import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DollarSign, User, FileText, Calendar, Clock } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';

const AddCashSaleScreen = ({ navigation }) => {
    const [amount, setAmount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        if (!description) {
            Alert.alert('Missing Description', 'Please add a description');
            return;
        }

        setIsSubmitting(true);

        try {
            // Create transaction object
            const transaction = {
                id: `cash-${Date.now()}`,
                type: 'received',
                amount: parseFloat(amount),
                currency: 'KSH',
                bank: 'Manual Entry',
                sender: customerName || 'Cash Customer', // normalized key
                timestamp: new Date().toISOString(),     // normalized key
                message: description,
                category: 'cash_sale',
                isManual: true,
                isBusinessTransaction: true,             // ensure counts include it
                score: 100,                               // normalized key (was businessScore)
                confidence: 'high',
            };

            // Get existing transactions from AsyncStorage
            const existingData = await AsyncStorage.getItem('transactions');
            const transactions = existingData ? JSON.parse(existingData) : [];

            // Add new transaction at the beginning (most recent first)
            transactions.unshift(transaction);

            // Save back to AsyncStorage
            await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

            console.log('✅ Cash sale saved successfully:', transaction);

            // Update daily totals
            await updateDailyTotals(transaction);

            // Save to TransactionStorage and refresh ProfitReportStorage

            await ProfitReportStorage.refreshTodaysReport();

            Alert.alert(
                'Success!',
                `Cash sale of Ksh ${parseFloat(amount).toLocaleString()} recorded`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setIsSubmitting(false);
                            // Navigate back and trigger refresh
                            navigation.navigate('Home', { refresh: true });
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('❌ Error saving cash sale:', error);
            Alert.alert('Error', 'Failed to save transaction. Please try again.');
            setIsSubmitting(false);
        }
    };

    const updateDailyTotals = async (transaction) => {
        try {
            const today = new Date().toDateString();
            const totalsData = await AsyncStorage.getItem('dailyTotals');
            const dailyTotals = totalsData ? JSON.parse(totalsData) : {};

            if (!dailyTotals[today]) {
                dailyTotals[today] = {
                    date: today,
                    received: 0,
                    sent: 0,
                    count: 0,
                };
            }

            dailyTotals[today].received += transaction.amount;
            dailyTotals[today].count += 1;

            await AsyncStorage.setItem('dailyTotals', JSON.stringify(dailyTotals));
            console.log('✅ Daily totals updated');
        } catch (error) {
            console.error('Error updating daily totals:', error);
        }
    };

    const getCurrentDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Add Cash Sale</Text>
                    <Text style={styles.headerSubtitle}>Record a manual transaction</Text>
                </View>

                <View style={styles.form}>
                    {/* Amount Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (Ksh) *</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}>
                                <DollarSign size={20} color={Colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <View style={[styles.inputIcon, styles.textAreaIcon]}>
                                <FileText size={20} color={Colors.textSecondary} />
                            </View>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="e.g., Product sale, Service payment..."
                                placeholderTextColor={Colors.textLight}
                                multiline
                                numberOfLines={4}
                                value={description}
                                onChangeText={setDescription}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Customer Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Customer Name (Optional)</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIcon}>
                                <User size={20} color={Colors.textSecondary} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., John Kamau"
                                placeholderTextColor={Colors.textLight}
                                value={customerName}
                                onChangeText={setCustomerName}
                            />
                        </View>
                    </View>

                    {/* Date & Time Display */}
                    <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeCard}>
                            <View style={styles.dateTimeIcon}>
                                <Calendar size={16} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.dateTimeLabel}>Date</Text>
                                <Text style={styles.dateTimeValue}>{getCurrentDate()}</Text>
                            </View>
                        </View>

                        <View style={styles.dateTimeCard}>
                            <View style={styles.dateTimeIcon}>
                                <Clock size={16} color={Colors.primary} />
                            </View>
                            <View>
                                <Text style={styles.dateTimeLabel}>Time</Text>
                                <Text style={styles.dateTimeValue}>{getCurrentTime()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            💡 This sale will be marked as a business transaction with 100% confidence
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Actions */}
            <View style={styles.bottomActions}>
                <Button
                    title="Cancel"
                    onPress={() => navigation.goBack()}
                    variant="outline"
                    style={styles.actionButton}
                />
                <Button
                    title="Record Sale"
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    variant="primary"
                    style={styles.actionButton}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    form: {
        padding: Spacing.lg,
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
        paddingVertical: Spacing.md,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
    },
    textAreaIcon: {
        paddingTop: Spacing.md,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    dateTimeCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    dateTimeIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateTimeLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    dateTimeValue: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
    infoBox: {
        backgroundColor: '#EFF6FF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    infoText: {
        fontSize: 13,
        color: '#1E40AF',
        lineHeight: 18,
    },
    bottomActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    actionButton: {
        flex: 1,
    },
});

export default AddCashSaleScreen;