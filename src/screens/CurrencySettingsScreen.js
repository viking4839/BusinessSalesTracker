
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, TYPOGRAPHY, SPACING } from '../styles/Theme';
import { Check, ArrowLeft, DollarSign } from 'lucide-react-native';

const CURRENCIES = [
    { code: 'KSH', label: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
    { code: 'USD', label: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', label: 'British Pound', symbol: '£', flag: '🇬🇧' },
    { code: 'TZS', label: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
    { code: 'UGX', label: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
];

const CurrencySettingsScreen = ({ navigation }) => {
    const [currency, setCurrency] = useState('KSH');

    useEffect(() => {
        (async () => {
            const c = await AsyncStorage.getItem('currency');
            if (c) setCurrency(c);
        })();
    }, []);

    const save = async (code) => {
        await AsyncStorage.setItem('currency', code);
        setCurrency(code);
        const selected = CURRENCIES.find(c => c.code === code);
        Alert.alert('Saved', `Currency set to ${selected.label} (${selected.symbol})`, [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.iconContainer}>
                        <DollarSign size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>Currency</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionDescription}>
                    Select your preferred currency for displaying amounts throughout the app.
                </Text>

                <View style={styles.currencyList}>
                    {CURRENCIES.map(c => (
                        <TouchableOpacity
                            key={c.code}
                            style={[
                                styles.currencyCard,
                                currency === c.code && styles.currencyCardActive
                            ]}
                            onPress={() => save(c.code)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.currencyLeft}>
                                <Text style={styles.currencyFlag}>{c.flag}</Text>
                                <View style={styles.currencyInfo}>
                                    <Text style={styles.currencyLabel}>{c.label}</Text>
                                    <Text style={styles.currencyCode}>{c.code} • {c.symbol}</Text>
                                </View>
                            </View>
                            {currency === c.code && (
                                <View style={styles.checkCircle}>
                                    <Check size={16} color={Colors.surface} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        💡 Changing currency only affects display format. It does not convert existing transaction amounts.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 12,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.surface,
        letterSpacing: 0.3,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },
    sectionDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: SPACING.md,
        lineHeight: 20,
    },
    currencyList: {
        gap: SPACING.sm,
    },
    currencyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.border,
    },
    currencyCardActive: {
        borderColor: Colors.primary,
        backgroundColor: '#EFF6FF',
    },
    currencyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    currencyFlag: {
        fontSize: 32,
    },
    currencyInfo: {
        flex: 1,
    },
    currencyLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    currencyCode: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: SPACING.md,
        marginTop: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    infoText: {
        fontSize: 13,
        color: '#92400E',
        lineHeight: 20,
    },
});

export default CurrencySettingsScreen;