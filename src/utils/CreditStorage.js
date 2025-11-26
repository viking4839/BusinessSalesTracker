import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDIT_KEY = '@credits';

export class CreditStorage {
    static async loadCredits() {
        try {
            const raw = await AsyncStorage.getItem(CREDIT_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('loadCredits error', e);
            return [];
        }
    }

    static async saveCredits(list) {
        try {
            await AsyncStorage.setItem(CREDIT_KEY, JSON.stringify(list));
            return true;
        } catch (e) {
            console.error('saveCredits error', e);
            return false;
        }
    }

    static async addCredit(entry) {
        const list = await this.loadCredits();
        const id = `cred_${Date.now()}`;
        const totalAmount = entry.unitPrice * entry.quantity;
        const credit = {
            id,
            customerName: entry.customerName.trim(),
            itemName: entry.itemName,
            inventoryItemId: entry.inventoryItemId || null,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            totalAmount,
            phone: entry.phone || null,
            notes: entry.notes || null,
            dateCreated: new Date().toISOString(),
            dueDate: entry.dueDate || null,
            status: 'pending',
            remainingBalance: totalAmount,
            payments: []
        };
        list.unshift(credit);
        await this.saveCredits(list);
        return credit;
    }

    static async recordPayment(creditId, amount, note) {
        const list = await this.loadCredits();
        const idx = list.findIndex(c => c.id === creditId);
        if (idx === -1) return false;
        const payAmount = Number(amount);
        if (isNaN(payAmount) || payAmount <= 0) return false;
        const credit = list[idx];
        credit.payments.push({
            id: `pay_${Date.now()}`,
            amount: payAmount,
            date: new Date().toISOString(),
            note: note || null
        });
        credit.remainingBalance = Math.max(credit.totalAmount - credit.payments.reduce((s, p) => s + p.amount, 0), 0);
        credit.status = credit.remainingBalance === 0 ? 'cleared' : 'pending';
        list[idx] = credit;
        await this.saveCredits(list);
        return true;
    }

    static async clearCredit(creditId, note) {
        const list = await this.loadCredits();
        const idx = list.findIndex(c => c.id === creditId);
        if (idx === -1) return false;
        const credit = list[idx];
        if (credit.remainingBalance > 0) {
            credit.payments.push({
                id: `pay_${Date.now()}`,
                amount: credit.remainingBalance,
                date: new Date().toISOString(),
                note: note || 'Full payment'
            });
        }
        credit.remainingBalance = 0;
        credit.status = 'cleared';
        list[idx] = credit;
        await this.saveCredits(list);
        return true;
    }

    static async deleteCredit(creditId) {
        const list = await this.loadCredits();
        const filtered = list.filter(c => c.id !== creditId);
        await this.saveCredits(filtered);
        return true;
    }

    static async getStats() {
        const list = await this.loadCredits();
        const outstanding = list
            .filter(c => c.status === 'pending')
            .reduce((s, c) => s + c.remainingBalance, 0);
        const owingCustomers = new Set(
            list.filter(c => c.status === 'pending').map(c => c.customerName)
        ).size;
        return { outstanding, owingCustomers, totalCredits: list.length };
    }

    static clearCredits() {
        return AsyncStorage.removeItem(CREDIT_KEY);
    }
}

export default CreditStorage;