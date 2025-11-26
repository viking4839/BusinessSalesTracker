import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';
import { ArrowLeft } from 'lucide-react-native';

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
            {/* Header with back button and title */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Business Hours</Text>
            </View>
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
    label: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md,
        color: Colors.text, backgroundColor: Colors.surface,
    },
});

export default BusinessHoursScreen;