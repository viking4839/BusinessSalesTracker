import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'transactions';

async function loadTransactions() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch (e) {
        console.log('loadTransactions error', e);
        return [];
    }
}

async function saveTransactions(transactions) {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
    } catch (e) {
        console.log('saveTransactions error', e);
        return false;
    }
}

async function clearTransactions() {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        // Remove any related keys if they exist
        await AsyncStorage.multiRemove([
            'dailyTotals',
            'salesTarget',
            'businessProfile',
            'businessHours'
        ]);
        return true;
    } catch (e) {
        console.log('clearTransactions error', e);
        return false;
    }
}

async function debugDump() {
    const keys = await AsyncStorage.getAllKeys();
    const tx = await AsyncStorage.getItem(STORAGE_KEY);
    return { keys, txLength: tx ? tx.length : 0, txSample: tx ? tx.slice(0, 120) : null };
}

async function updateTransaction(transactionId, updates) {
    try {
        const transactions = await loadTransactions();
        const index = transactions.findIndex(t => t.id === transactionId);

        if (index === -1) {
            console.error('Transaction not found:', transactionId);
            return false;
        }

        // Update the transaction
        transactions[index] = {
            ...transactions[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await saveTransactions(transactions);
        console.log('✅ Transaction updated:', transactionId);
        return true;
    } catch (error) {
        console.error('updateTransaction error:', error);
        return false;
    }
}

async function addTransaction(transactionData) {
    try {
        const transactions = await loadTransactions();

        // Calculate profit if wholesalePrice is provided
        let profit = 0;
        let wholesalePrice = transactionData.wholesalePrice || 0;

        if (transactionData.amount && wholesalePrice) {
            // For credit payments, profit = amount - (wholesalePrice * quantity)
            const quantity = transactionData.quantity || 1;
            const costBasis = wholesalePrice * quantity;
            profit = transactionData.amount - costBasis;
        } else if (transactionData.profit) {
            profit = transactionData.profit;
        }

        const newTransaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: transactionData.type || 'sale',
            description: transactionData.description || '',
            amount: transactionData.amount || 0,
            customerName: transactionData.customerName || '',
            itemName: transactionData.itemName || '',
            quantity: transactionData.quantity || 1,
            unitPrice: transactionData.unitPrice || 0,
            wholesalePrice: wholesalePrice,
            profit: profit,
            linkedInventoryId: transactionData.linkedInventoryId || null,
            paymentMethod: transactionData.paymentMethod || 'cash',
            notes: transactionData.notes || '',
            isCredit: transactionData.paymentMethod === 'credit_cleared' || transactionData.paymentMethod === 'credit_payment',
            creditType: transactionData.paymentMethod === 'credit_cleared' ? 'cleared' :
                transactionData.paymentMethod === 'credit_payment' ? 'payment' : null,
            createdAt: new Date().toISOString(),
            date: new Date().toISOString(),
        };

        transactions.unshift(newTransaction);
        await saveTransactions(transactions);

        console.log('✅ Transaction added:', newTransaction.id, 'Profit:', profit);
        return newTransaction;
    } catch (error) {
        console.error('addTransaction error:', error);
        return null;
    }
}

export default {
    loadTransactions,
    saveTransactions,
    clearTransactions,
    debugDump,
    updateTransaction,
    addTransaction

};