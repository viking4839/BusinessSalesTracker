import AsyncStorage from '@react-native-async-storage/async-storage';

const INVENTORY_KEY = '@inventory_items';
const CATEGORIES_KEY = '@inventory_categories';

class InventoryStorage {
    static async loadInventory() {
        try {
            const data = await AsyncStorage.getItem(INVENTORY_KEY);
            const items = data ? JSON.parse(data) : [];

            // ✅ FIXED: Ensure all items have the new wholesale price fields with defaults
            return items.map(item => ({
                ...item,
                wholesalePrice: item.wholesalePrice || item.unitPrice, // Default to retail price if not set
                supplier: item.supplier || '',
                profitPerUnit: item.profitPerUnit || (item.unitPrice - (item.wholesalePrice || item.unitPrice)),
                profitMargin: item.profitMargin || 0,
                totalCost: item.totalCost || (item.quantity * (item.wholesalePrice || item.unitPrice)),
                totalPotentialProfit: item.totalPotentialProfit || (item.quantity * (item.unitPrice - (item.wholesalePrice || item.unitPrice)))
            }));
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
            const wholesalePrice = item.wholesalePrice || item.unitPrice;
            const profitPerUnit = item.unitPrice - wholesalePrice;
            const profitMargin = item.unitPrice > 0 ? (profitPerUnit / item.unitPrice * 100) : 0;

            const newItem = {
                ...item,
                id: `inv_${Date.now()}`,
                wholesalePrice: wholesalePrice,
                profitPerUnit: profitPerUnit,
                profitMargin: Number(profitMargin.toFixed(1)),
                totalCost: item.quantity * wholesalePrice,
                totalPotentialProfit: item.quantity * profitPerUnit,
                supplier: item.supplier || '',
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

            let calculatedUpdates = {};

            if (updates.unitPrice !== undefined || updates.wholesalePrice !== undefined || updates.quantity !== undefined) {
                const unitPrice = updates.unitPrice !== undefined ? updates.unitPrice : items[index].unitPrice;
                const wholesalePrice = updates.wholesalePrice !== undefined ? updates.wholesalePrice : items[index].wholesalePrice;
                const quantity = updates.quantity !== undefined ? updates.quantity : items[index].quantity;

                const profitPerUnit = unitPrice - wholesalePrice;
                const profitMargin = unitPrice > 0 ? (profitPerUnit / unitPrice * 100) : 0;

                calculatedUpdates = {
                    ...calculatedUpdates,
                    profitPerUnit: profitPerUnit,
                    profitMargin: Number(profitMargin.toFixed(1)),
                    totalCost: quantity * wholesalePrice,
                    totalPotentialProfit: quantity * profitPerUnit,
                };
            }

            items[index] = {
                ...items[index],
                ...updates,
                ...calculatedUpdates,
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
            items[index].totalCost = newQuantity * items[index].wholesalePrice;
            items[index].totalPotentialProfit = newQuantity * items[index].profitPerUnit;
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

    // ✅ NEW: Get inventory statistics
    static async getInventoryStats() {
        try {
            const items = await this.loadInventory();

            const totalStockValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const totalCostValue = items.reduce((sum, item) => sum + (item.quantity * item.wholesalePrice), 0);
            const totalPotentialProfit = items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice - item.wholesalePrice)), 0);

            const lowMarginItems = items.filter(item => {
                const margin = ((item.unitPrice - item.wholesalePrice) / item.unitPrice * 100);
                return margin < 10 && item.quantity > 0;
            });

            const bestValueItems = items
                .filter(item => item.quantity > 0)
                .sort((a, b) => {
                    const profitA = a.unitPrice - a.wholesalePrice;
                    const profitB = b.unitPrice - b.wholesalePrice;
                    return profitB - profitA;
                })
                .slice(0, 5);

            return {
                totalStockValue,
                totalCostValue,
                totalPotentialProfit,
                lowMarginItems,
                bestValueItems,
            };
        } catch (error) {
            console.error('getInventoryStats error:', error);
            return null;
        }
    }

    // ✅ NEW: Get items by profitability
    static async getItemsByProfitability() {
        try {
            const items = await this.loadInventory();

            return items
                .filter(item => item.quantity > 0)
                .sort((a, b) => {
                    const profitMarginA = a.profitMargin || 0;
                    const profitMarginB = b.profitMargin || 0;
                    return profitMarginB - profitMarginA;
                });
        } catch (error) {
            console.error('getItemsByProfitability error:', error);
            return [];
        }
    }

    // ✅ NEW: Record a sale
    static async recordSale(itemId, quantitySold, salePrice) {
        try {
            const items = await this.loadInventory();
            const index = items.findIndex(item => item.id === itemId);

            if (index === -1) {
                console.error('Item not found:', itemId);
                return null;
            }

            // Calculate sale details
            const actualSalePrice = salePrice || items[index].unitPrice;
            const wholesalePrice = items[index].wholesalePrice;
            const profitPerUnit = actualSalePrice - wholesalePrice;
            const totalProfit = profitPerUnit * quantitySold;

            // Update inventory
            items[index].quantity -= quantitySold;
            items[index].totalCost = items[index].quantity * wholesalePrice;
            items[index].totalPotentialProfit = items[index].quantity * items[index].profitPerUnit;
            items[index].updatedAt = new Date().toISOString();

            await this.saveInventory(items);

            // Return sale data for profit reporting
            return {
                itemId,
                itemName: items[index].name,
                quantity: quantitySold,
                retailPrice: actualSalePrice,
                wholesalePrice: wholesalePrice,
                profit: totalProfit,
                profitPerUnit: profitPerUnit,
                profitMargin: actualSalePrice > 0 ? (profitPerUnit / actualSalePrice * 100) : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('recordSale error:', error);
            return null;
        }
    }
}

export default InventoryStorage;