import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Colors, Typography, Spacing } from '../styles/Theme'; // ✅ Use Spacing (not SPACING)
import SMSReader from '../services/SMSReader';
import TransactionStorage from '../utils/TransactionStorage';
import Button from '../components/Button';
import EnhancedHeader from '../components/EnhancedHeader';

const DebugScreen = ({ navigation }) => {
    const [testResults, setTestResults] = useState([]);

    const handleCheckPermission = async () => {
        const hasPermission = await SMSReader.checkPermission();
        Alert.alert('Permission Status', `Has SMS Permission: ${hasPermission}`);
    };

    const handleRequestPermission = async () => {
        const granted = await SMSReader.requestPermission();
        Alert.alert('Permission Request', `Permission Granted: ${granted}`);
    };

    const handleTestScan = async () => {
        try {
            const transactions = await SMSReader.scanRecentTransactions(50);
            Alert.alert('Scan Complete', `Found ${transactions.length} transactions. Check console for details.`);
            console.log(transactions);
        } catch (error) {
            Alert.alert('Scan Error', error.message);
        }
    };

    const handleClearTransactions = async () => {
        await TransactionStorage.clearAllTransactions();
        Alert.alert('Storage Cleared', 'All transactions have been deleted from AsyncStorage.');
    };

    const handleViewTransactions = async () => {
        const transactions = await TransactionStorage.loadTransactions();
        Alert.alert('Stored Transactions', `Found ${transactions.length} transactions in storage. Check console for details.`);
        console.log(transactions);
    };

    return (
        <View style={styles.container}>
            <EnhancedHeader
                title="Debug Menu"
                showBackButton
                onBackPress={() => navigation.goBack()}
            />
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SMS Service</Text>
                    <Button title="Check SMS Permission" onPress={handleCheckPermission} />
                    <Button
                        title="Request SMS Permission"
                        onPress={handleRequestPermission}
                        style={{ marginTop: Spacing.sm }}
                    />
                    <Button
                        title="Test Scan (50 SMS)"
                        onPress={handleTestScan}
                        style={{ marginTop: Spacing.sm }}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction Storage</Text>
                    <Button title="View Stored Transactions (Console)" onPress={handleViewTransactions} />
                    <Button
                        title="Clear All Transactions"
                        onPress={handleClearTransactions}
                        style={{ marginTop: Spacing.sm, backgroundColor: Colors.error }}
                    />
                </View>

                {testResults.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Test Results</Text>
                        {testResults.map((result, index) => (
                            <View key={index} style={styles.resultItem}>
                                <Text style={styles.resultText}>{result}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.md, // ✅ Fixed - using Spacing.md instead of SPACING.md
    },
    section: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: Spacing.md,
        color: Colors.text,
    },
    resultItem: {
        padding: Spacing.sm,
        backgroundColor: Colors.background,
        borderRadius: 8,
        marginBottom: Spacing.sm,
    },
    resultText: {
        ...Typography.body,
        color: Colors.text,
    },
});

export default DebugScreen;