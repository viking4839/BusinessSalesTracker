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
            customerPhone: transactionData.customerPhone || '',
            itemName: transactionData.itemName || '',
            quantity: transactionData.quantity || 1,
            unitPrice: transactionData.unitPrice || 0,
            wholesalePrice: wholesalePrice,
            profit: profit,
            linkedInventoryId: transactionData.linkedInventoryId || null,
            paymentMethod: transactionData.paymentMethod || 'cash',
            notes: transactionData.notes || '',
            isSplitPayment: transactionData.isSplitPayment || false,
            splitPayments: transactionData.splitPayments || null,
            splitTotal: transactionData.splitTotal || null,
            paymentBreakdown: transactionData.paymentBreakdown || null,
            items: transactionData.items || [],
            isMultiItem: transactionData.isMultiItem || false,
            linkedInventoryName: transactionData.linkedInventoryName || null,
            saleQuantity: transactionData.saleQuantity || null,
            saleUnitPrice: transactionData.saleUnitPrice || null,
            discount: transactionData.discount || null,
            subtotal: transactionData.subtotal || null,
            isCredit: transactionData.paymentMethod === 'credit_cleared' || transactionData.paymentMethod === 'credit_payment',
            creditType: transactionData.paymentMethod === 'credit_cleared' ? 'cleared' :
            transactionData.paymentMethod === 'credit_payment' ? 'payment' : null,
            
            // Timestamps
            createdAt: new Date().toISOString(),
            date: transactionData.timestamp || new Date().toISOString(),
            timestamp: transactionData.timestamp || new Date().toISOString(),
        };

        transactions.unshift(newTransaction);
        await saveTransactions(transactions);

        // Debug logging
        console.log('✅ Transaction added:', newTransaction.id);
        if (newTransaction.isSplitPayment) {
            console.log('   💰 Split payment detected:');
            console.log('      Cash:', newTransaction.splitPayments.cash);
            console.log('      M-Pesa:', newTransaction.splitPayments.mpesa);
            console.log('      Bank:', newTransaction.splitPayments.bank);
            console.log('      Total:', newTransaction.splitTotal);
        }
        if (newTransaction.profit) {
            console.log('   📊 Profit:', profit);
        }
        
        return newTransaction;
    } catch (error) {
        console.error('addTransaction error:', error);
        return null;
    }
}

async function deleteTransaction(transactionId) {
    try {
        const transactions = await loadTransactions();
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        await saveTransactions(updatedTransactions);
        console.log('✅ Transaction deleted:', transactionId);
        return true;
    } catch (error) {
        console.error('deleteTransaction error:', error);
        return false;
    }
}

export default {
    loadTransactions,
    saveTransactions,
    clearTransactions,
    debugDump,
    updateTransaction,
    addTransaction,
    deleteTransaction
};