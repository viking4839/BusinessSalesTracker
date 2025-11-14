import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';

const TransactionItem = ({
    transaction,
    onPress,
    showScoring = true
}) => {
    const isIncome = transaction.amount > 0;

    const getBankIcon = (bank) => {
        const icons = {
            'M-Pesa': '📱',
            'Equity Bank': '🏦',
            'Co-op Bank': '🔵',
            'KCB Bank': '🔴',
            'Diamond Trust Bank': '💎',
            'Family Bank': '👨‍👩‍👧‍👦',
            'Standard Chartered': '🌍'
        };
        return icons[bank] || '💰';
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981';
        if (score >= 60) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{getBankIcon(transaction.bank)}</Text>
            </View>

            <View style={styles.details}>
                <Text style={styles.sender} numberOfLines={1}>{transaction.sender}</Text>
                <View style={styles.meta}>
                    <Text style={styles.bank}>{transaction.bank}</Text>
                    <Text style={styles.time}>
                        {new Date(transaction.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>
            </View>

            <View style={styles.amountSection}>
                <Text style={[
                    styles.amount,
                    { color: isIncome ? Colors.success : Colors.error }
                ]}>
                    {isIncome ? '+' : ''}Ksh {Math.abs(transaction.amount).toLocaleString()}
                </Text>
                {showScoring && transaction.score !== undefined && (
                    <View style={[
                        styles.scoreBadge,
                        { backgroundColor: getScoreColor(transaction.score) }
                    ]}>
                        <Text style={styles.scoreText}>
                            {transaction.isBusinessTransaction ? 'Biz' : 'Pers'} • {transaction.score}%
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    icon: {
        fontSize: 16,
    },
    details: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    sender: {
        ...Typography.body,
        fontWeight: '500',
        color: Colors.text,
        marginBottom: 2,
    },
    meta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bank: {
        ...Typography.small,
        color: Colors.primary,
        fontWeight: '500',
    },
    time: {
        ...Typography.small,
        color: Colors.textSecondary,
    },
    amountSection: {
        alignItems: 'flex-end',
    },
    amount: {
        ...Typography.subheading,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    scoreBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    scoreText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
    },
});

export default TransactionItem;