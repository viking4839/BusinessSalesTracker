import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';

const SalesTargetScreen = ({ navigation }) => {
    const [monthlyTarget, setMonthlyTarget] = useState('');

    useEffect(() => {
        (async () => {
            const t = await AsyncStorage.getItem('salesTarget');
            if (t) setMonthlyTarget(String(JSON.parse(t).monthly || ''));
        })();
    }, []);

    const save = async () => {
        const value = Number(monthlyTarget) || 0;
        await AsyncStorage.setItem('salesTarget', JSON.stringify({ monthly: value }));
        Alert.alert('Saved', 'Sales target updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Monthly Sales Target (KSh)</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., 200000"
                keyboardType="numeric"
                value={monthlyTarget}
                onChangeText={setMonthlyTarget}
            />
            <Button title="Save" onPress={save} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
    label: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md,
        color: Colors.text, backgroundColor: Colors.surface, marginBottom: Spacing.lg,
    },
});

export default SalesTargetScreen;