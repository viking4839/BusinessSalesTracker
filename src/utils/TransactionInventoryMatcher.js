// utils/TransactionInventoryMatcher.js
import TransactionStorage from './TransactionStorage';
import InventoryStorage from './InventoryStorage';
import ProfitReportStorage from './ProfitReportStorage';

export const TransactionInventoryMatcher = {
  /**
   * Confirm inventory match for a transaction
   */
  async confirmMatch(transaction, selectedItem, quantity) {
    try {
      console.log(`🔗 Linking transaction ${transaction.id} to ${selectedItem.name}`);
      
      // Step 1: Deduct inventory
      const success = await InventoryStorage.adjustQuantity(selectedItem.id, -quantity);
      if (!success) {
        throw new Error('Failed to update inventory');
      }
      
      // Step 2: Update transaction with confirmed match
      const updates = {
        inventoryMatch: {
          ...transaction.inventoryMatch,
          userConfirmed: true,
          confirmedAt: new Date().toISOString(),
          confirmedItem: selectedItem,
          confirmedQuantity: quantity
        },
        linkedInventoryId: selectedItem.id,
        linkedInventoryName: selectedItem.name,
        saleQuantity: quantity,
        stockDeducted: true,
        // Add items array for profit report
        items: [{
          id: selectedItem.id,
          name: selectedItem.name,
          quantity: quantity,
          unitPrice: selectedItem.unitPrice,
          wholesalePrice: selectedItem.wholesalePrice || selectedItem.unitPrice,
          total: selectedItem.unitPrice * quantity
        }]
      };
      
      const updated = await TransactionStorage.updateTransaction(transaction.id, updates);
      if (!updated) {
        throw new Error('Failed to update transaction');
      }
      
      // Step 3: Refresh profit report
      await ProfitReportStorage.refreshTodaysReport();
      
      console.log('✅ Match confirmed and profit report updated');
      return true;
      
    } catch (error) {
      console.error('confirmMatch error:', error);
      throw error;
    }
  },

  /**
   * Dismiss inventory match suggestion
   */
  async dismissMatch(transaction) {
    try {
      const updates = {
        inventoryMatch: {
          ...transaction.inventoryMatch,
          userDismissed: true,
          dismissedAt: new Date().toISOString()
        }
      };
      
      const updated = await TransactionStorage.updateTransaction(transaction.id, updates);
      console.log('❌ Match dismissed for transaction:', transaction.id);
      return updated;
      
    } catch (error) {
      console.error('dismissMatch error:', error);
      throw error;
    }
  }
};

export default TransactionInventoryMatcher;