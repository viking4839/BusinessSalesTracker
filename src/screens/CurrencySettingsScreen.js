import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, TYPOGRAPHY, SPACING } from '../styles/Theme';
import { Check } from 'lucide-react-native';
import { ArrowLeft } from 'lucide-react-native';

const CURRENCIES = [
    { code: 'KSH', label: 'Kenyan Shilling (KSh)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
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
        Alert.alert('Saved', `Currency set to ${code}`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    return (
        <View style={styles.container}>
            {/* Header with back button and title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Currency Settings</Text>
            </View>
            {CURRENCIES.map(c => (
                <TouchableOpacity key={c.code} style={styles.row} onPress={() => save(c.code)}>
                    <Text style={styles.label}>{c.label}</Text>
                    {currency === c.code && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: SPACING.lg, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.surface,
    },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    label: { ...TYPOGRAPHY.body, color: Colors.text },
});

export default CurrencySettingsScreen;