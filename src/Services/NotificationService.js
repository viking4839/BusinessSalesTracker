import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InventoryStorage from '../utils/InventoryStorage.js';
import CreditStorage from '../utils/CreditStorage';

const CHANNEL_ID = 'trackbiz-alerts';
const SETTINGS_KEY = '@notification_settings';
const NOTIFICATION_HISTORY_KEY = '@notification_history';

class NotificationService {
    /**
     * Initialize notification service
     * - Request permissions
     * - Create notification channel
     */
    static async initialize() {
        try {
            await notifee.requestPermission();

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
            if (!settings) return true;
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
     * NOTIFICATION HISTORY TRACKING
     * Format: { "low_stock_item123": timestamp, "expiry_item456": timestamp, ... }
     */
    static async getNotificationHistory() {
        try {
            const raw = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.error('Get notification history error:', error);
            return {};
        }
    }

    static async saveNotificationHistory(history) {
        try {
            await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('Save notification history error:', error);
        }
    }

    /**
     * Check if notification was sent recently (within cooldown period)
     * @param {string} notificationKey - Unique identifier for the notification
     * @param {number} cooldownHours - Hours before resending same notification (default: 24)
     */
    static async wasNotifiedRecently(notificationKey, cooldownHours = 24) {
        const history = await this.getNotificationHistory();
        const lastSent = history[notificationKey];

        if (!lastSent) return false;

        const hoursSinceLastSent = (Date.now() - lastSent) / (1000 * 60 * 60);
        return hoursSinceLastSent < cooldownHours;
    }

    /**
     * Mark notification as sent
     */
    static async markNotificationSent(notificationKey) {
        const history = await this.getNotificationHistory();
        history[notificationKey] = Date.now();

        // Clean up old entries (older than 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        Object.keys(history).forEach(key => {
            if (history[key] < sevenDaysAgo) {
                delete history[key];
            }
        });

        await this.saveNotificationHistory(history);
    }

    /**
     * Clear notification history (useful for testing or manual reset)
     */
    static async clearNotificationHistory() {
        try {
            await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
            console.log('✅ Notification history cleared');
        } catch (error) {
            console.error('Clear notification history error:', error);
        }
    }

    /**
     * Show notification (internal helper)
     */
    static async _showNotification(title, body, data = {}, notificationKey = null) {
        const enabled = await this.areNotificationsEnabled();
        if (!enabled) return null;

        // Check if already notified recently (if key provided)
        if (notificationKey) {
            const alreadyNotified = await this.wasNotifiedRecently(notificationKey);
            if (alreadyNotified) {
                console.log(`⏭️ Skipping duplicate notification: ${notificationKey}`);
                return null;
            }
        }

        try {
            const notificationId = await notifee.displayNotification({
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

            // Mark as sent
            if (notificationKey) {
                await this.markNotificationSent(notificationKey);
            }

            return notificationId;
        } catch (error) {
            console.error('Show notification error:', error);
            return null;
        }
    }

    /**
     * LOW STOCK ALERT
     */
    static async notifyLowStock(itemName, quantity, threshold, itemId) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.lowStock) return null;

        const notificationKey = `low_stock_${itemId}`;
        return await this._showNotification(
            '⚠️ Low Stock Alert',
            `${itemName} is running low (${quantity} left, threshold: ${threshold})`,
            { type: 'low_stock', itemName, quantity, itemId },
            notificationKey
        );
    }

    /**
     * EXPIRY ALERT
     */
    static async notifyExpiry(itemName, expiryDate, daysUntilExpiry, itemId) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.expiry) return null;

        let urgency = '';
        if (daysUntilExpiry <= 0) urgency = '🚨 EXPIRED';
        else if (daysUntilExpiry <= 3) urgency = '🔴 Expires Soon';
        else urgency = '⚠️ Expiry Warning';

        const notificationKey = `expiry_${itemId}_${daysUntilExpiry}`;
        return await this._showNotification(
            urgency,
            `${itemName} expires on ${new Date(expiryDate).toLocaleDateString()} (${daysUntilExpiry} days)`,
            { type: 'expiry', itemName, expiryDate, daysUntilExpiry, itemId },
            notificationKey
        );
    }

    /**
     * CREDIT OVERDUE ALERT
     */
    static async notifyCreditOverdue(customerName, daysOverdue, amount, creditId) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.creditOverdue) return null;

        const notificationKey = `credit_overdue_${creditId}`;
        return await this._showNotification(
            '💳 Credit Overdue',
            `${customerName} is overdue by ${daysOverdue} day(s). Balance: Ksh ${amount.toLocaleString()}`,
            { type: 'credit_overdue', customerName, daysOverdue, amount, creditId },
            notificationKey
        );
    }

    /**
     * MULTIPLE LOW STOCK ITEMS
     */
    static async notifyMultipleLowStock(count) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.lowStock) return null;

        // Create a key based on count to avoid spam
        const notificationKey = `multiple_low_stock_${count}`;
        return await this._showNotification(
            '⚠️ Multiple Low Stock Items',
            `${count} items are running low. Check your inventory.`,
            { type: 'multiple_low_stock', count },
            notificationKey
        );
    }

    /**
     * MULTIPLE OVERDUE CREDITS
     */
    static async notifyMultipleOverdue(count, totalAmount) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.creditOverdue) return null;

        const notificationKey = `multiple_overdue_${count}`;
        return await this._showNotification(
            '💳 Multiple Overdue Credits',
            `${count} customers are overdue. Total: Ksh ${totalAmount.toLocaleString()}`,
            { type: 'multiple_overdue', count, totalAmount },
            notificationKey
        );
    }

    /**
     * DAILY SUMMARY NOTIFICATION
     */
    static async notifyDailySummary(salesCount, revenue, pendingCredits) {
        const settings = await this.loadSettings();
        if (!settings.enabled || !settings.dailySummary) return null;

        // Daily summaries don't need deduplication - they're scheduled
        return await this._showNotification(
            '📊 Daily Summary',
            `Sales: ${salesCount} | Revenue: Ksh ${revenue.toLocaleString()} | Credits: Ksh ${pendingCredits.toLocaleString()}`,
            { type: 'daily_summary', salesCount, revenue, pendingCredits }
        );
    }

    /**
     * PAYMENT RECEIVED
     */
    static async notifyPaymentReceived(customerName, amount, creditId) {
        const settings = await this.loadSettings();
        if (!settings.enabled) return null;

        const notificationKey = `payment_${creditId}_${Date.now()}`;
        return await this._showNotification(
            '✅ Payment Received',
            `${customerName} paid Ksh ${amount.toLocaleString()}`,
            { type: 'payment_received', customerName, amount },
            notificationKey
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
     * CHECK INVENTORY ALERTS (with deduplication)
     */
    static async checkInventoryAlerts() {
        try {
            const items = await InventoryStorage.loadInventory();
            const settings = await this.loadSettings();

            if (!settings.enabled) return;

            let lowStockItems = [];
            let expiringItems = [];

            const today = new Date();

            for (const item of items) {
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
            }

            // Send notifications (with deduplication)
            if (lowStockItems.length === 1) {
                const item = lowStockItems[0];
                await this.notifyLowStock(
                    item.name,
                    item.quantity,
                    item.lowStockThreshold || 5,
                    item.id
                );
            } else if (lowStockItems.length > 1) {
                await this.notifyMultipleLowStock(lowStockItems.length);
            }

            // Send expiry notifications (prioritize most urgent)
            expiringItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
            for (let i = 0; i < Math.min(3, expiringItems.length); i++) {
                const { item, daysUntilExpiry } = expiringItems[i];
                await this.notifyExpiry(
                    item.name,
                    item.expiryDate,
                    daysUntilExpiry,
                    item.id
                );
            }

        } catch (error) {
            console.error('Check inventory alerts error:', error);
        }
    }

    /**
     * CHECK CREDIT ALERTS (with deduplication)
     */
    static async checkCreditAlerts() {
        try {
            const credits = await CreditStorage.loadCredits();
            const settings = await this.loadSettings();

            if (!settings.enabled || !settings.creditOverdue) return;

            const today = new Date();
            let overdueCredits = [];

            for (const credit of credits) {
                if (credit.status !== 'pending') continue;

                const createdDate = new Date(credit.dateCreated);
                const daysOld = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

                // Alert if older than 7 days
                if (daysOld > 7) {
                    overdueCredits.push({
                        ...credit,
                        daysOverdue: daysOld - 7
                    });
                }
            }

            // Send notifications (with deduplication)
            if (overdueCredits.length === 1) {
                const credit = overdueCredits[0];
                await this.notifyCreditOverdue(
                    credit.customerName,
                    credit.daysOverdue,
                    credit.remainingBalance,
                    credit.id
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