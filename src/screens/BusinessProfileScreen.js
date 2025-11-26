
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/Theme';
import Button from '../components/Button';
import { ArrowLeft, Briefcase } from 'lucide-react-native';

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
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.iconContainer}>
                        <Briefcase size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>Business Profile</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Business Type Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>Business Type</Text>
                    <Text style={styles.helperText}>What kind of business do you run?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Retail Shop, Restaurant, Service"
                        value={businessType}
                        onChangeText={setBusinessType}
                        placeholderTextColor={Colors.textLight}
                    />
                </View>

                {/* Peak Hours Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>Peak Hours</Text>
                    <Text style={styles.helperText}>When is your business busiest?</Text>
                    <View style={styles.timeRow}>
                        <View style={styles.timeInput}>
                            <Text style={styles.timeLabel}>Start</Text>
                            <TextInput
                                style={styles.input}
                                value={peakStart}
                                onChangeText={setPeakStart}
                                placeholder="08:00"
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>
                        <Text style={styles.timeSeparator}>to</Text>
                        <View style={styles.timeInput}>
                            <Text style={styles.timeLabel}>End</Text>
                            <TextInput
                                style={styles.input}
                                value={peakEnd}
                                onChangeText={setPeakEnd}
                                placeholder="18:00"
                                placeholderTextColor={Colors.textLight}
                            />
                        </View>
                    </View>
                </View>

                {/* Notes Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>Additional Notes</Text>
                    <Text style={styles.helperText}>Any details to help improve analytics</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        placeholder="e.g., Weekends are busiest, seasonal variations..."
                        value={notes}
                        onChangeText={setNotes}
                        placeholderTextColor={Colors.textLight}
                        textAlignVertical="top"
                    />
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        📊 This information helps Track Biz provide better insights and recommendations for your business.
                    </Text>
                </View>
            </ScrollView>

            {/* Fixed Save Button */}
            <View style={styles.footer}>
                <Button title="Save Profile" onPress={save} />
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
    textArea: {
        height: 100,
        paddingTop: Spacing.md,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeInput: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 6,
        fontWeight: '500',
    },
    timeSeparator: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 20,
        fontWeight: '500',
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

export default BusinessProfileScreen;