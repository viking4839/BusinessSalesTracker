import AsyncStorage from '@react-native-async-storage/async-storage';

const INVENTORY_KEY = '@inventory_items';
const CATEGORIES_KEY = '@inventory_categories';

class InventoryStorage {
    // Load all inventory items
    async loadInventory() {
        try {
            const data = await AsyncStorage.getItem(INVENTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Load inventory error:', error);
            return [];
        }
    }

    // Save inventory items
    async saveInventory(items) {
        try {
            await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
            return true;
        } catch (error) {
            console.error('Save inventory error:', error);
            return false;
        }
    }

    // Add new item
    async addItem(itemData) {
        try {
            const items = await this.loadInventory();
            const newItem = {
                id: `inv_${Date.now()}`,
                name: itemData.name,
                category: itemData.category || 'Uncategorized',
                quantity: Number(itemData.quantity) || 0,
                unitPrice: Number(itemData.unitPrice) || 0,
                expiryDate: itemData.expiryDate || null,
                lowStockThreshold: itemData.lowStockThreshold || 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            items.push(newItem);
            await this.saveInventory(items);
            return newItem;
        } catch (error) {
            console.error('Add item error:', error);
            return null;
        }
    }

    // Update existing item
    async updateItem(itemId, updates) {
        try {
            const items = await this.loadInventory();
            const index = items.findIndex(item => item.id === itemId);

            if (index === -1) return false;

            items[index] = {
                ...items[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            await this.saveInventory(items);
            return true;
        } catch (error) {
            console.error('Update item error:', error);
            return false;
        }
    }

    // Delete item
    async deleteItem(itemId) {
        try {
            const items = await this.loadInventory();
            const filtered = items.filter(item => item.id !== itemId);
            await this.saveInventory(filtered);
            return true;
        } catch (error) {
            console.error('Delete item error:', error);
            return false;
        }
    }

    // Adjust quantity (increase/decrease stock)
    async adjustQuantity(itemId, changeAmount) {
        try {
            const items = await this.loadInventory();
            const item = items.find(i => i.id === itemId);

            if (!item) return false;

            const newQuantity = item.quantity + changeAmount;
            if (newQuantity < 0) return false; // Can't go negative

            return await this.updateItem(itemId, { quantity: newQuantity });
        } catch (error) {
            console.error('Adjust quantity error:', error);
            return false;
        }
    }

    // Load categories
    async loadCategories() {
        try {
            const data = await AsyncStorage.getItem(CATEGORIES_KEY);
            return data ? JSON.parse(data) : ['Drinks', 'Snacks', 'Household', 'Airtime', 'Cosmetics', 'Misc'];
        } catch (error) {
            console.error('Load categories error:', error);
            return ['Drinks', 'Snacks', 'Household', 'Airtime', 'Cosmetics', 'Misc'];
        }
    }

    // Add category
    async addCategory(categoryName) {
        try {
            const categories = await this.loadCategories();
            if (!categories.includes(categoryName)) {
                categories.push(categoryName);
                await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
            }
            return true;
        } catch (error) {
            console.error('Add category error:', error);
            return false;
        }
    }

    // Clear all inventory (for testing/debug)
    async clearInventory() {
        try {
            await AsyncStorage.removeItem(INVENTORY_KEY);
            return true;
        } catch (error) {
            console.error('Clear inventory error:', error);
            return false;
        }
    }
}

export default new InventoryStorage();