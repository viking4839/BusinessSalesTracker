import AsyncStorage from '@react-native-async-storage/async-storage';

const INVENTORY_KEY = '@inventory_items';
const CATEGORIES_KEY = '@inventory_categories';

class InventoryStorage {
    static async loadInventory() {
        try {
            const data = await AsyncStorage.getItem(INVENTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('loadInventory error:', error);
            return [];
        }
    }

    static async saveInventory(items) {
        try {
            await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
            return true;
        } catch (error) {
            console.error('saveInventory error:', error);
            return false;
        }
    }

    static async addItem(item) {
        try {
            const items = await this.loadInventory();
            const newItem = {
                ...item,
                id: `inv_${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            items.push(newItem);
            await this.saveInventory(items);
            return newItem;
        } catch (error) {
            console.error('addItem error:', error);
            return null;
        }
    }

    static async updateItem(itemId, updates) {
        try {
            const items = await this.loadInventory();
            const index = items.findIndex(item => item.id === itemId);

            if (index === -1) {
                console.error('Item not found:', itemId);
                return false;
            }

            items[index] = {
                ...items[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            await this.saveInventory(items);
            console.log('✅ Item updated:', items[index]);
            return true;
        } catch (error) {
            console.error('updateItem error:', error);
            return false;
        }
    }

    static async deleteItem(itemId) {
        try {
            const items = await this.loadInventory();
            const filtered = items.filter(item => item.id !== itemId);
            await this.saveInventory(filtered);
            return true;
        } catch (error) {
            console.error('deleteItem error:', error);
            return false;
        }
    }

    static async adjustQuantity(itemId, delta) {
        try {
            const items = await this.loadInventory();
            const index = items.findIndex(item => item.id === itemId);

            if (index === -1) {
                console.error('Item not found:', itemId);
                return false;
            }

            const newQuantity = items[index].quantity + delta;

            if (newQuantity < 0) {
                console.error('Cannot have negative quantity');
                return false;
            }

            items[index].quantity = newQuantity;
            items[index].updatedAt = new Date().toISOString();

            await this.saveInventory(items);
            console.log(`✅ Quantity adjusted: ${items[index].name} (${delta >= 0 ? '+' : ''}${delta}) = ${newQuantity}`);
            return true;
        } catch (error) {
            console.error('adjustQuantity error:', error);
            return false;
        }
    }

    // ✅ NEW: Load categories
    static async loadCategories() {
        try {
            const data = await AsyncStorage.getItem(CATEGORIES_KEY);
            if (data) {
                return JSON.parse(data);
            }

            // If no categories stored, extract from inventory items
            const items = await this.loadInventory();
            const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

            if (categories.length > 0) {
                await this.saveCategories(categories);
            }

            return categories;
        } catch (error) {
            console.error('loadCategories error:', error);
            return [];
        }
    }

    // ✅ NEW: Save categories
    static async saveCategories(categories) {
        try {
            await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
            return true;
        } catch (error) {
            console.error('saveCategories error:', error);
            return false;
        }
    }

    // ✅ NEW: Add a new category
    static async addCategory(categoryName) {
        try {
            const categories = await this.loadCategories();
            if (!categories.includes(categoryName)) {
                categories.push(categoryName);
                await this.saveCategories(categories);
            }
            return true;
        } catch (error) {
            console.error('addCategory error:', error);
            return false;
        }
    }
}

export default InventoryStorage;