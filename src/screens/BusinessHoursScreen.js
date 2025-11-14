import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';

const BusinessHoursScreen = ({ navigation }) => {
    const [open, setOpen] = useState('08:00');
    const [close, setClose] = useState('18:00');

    useEffect(() => {
        (async () => {
            const d = await AsyncStorage.getItem('businessHours');
            if (d) {
                const b = JSON.parse(d);
                setOpen(b.open || '08:00');
                setClose(b.close || '18:00');
            }
        })();
    }, []);

    const save = async () => {
        await AsyncStorage.setItem('businessHours', JSON.stringify({ open, close }));
        Alert.alert('Saved', 'Business hours updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Opening Time</Text>
            <TextInput style={styles.input} value={open} onChangeText={setOpen} placeholder="08:00" />
            <Text style={styles.label}>Closing Time</Text>
            <TextInput style={styles.input} value={close} onChangeText={setClose} placeholder="18:00" />
            <Button title="Save" onPress={save} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
    label: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md,
        color: Colors.text, backgroundColor: Colors.surface,
    },
});

export default BusinessHoursScreen;