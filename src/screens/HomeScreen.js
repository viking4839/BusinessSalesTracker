import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import SMSReader from '../Services/SMSReader';

const HomeScreen = () => {
    const [transactions, setTransactions] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('unknown');

    // Request permission when component mounts
    useEffect(() => {
        requestSMSPermission();
    }, []);

    const requestSMSPermission = async () => {
        try {
            const granted = await SMSReader.requestPermission();
            setPermissionStatus(granted ? 'granted' : 'denied');

            if (!granted) {
                Alert.alert(
                    'Permission Required',
                    'SMS permission is needed to automatically scan transaction messages. You can still enter transactions manually.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Permission request error:', error);
            setPermissionStatus('error');
        }
    };

    const handleScanSMS = async () => {
        if (permissionStatus !== 'granted') {
            Alert.alert(
                'Permission Needed',
                'Please grant SMS permission to scan messages.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Grant Permission', onPress: requestSMSPermission }
                ]
            );
            return;
        }

        setIsScanning(true);
        try {
            const newTransactions = await SMSReader.scanRecentTransactions();
            setTransactions(newTransactions);
            Alert.alert('Success', `Found ${newTransactions.length} transactions`);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsScanning(false);
        }
    };

    const getPermissionStatusColor = () => {
        switch (permissionStatus) {
            case 'granted': return '#4CAF50';
            case 'denied': return '#F44336';
            default: return '#FF9800';
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Business Tracker</Text>

            {/* Permission Status Indicator */}
            <View style={[styles.permissionBadge, { backgroundColor: getPermissionStatusColor() }]}>
                <Text style={styles.permissionText}>
                    SMS Permission: {permissionStatus.toUpperCase()}
                </Text>
            </View>

            {permissionStatus === 'denied' && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={requestSMSPermission}
                >
                    <Text style={styles.retryButtonText}>
                        🔄 Request Permission Again
                    </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[styles.scanButton, isScanning && { opacity: 0.7 }]}
                onPress={handleScanSMS}
                disabled={isScanning}
            >
                <Text style={styles.scanButtonText}>
                    {isScanning ? 'Scanning...' : '📱 Scan SMS for Transactions'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.subtitle}>
                Found {transactions.length} transactions
            </Text>

            <FlatList
                data={transactions}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        styles.transactionItem,
                        { backgroundColor: item.amount < 0 ? '#FFEBEE' : '#E8F5E9' }
                    ]}>
                        <View style={styles.transactionHeader}>
                            <Text style={[
                                styles.amount,
                                { color: item.amount < 0 ? '#C62828' : '#2E7D32' }
                            ]}>
                                Ksh {Math.abs(item.amount).toFixed(2)}
                            </Text>
                            <Text style={styles.transactionType}>
                                {item.transactionType === 'received' ? '📥 Received' : '📤 Sent'}
                            </Text>
                        </View>
                        <Text style={styles.sender}>From: {item.sender}</Text>
                        {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}
                        <Text style={styles.bank}>🏦 {item.bank}</Text>
                        <Text style={styles.timestamp}>
                            🕐 {item.timestamp.toLocaleString()}
                        </Text>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                            {permissionStatus === 'granted'
                                ? 'No transactions found. Click scan button to search SMS.'
                                : 'Grant SMS permission to scan transactions automatically.'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    permissionBadge: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
    },
    permissionText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    retryButton: {
        backgroundColor: '#FF9800',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    scanButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    scanButtonText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
    subtitle: { fontSize: 16, marginBottom: 10, fontWeight: '600' },
    transactionItem: {
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    amount: { fontSize: 20, fontWeight: 'bold' },
    transactionType: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    sender: { fontSize: 14, color: '#333', marginBottom: 4 },
    phone: { fontSize: 12, color: '#666', marginBottom: 4 },
    bank: { fontSize: 12, color: '#2196F3', fontWeight: '600', marginBottom: 4 },
    timestamp: { fontSize: 10, color: '#999', marginTop: 5 },
    emptyState: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});

export default HomeScreen;