import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InventoryStorage from '../utils/InventoryStorage.js';
import CreditStorage from '../utils/CreditStorage';

const CHANNEL_ID = 'trackbiz-alerts';
const SETTINGS_KEY = '@notification_settings';

class NotificationService {
    /**
     * Initialize notification service
     * - Request permissions
     * - Create notification channel
     */
    static async initialize() {
        try {
            // Request permission
            await notifee.requestPermission();

            // Create channel
            await notifee.createChannel({
                id: CHANNEL_ID,
                name: 'TrackBiz Alerts',
                importance: 4,
                sound: 'default',
                vibration: true,
            });

            console.log('✅ Notification service initialized');
            return true;
        } catch (error) {
            console.error('Notification init error:', error);
            return false;
        }
    }

    /**
     * Check if notifications are enabled in settings
     */
    static async areNotificationsEnabled() {
        try {
            const settings = await AsyncStorage.getItem(SETTINGS_KEY);
            if (!settings) return true; // Default to enabled
            const parsed = JSON.parse(settings);
            return parsed.enabled !== false;
        } catch (error) {
            console.error('Check notifications error:', error);
            return true;
        }
    }

    /**
     * Save notification settings
     */
    static async saveSettings(settings) {
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Save settings error:', error);
            return false;
        }
    }

    /**
     * Load notification settings
     */
    static async loadSettings() {
        try {
            const raw = await AsyncStorage.getItem(SETTINGS_KEY);
            if (!raw) {
                return {
                    enabled: true,
                    lowStock: true,
                    expiry: true,
                    creditOverdue: true,
                    dailySummary: false,
                };
            }
            return JSON.parse(raw);
        } catch (error) {
            console.error('Load settings error:', error);
            return {
                enabled: true,
                lowStock: true,
                expiry: true,
                creditOverdue: true,
                dailySummary: false,
            };
        }
    }

    /**
     * Show notification (internal helper)
     */
    static async _showNotification(title, body, data = {}) {
        const enabled = await this.areNotificationsEnabled();
        if (!enabled) return null;

        try {
            return await notifee.displayNotification({
                title,
                body,
                android: {
                    channelId: CHANNEL_ID,
                    smallIcon: 'ic_launcher',
                    pressAction: {
                        id: 'default',
                    },
                },
                data,
            });
        } catch (error) {
            console.error('Show notification error:', error);
            return null;
        }
    }

    /**
     * LOW STOCK ALERT
     */
    static async notifyLowStock(itemName, quantity, threshold) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.lowStock) return null;

        return await this._showNotification(
            '⚠️ Low Stock Alert',
            `${itemName} is running low (${quantity} left, threshold: ${threshold})`,
            { type: 'low_stock', itemName, quantity }
        );
    }

    /**
     * EXPIRY ALERT
     */
    static async notifyExpiry(itemName, expiryDate, daysUntilExpiry) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.expiry) return null;

        let urgency = '';
        if (daysUntilExpiry <= 0) urgency = '🚨 EXPIRED';
        else if (daysUntilExpiry <= 3) urgency = '🔴 Expires Soon';
        else urgency = '⚠️ Expiry Warning';

        return await this._showNotification(
            urgency,
            `${itemName} expires on ${new Date(expiryDate).toLocaleDateString()} (${daysUntilExpiry} days)`,
            { type: 'expiry', itemName, expiryDate, daysUntilExpiry }
        );
    }

    /**
     * CREDIT OVERDUE ALERT
     */
    static async notifyCreditOverdue(customerName, daysOverdue, amount) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.creditOverdue) return null;

        return await this._showNotification(
            '💳 Credit Overdue',
            `${customerName} is overdue by ${daysOverdue} day(s). Balance: Ksh ${amount.toLocaleString()}`,
            { type: 'credit_overdue', customerName, daysOverdue, amount }
        );
    }

    /**
     * MULTIPLE LOW STOCK ITEMS
     */
    static async notifyMultipleLowStock(count) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.lowStock) return null;

        return await this._showNotification(
            '⚠️ Multiple Low Stock Items',
            `${count} items are running low. Check your inventory.`,
            { type: 'multiple_low_stock', count }
        );
    }

    /**
     * MULTIPLE OVERDUE CREDITS
     */
    static async notifyMultipleOverdue(count, totalAmount) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.creditOverdue) return null;

        return await this._showNotification(
            '💳 Multiple Overdue Credits',
            `${count} customers are overdue. Total: Ksh ${totalAmount.toLocaleString()}`,
            { type: 'multiple_overdue', count, totalAmount }
        );
    }

    /**
     * DAILY SUMMARY NOTIFICATION
     */
    static async notifyDailySummary(salesCount, revenue, pendingCredits) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.dailySummary) return null;

        return await this._showNotification(
            '📊 Daily Summary',
            `Sales: ${salesCount} | Revenue: Ksh ${revenue.toLocaleString()} | Credits: Ksh ${pendingCredits.toLocaleString()}`,
            { type: 'daily_summary', salesCount, revenue, pendingCredits }
        );
    }

    /**
     * PAYMENT RECEIVED
     */
    static async notifyPaymentReceived(customerName, amount) {
        const settings = await this.loadSettings();
        if (!settings.enabled) return null;

        return await this._showNotification(
            '✅ Payment Received',
            `${customerName} paid Ksh ${amount.toLocaleString()}`,
            { type: 'payment_received', customerName, amount }
        );
    }

    /**
     * CHECK ALL ALERTS (Run on app startup or periodically)
     */
    static async checkAllAlerts() {
        try {
            const settings = await this.loadSettings();
            if (!settings.enabled) return;

            // Check inventory alerts
            await this.checkInventoryAlerts();

            // Check credit alerts
            await this.checkCreditAlerts();

            console.log('✅ All alerts checked');
        } catch (error) {
            console.error('Check all alerts error:', error);
        }
    }

    /**
     * CHECK INVENTORY ALERTS
     */
    static async checkInventoryAlerts() {
        try {
            const items = await InventoryStorage.loadInventory();
            const settings = await this.loadSettings();

            if (!settings.enabled) return;

            let lowStockItems = [];
            let expiringItems = [];

            const today = new Date();

            items.forEach(item => {
                // Check low stock
                if (settings.lowStock && item.quantity <= (item.lowStockThreshold || 5)) {
                    lowStockItems.push(item);
                }

                // Check expiry
                if (settings.expiry && item.expiryDate) {
                    const expiryDate = new Date(item.expiryDate);
                    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    // Alert if expires within 7 days or already expired
                    if (daysUntilExpiry <= 7) {
                        expiringItems.push({ item, daysUntilExpiry });
                    }
                }
            });

            // Send notifications
            if (lowStockItems.length === 1) {
                const item = lowStockItems[0];
                await this.notifyLowStock(item.name, item.quantity, item.lowStockThreshold || 5);
            } else if (lowStockItems.length > 1) {
                await this.notifyMultipleLowStock(lowStockItems.length);
            }

            // Send expiry notifications (prioritize most urgent)
            expiringItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
            for (let i = 0; i < Math.min(3, expiringItems.length); i++) {
                const { item, daysUntilExpiry } = expiringItems[i];
                await this.notifyExpiry(item.name, item.expiryDate, daysUntilExpiry);
            }

        } catch (error) {
            console.error('Check inventory alerts error:', error);
        }
    }

    /**
     * CHECK CREDIT ALERTS
     */
    static async checkCreditAlerts() {
        try {
            const credits = await CreditStorage.loadCredits();
            const settings = await this.loadSettings();

            if (!settings.enabled || !settings.creditOverdue) return;

            const today = new Date();
            let overdueCredits = [];

            credits.forEach(credit => {
                if (credit.status !== 'pending') return;

                const createdDate = new Date(credit.dateCreated);
                const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

                // Alert if older than 7 days
                if (daysOld > 7) {
                    overdueCredits.push({
                        ...credit,
                        daysOverdue: daysOld - 7 // Days past the 7-day grace period
                    });
                }
            });

            // Send notifications
            if (overdueCredits.length === 1) {
                const credit = overdueCredits[0];
                await this.notifyCreditOverdue(
                    credit.customerName,
                    credit.daysOverdue,
                    credit.remainingBalance
                );
            } else if (overdueCredits.length > 1) {
                const totalAmount = overdueCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
                await this.notifyMultipleOverdue(overdueCredits.length, totalAmount);
            }

        } catch (error) {
            console.error('Check credit alerts error:', error);
        }
    }

    /**
     * SCHEDULE DAILY SUMMARY (runs at 8 PM every day)
     */
    static async scheduleDailySummary() {
        try {
            const settings = await this.loadSettings();
            if (!settings.enabled || !settings.dailySummary) return;

            // Cancel existing scheduled notifications
            await notifee.cancelAllNotifications();

            // Calculate time until 8 PM today
            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(20, 0, 0, 0); // 8 PM

            // If 8 PM has passed, schedule for tomorrow
            if (now > scheduledTime) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            await notifee.createTriggerNotification(
                {
                    title: '📊 Time for Your Daily Summary',
                    body: 'Check your sales and credits for today.',
                    android: {
                        channelId: CHANNEL_ID,
                        smallIcon: 'ic_launcher',
                    },
                },
                {
                    type: TriggerType.TIMESTAMP,
                    timestamp: scheduledTime.getTime(),
                    repeatFrequency: RepeatFrequency.DAILY,
                }
            );

            console.log('✅ Daily summary scheduled for 8 PM');
        } catch (error) {
            console.error('Schedule daily summary error:', error);
        }
    }

    /**
     * CANCEL ALL SCHEDULED NOTIFICATIONS
     */
    static async cancelAllScheduled() {
        try {
            await notifee.cancelAllNotifications();
            console.log('✅ All scheduled notifications cancelled');
        } catch (error) {
            console.error('Cancel notifications error:', error);
        }
    }

    /**
     * TEST NOTIFICATION (for debugging)
     */
    static async testNotification() {
        return await this._showNotification(
            '🧪 Test Notification',
            'This is a test notification from TrackBiz',
            { type: 'test' }
        );
    }
}

export default NotificationService;