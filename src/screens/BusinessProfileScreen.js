import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';

const BusinessProfileScreen = ({ navigation }) => {
    const [businessType, setBusinessType] = useState('');
    const [peakStart, setPeakStart] = useState('08:00');
    const [peakEnd, setPeakEnd] = useState('18:00');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        (async () => {
            const d = await AsyncStorage.getItem('businessProfile');
            if (d) {
                const p = JSON.parse(d);
                setBusinessType(p.businessType || '');
                setPeakStart(p.peakStart || '08:00');
                setPeakEnd(p.peakEnd || '18:00');
                setNotes(p.notes || '');
            }
        })();
    }, []);

    const save = async () => {
        await AsyncStorage.setItem('businessProfile', JSON.stringify({ businessType, peakStart, peakEnd, notes }));
        Alert.alert('Saved', 'Business profile updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Business Type</Text>
            <TextInput style={styles.input} placeholder="e.g., Retail Shop" value={businessType} onChangeText={setBusinessType} />

            <Text style={styles.label}>Peak Hours (Start - End)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={peakStart} onChangeText={setPeakStart} placeholder="08:00" />
                <TextInput style={[styles.input, { flex: 1 }]} value={peakEnd} onChangeText={setPeakEnd} placeholder="18:00" />
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
                placeholder="Any details to improve parsing/scoring"
                value={notes}
                onChangeText={setNotes}
            />
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

export default BusinessProfileScreen;