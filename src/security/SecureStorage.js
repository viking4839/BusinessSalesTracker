// Thin layer over AsyncStorage for encrypted collections
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import CryptoJS from 'crypto-js'; // If using JS fallback (replace with native AES for performance)

const META_KEY = '@sec_meta';
const TX_KEY = '@sec_transactions';
const INV_KEY = '@sec_inventory';

class SecureStorage {
    constructor() {
        this.dataKey = null; // K_data in memory
        this.locked = true;
    }

    // Initialize after app start (load metadata only)
    async loadMeta() {
        const raw = await AsyncStorage.getItem(META_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    async isPinSet() {
        const meta = await this.loadMeta();
        return !!(meta && meta.pinHash);
    }

    // Derive unlock key using PBKDF2 (replace with native)
    deriveUnlockKey(pin, salt) {
        return CryptoJS.PBKDF2(pin, CryptoJS.enc.Base64.parse(salt), {
            keySize: 256 / 32,
            iterations: 100000
        }).toString(CryptoJS.enc.Hex);
    }

    async setPin(pin) {
        const saltBytes = CryptoJS.lib.WordArray.random(16);
        const salt = CryptoJS.enc.Base64.stringify(saltBytes);
        const unlockKey = this.deriveUnlockKey(pin, salt);
        const dataKeyBytes = CryptoJS.lib.WordArray.random(32);
        const dataKeyHex = CryptoJS.enc.Hex.stringify(dataKeyBytes);
        // Wrap dataKey with unlockKey (AES)
        const wrapped = CryptoJS.AES.encrypt(dataKeyHex, unlockKey).toString();
        const pinHash = CryptoJS.SHA256(unlockKey).toString(); // store hash of derived key (not raw pin)
        const meta = {
            salt,
            pinHash,
            wrappedDataKey: wrapped,
            attempts: 0,
            lockUntil: 0,
            v: 1
        };
        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
        this.dataKey = dataKeyHex;
        this.locked = false;
    }

    async unlock(pin) {
        const meta = await this.loadMeta();
        if (!meta) return false;
        if (Date.now() < meta.lockUntil) return false;

        const unlockKey = this.deriveUnlockKey(pin, meta.salt);
        const candidateHash = CryptoJS.SHA256(unlockKey).toString();
        if (candidateHash !== meta.pinHash) {
            meta.attempts += 1;
            if (meta.attempts >= 5) {
                meta.lockUntil = Date.now() + 5 * 60 * 1000; // 5 min lock
            }
            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
            return false;
        }
        // Reset attempts
        meta.attempts = 0;
        meta.lockUntil = 0;
        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
        const dataKeyHex = CryptoJS.AES.decrypt(meta.wrappedDataKey, unlockKey)
            .toString(CryptoJS.enc.Utf8);
        this.dataKey = dataKeyHex;
        this.locked = false;
        return true;
    }

    lock() {
        this.dataKey = null;
        this.locked = true;
    }

    ensureUnlocked() {
        if (this.locked || !this.dataKey) throw new Error('Locked');
    }

    encryptJson(obj) {
        this.ensureUnlocked();
        const plaintext = JSON.stringify(obj);
        const ct = CryptoJS.AES.encrypt(plaintext, this.dataKey).toString();
        return ct;
    }

    decryptJson(ct) {
        this.ensureUnlocked();
        const bytes = CryptoJS.AES.decrypt(ct, this.dataKey);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(plaintext);
    }

    async saveTransactions(list) {
        const ct = this.encryptJson(list);
        await AsyncStorage.setItem(TX_KEY, ct);
    }

    async loadTransactions() {
        const ct = await AsyncStorage.getItem(TX_KEY);
        if (!ct) return [];
        try { return this.decryptJson(ct); } catch { return []; }
    }

    async saveInventory(list) {
        const ct = this.encryptJson(list);
        await AsyncStorage.setItem(INV_KEY, ct);
    }

    async loadInventory() {
        const ct = await AsyncStorage.getItem(INV_KEY);
        if (!ct) return [];
        try { return this.decryptJson(ct); } catch { return []; }
    }

    async migratePlain(existingTx, existingInv) {
        // Encrypt previously plain data after PIN set
        await this.saveTransactions(existingTx || []);
        await this.saveInventory(existingInv || []);
    }
}

export default new SecureStorage();