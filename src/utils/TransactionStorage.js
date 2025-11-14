import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@business_tracker_transactions';
const BUSINESS_PROFILE_KEY = '@business_tracker_profile';

class TransactionStorage {
    // Save transactions
    async saveTransactions(transactions) {
        try {
            await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
            return true;
        } catch (error) {
            console.error('Error saving transactions:', error);
            return false;
        }
    }

    // Load transactions
    async loadTransactions() {
        try {
            const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading transactions:', error);
            return [];
        }
    }

    // Add single transaction
    async addTransaction(transaction) {
        try {
            const transactions = await this.loadTransactions();
            transactions.unshift(transaction); // Add to beginning
            await this.saveTransactions(transactions);
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            return false;
        }
    }

    // Delete transaction
    async deleteTransaction(transactionId) {
        try {
            const transactions = await this.loadTransactions();
            const filtered = transactions.filter(t => t.id !== transactionId);
            await this.saveTransactions(filtered);
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            return false;
        }
    }

    // Update transaction
    async updateTransaction(transactionId, updates) {
        try {
            const transactions = await this.loadTransactions();
            const index = transactions.findIndex(t => t.id === transactionId);
            if (index !== -1) {
                transactions[index] = { ...transactions[index], ...updates };
                await this.saveTransactions(transactions);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating transaction:', error);
            return false;
        }
    }

    // Clear all transactions
    async clearAllTransactions() {
        try {
            await AsyncStorage.removeItem(TRANSACTIONS_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing transactions:', error);
            return false;
        }
    }

    // Save business profile
    async saveBusinessProfile(profile) {
        try {
            await AsyncStorage.setItem(BUSINESS_PROFILE_KEY, JSON.stringify(profile));
            return true;
        } catch (error) {
            console.error('Error saving business profile:', error);
            return false;
        }
    }

    // Load business profile
    async loadBusinessProfile() {
        try {
            const data = await AsyncStorage.getItem(BUSINESS_PROFILE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading business profile:', error);
            return null;
        }
    }

    // Get transactions by date range
    async getTransactionsByDateRange(startDate, endDate) {
        try {
            const transactions = await this.loadTransactions();
            return transactions.filter(t => {
                const transactionDate = new Date(t.timestamp);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        } catch (error) {
            console.error('Error filtering transactions:', error);
            return [];
        }
    }

    // Get transactions by type
    async getTransactionsByType(type) {
        try {
            const transactions = await this.loadTransactions();
            return transactions.filter(t => t.type === type);
        } catch (error) {
            console.error('Error filtering by type:', error);
            return [];
        }
    }
}

export default new TransactionStorage();