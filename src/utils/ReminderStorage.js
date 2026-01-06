import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDERS_KEY = '@business_reminders';
const REMINDER_SETTINGS_KEY = '@reminder_settings';

class ReminderStorage {
    /**
     * Load all reminders
     */
    static async loadReminders() {
        try {
            const data = await AsyncStorage.getItem(REMINDERS_KEY);
            const reminders = data ? JSON.parse(data) : [];
            
            // Update overdue status
            const now = new Date().getTime();
            const updated = reminders.map(reminder => {
                if (reminder.status === 'active' && reminder.timestamp < now) {
                    return { ...reminder, status: 'overdue' };
                }
                return reminder;
            });
            
            // Save updated statuses
            if (updated.some((r, i) => r.status !== reminders[i].status)) {
                await this.saveReminders(updated);
            }
            
            return updated;
        } catch (error) {
            console.error('loadReminders error:', error);
            return [];
        }
    }

    /**
     * Save all reminders
     */
    static async saveReminders(reminders) {
        try {
            await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
            return true;
        } catch (error) {
            console.error('saveReminders error:', error);
            return false;
        }
    }

    /**
     * Add a new reminder
     */
    static async addReminder(reminderData) {
        try {
            const reminders = await this.loadReminders();
            
            const newReminder = {
                id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...reminderData,
                status: 'active',
                createdAt: new Date().toISOString(),
                completedAt: null,
                completedNotes: '',
            };
            
            reminders.push(newReminder);
            await this.saveReminders(reminders);
            
            console.log('✅ Reminder added:', newReminder.id);
            return newReminder;
        } catch (error) {
            console.error('addReminder error:', error);
            return null;
        }
    }

    /**
     * Update an existing reminder
     */
    static async updateReminder(reminderId, updates) {
        try {
            const reminders = await this.loadReminders();
            const index = reminders.findIndex(r => r.id === reminderId);
            
            if (index === -1) {
                console.error('Reminder not found:', reminderId);
                return false;
            }
            
            reminders[index] = {
                ...reminders[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            
            await this.saveReminders(reminders);
            console.log('✅ Reminder updated:', reminderId);
            return true;
        } catch (error) {
            console.error('updateReminder error:', error);
            return false;
        }
    }

    /**
     * Delete a reminder
     */
    static async deleteReminder(reminderId) {
        try {
            const reminders = await this.loadReminders();
            const filtered = reminders.filter(r => r.id !== reminderId);
            await this.saveReminders(filtered);
            console.log('✅ Reminder deleted:', reminderId);
            return true;
        } catch (error) {
            console.error('deleteReminder error:', error);
            return false;
        }
    }

    /**
     * Mark reminder as completed
     */
    static async markAsCompleted(reminderId, notes = '') {
        try {
            const reminders = await this.loadReminders();
            const index = reminders.findIndex(r => r.id === reminderId);
            
            if (index === -1) {
                console.error('Reminder not found:', reminderId);
                return false;
            }
            
            reminders[index] = {
                ...reminders[index],
                status: 'completed',
                completedAt: new Date().toISOString(),
                completedNotes: notes,
            };
            
            await this.saveReminders(reminders);
            console.log('✅ Reminder marked as completed:', reminderId);
            return true;
        } catch (error) {
            console.error('markAsCompleted error:', error);
            return false;
        }
    }

    /**
     * Mark reminder as active (undo complete)
     */
    static async markAsActive(reminderId) {
        try {
            const reminders = await this.loadReminders();
            const index = reminders.findIndex(r => r.id === reminderId);
            
            if (index === -1) {
                console.error('Reminder not found:', reminderId);
                return false;
            }
            
            const now = new Date().getTime();
            const status = reminders[index].timestamp < now ? 'overdue' : 'active';
            
            reminders[index] = {
                ...reminders[index],
                status: status,
                completedAt: null,
                completedNotes: '',
            };
            
            await this.saveReminders(reminders);
            console.log('✅ Reminder marked as active:', reminderId);
            return true;
        } catch (error) {
            console.error('markAsActive error:', error);
            return false;
        }
    }

    /**
     * Get reminders for today
     */
    static async getTodayReminders() {
        try {
            const reminders = await this.loadReminders();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            return reminders.filter(r => {
                const reminderDate = new Date(r.timestamp);
                return r.status === 'active' && 
                       reminderDate >= today && 
                       reminderDate < tomorrow;
            });
        } catch (error) {
            console.error('getTodayReminders error:', error);
            return [];
        }
    }

    /**
     * Get upcoming reminders (next 7 days)
     */
    static async getUpcomingReminders() {
        try {
            const reminders = await this.loadReminders();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            return reminders.filter(r => {
                const reminderDate = new Date(r.timestamp);
                return r.status === 'active' && 
                       reminderDate >= today && 
                       reminderDate < nextWeek;
            }).sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('getUpcomingReminders error:', error);
            return [];
        }
    }

    /**
     * Get overdue reminders
     */
    static async getOverdueReminders() {
        try {
            const reminders = await this.loadReminders();
            return reminders.filter(r => r.status === 'overdue')
                .sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('getOverdueReminders error:', error);
            return [];
        }
    }

    /**
     * Get active reminders
     */
    static async getActiveReminders() {
        try {
            const reminders = await this.loadReminders();
            return reminders.filter(r => r.status === 'active' || r.status === 'overdue')
                .sort((a, b) => {
                    // Overdue first, then by timestamp
                    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
                    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
                    return a.timestamp - b.timestamp;
                });
        } catch (error) {
            console.error('getActiveReminders error:', error);
            return [];
        }
    }

    /**
     * Get completed reminders
     */
    static async getCompletedReminders() {
        try {
            const reminders = await this.loadReminders();
            return reminders.filter(r => r.status === 'completed')
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        } catch (error) {
            console.error('getCompletedReminders error:', error);
            return [];
        }
    }

    /**
     * Get reminder statistics
     */
    static async getStats() {
        try {
            const reminders = await this.loadReminders();
            const today = await this.getTodayReminders();
            const upcoming = await this.getUpcomingReminders();
            const overdue = reminders.filter(r => r.status === 'overdue');
            const active = reminders.filter(r => r.status === 'active' || r.status === 'overdue');
            const completed = reminders.filter(r => r.status === 'completed');
            
            return {
                total: reminders.length,
                active: active.length,
                today: today.length,
                upcoming: upcoming.length,
                overdue: overdue.length,
                completed: completed.length,
            };
        } catch (error) {
            console.error('getStats error:', error);
            return {
                total: 0,
                active: 0,
                today: 0,
                upcoming: 0,
                overdue: 0,
                completed: 0,
            };
        }
    }

    /**
     * Get reminders by category
     */
    static async getRemindersByCategory(category) {
        try {
            const reminders = await this.loadReminders();
            return reminders.filter(r => r.category === category)
                .sort((a, b) => {
                    // Active/overdue first, then by timestamp
                    if ((a.status === 'active' || a.status === 'overdue') && 
                        b.status === 'completed') return -1;
                    if (a.status === 'completed' && 
                        (b.status === 'active' || b.status === 'overdue')) return 1;
                    return a.timestamp - b.timestamp;
                });
        } catch (error) {
            console.error('getRemindersByCategory error:', error);
            return [];
        }
    }

    /**
     * Search reminders
     */
    static async searchReminders(query) {
        try {
            const reminders = await this.loadReminders();
            const searchTerm = query.toLowerCase();
            
            return reminders.filter(r => {
                return r.title?.toLowerCase().includes(searchTerm) ||
                       r.description?.toLowerCase().includes(searchTerm) ||
                       r.categoryName?.toLowerCase().includes(searchTerm) ||
                       r.data?.personName?.toLowerCase().includes(searchTerm) ||
                       r.data?.supplierName?.toLowerCase().includes(searchTerm) ||
                       r.data?.customerName?.toLowerCase().includes(searchTerm);
            });
        } catch (error) {
            console.error('searchReminders error:', error);
            return [];
        }
    }

    /**
     * Clear all completed reminders older than X days
     */
    static async clearOldCompleted(daysOld = 30) {
        try {
            const reminders = await this.loadReminders();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const filtered = reminders.filter(r => {
                if (r.status !== 'completed') return true;
                if (!r.completedAt) return true;
                return new Date(r.completedAt) > cutoffDate;
            });
            
            await this.saveReminders(filtered);
            console.log(`✅ Cleared completed reminders older than ${daysOld} days`);
            return true;
        } catch (error) {
            console.error('clearOldCompleted error:', error);
            return false;
        }
    }
}

export default ReminderStorage;
