import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    TouchableOpacity,
    ScrollView,
    Alert,
    StatusBar,
} from 'react-native';
import {
    ArrowLeft,
    Bell,
    Package,
    Calendar,
    CreditCard,
    TrendingUp,
    TestTube,
} from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../styles/Theme';
import NotificationService from '../services/NotificationService';

const NotificationSettingsScreen = ({ navigation }) => {
    const [settings, setSettings] = useState({
        enabled: true,
        lowStock: true,
        expiry: true,
        creditOverdue: true,
        dailySummary: false,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await NotificationService.loadSettings();
            setSettings(saved);
        } catch (error) {
            console.error('Load settings error:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await NotificationService.saveSettings(newSettings);

        // If daily summary is enabled, schedule it
        if (key === 'dailySummary' && value) {
            await NotificationService.scheduleDailySummary();
            Alert.alert('✅ Scheduled', 'Daily summary will be sent at 8 PM every day');
        }

        // If daily summary is disabled, cancel scheduled notifications
        if (key === 'dailySummary' && !value) {
            await NotificationService.cancelAllScheduled();
        }
    };

    const handleTestNotification = async () => {
        await NotificationService.testNotification();
        Alert.alert('✅ Test Sent', 'Check your notification tray');
    };

    const handleCheckAlerts = async () => {
        Alert.alert('🔄 Checking...', 'Scanning for alerts');
        await NotificationService.checkAllAlerts();
        Alert.alert('✅ Done', 'All alerts checked. Notifications sent if issues found.');
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color={Colors.surface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Master Toggle */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Bell size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Master Control</Text>
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Text style={styles.settingLabel}>Enable Notifications</Text>
                            <Text style={styles.settingDesc}>
                                Turn all notifications on or off
                            </Text>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(val) => updateSetting('enabled', val)}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={settings.enabled ? Colors.surface : Colors.textLight}
                        />
                    </View>
                </View>

                {/* Alert Types */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Package size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Alert Types</Text>
                    </View>

                    {/* Low Stock */}
                    <View style={[styles.settingRow, !settings.enabled && styles.disabled]}>
                        <View style={styles.settingLeft}>
                            <View style={styles.iconLabel}>
                                <Package size={16} color={Colors.warning} />
                                <Text style={styles.settingLabel}>Low Stock Alerts</Text>
                            </View>
                            <Text style={styles.settingDesc}>
                                Get notified when items run low
                            </Text>
                        </View>
                        <Switch
                            value={settings.lowStock}
                            onValueChange={(val) => updateSetting('lowStock', val)}
                            disabled={!settings.enabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={settings.lowStock ? Colors.surface : Colors.textLight}
                        />
                    </View>

                    {/* Expiry */}
                    <View style={[styles.settingRow, !settings.enabled && styles.disabled]}>
                        <View style={styles.settingLeft}>
                            <View style={styles.iconLabel}>
                                <Calendar size={16} color={Colors.error} />
                                <Text style={styles.settingLabel}>Expiry Alerts</Text>
                            </View>
                            <Text style={styles.settingDesc}>
                                Get notified about expiring items (7 days before)
                            </Text>
                        </View>
                        <Switch
                            value={settings.expiry}
                            onValueChange={(val) => updateSetting('expiry', val)}
                            disabled={!settings.enabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={settings.expiry ? Colors.surface : Colors.textLight}
                        />
                    </View>

                    {/* Credit Overdue */}
                    <View style={[styles.settingRow, !settings.enabled && styles.disabled]}>
                        <View style={styles.settingLeft}>
                            <View style={styles.iconLabel}>
                                <CreditCard size={16} color={Colors.error} />
                                <Text style={styles.settingLabel}>Credit Overdue Alerts</Text>
                            </View>
                            <Text style={styles.settingDesc}>
                                Get notified about overdue credits (after 7 days)
                            </Text>
                        </View>
                        <Switch
                            value={settings.creditOverdue}
                            onValueChange={(val) => updateSetting('creditOverdue', val)}
                            disabled={!settings.enabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={settings.creditOverdue ? Colors.surface : Colors.textLight}
                        />
                    </View>

                    {/* Daily Summary */}
                    <View style={[styles.settingRow, !settings.enabled && styles.disabled]}>
                        <View style={styles.settingLeft}>
                            <View style={styles.iconLabel}>
                                <TrendingUp size={16} color={Colors.success} />
                                <Text style={styles.settingLabel}>Daily Summary</Text>
                            </View>
                            <Text style={styles.settingDesc}>
                                Daily summary at 8 PM (sales, credits, inventory)
                            </Text>
                        </View>
                        <Switch
                            value={settings.dailySummary}
                            onValueChange={(val) => updateSetting('dailySummary', val)}
                            disabled={!settings.enabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={settings.dailySummary ? Colors.surface : Colors.textLight}
                        />
                    </View>
                </View>

                {/* Actions */}
                {/*                 <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TestTube size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Testing & Actions</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleTestNotification}
                        disabled={!settings.enabled}
                    >
                        <Bell size={18} color={settings.enabled ? Colors.primary : Colors.textLight} />
                        <Text style={[styles.actionText, !settings.enabled && styles.disabledText]}>
                            Send Test Notification
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleCheckAlerts}
                        disabled={!settings.enabled}
                    >
                        <Package size={18} color={settings.enabled ? Colors.primary : Colors.textLight} />
                        <Text style={[styles.actionText, !settings.enabled && styles.disabledText]}>
                            Check All Alerts Now
                        </Text>
                    </TouchableOpacity>
                </View> */}

                {/* Info */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>ℹ️ How Notifications Work</Text>
                    <Text style={styles.infoText}>
                        • <Text style={styles.infoBold}>Low Stock:</Text> Notifies when quantity reaches the threshold you set per item
                    </Text>
                    <Text style={styles.infoText}>
                        • <Text style={styles.infoBold}>Expiry:</Text> Alerts 7 days before expiry date
                    </Text>
                    <Text style={styles.infoText}>
                        • <Text style={styles.infoBold}>Credit Overdue:</Text> Notifies 7 days after credit was created
                    </Text>
                    <Text style={styles.infoText}>
                        • <Text style={styles.infoBold}>Daily Summary:</Text> Sent at 8 PM with your daily stats
                    </Text>
                    <Text style={[styles.infoText, { marginTop: Spacing.sm }]}>
                        Notifications are checked when you open the app or navigate to Inventory/Credits screens.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.surface,
        flex: 1,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    settingLeft: {
        flex: 1,
        marginRight: Spacing.md,
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: 4,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    settingDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    disabled: {
        opacity: 0.5,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    disabledText: {
        color: Colors.textLight,
    },
    infoSection: {
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    infoText: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 20,
        marginBottom: 4,
    },
    infoBold: {
        fontWeight: '600',
        color: Colors.text,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
        color: Colors.textSecondary,
    },
});

export default NotificationSettingsScreen;