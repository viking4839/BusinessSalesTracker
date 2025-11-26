// BusinessHoursScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';
import { ArrowLeft, Clock } from 'lucide-react-native';

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
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.iconContainer}>
                        <Clock size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>Business Hours</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Opening Time Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>Opening Time</Text>
                    <Text style={styles.helperText}>When does your business start operations?</Text>
                    <TextInput
                        style={styles.input}
                        value={open}
                        onChangeText={setOpen}
                        placeholder="08:00"
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Closing Time Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>Closing Time</Text>
                    <Text style={styles.helperText}>When does your business end operations?</Text>
                    <TextInput
                        style={styles.input}
                        value={close}
                        onChangeText={setClose}
                        placeholder="18:00"
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        💡 Tip: Set accurate business hours to help track peak transaction times and analyze performance.
                    </Text>
                </View>
            </ScrollView>

            {/* Fixed Save Button */}
            <View style={styles.footer}>
                <Button title="Save Changes" onPress={save} />
            </View>
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
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    helperText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.background,
    },
    infoBox: {
        backgroundColor: '#EFF6FF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    infoText: {
        fontSize: 13,
        color: '#1E40AF',
        lineHeight: 20,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});

export default BusinessHoursScreen;