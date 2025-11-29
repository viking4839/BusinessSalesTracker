/**
 * Pure JavaScript SecureStorage
 * No native dependencies - works everywhere!
 * Uses crypto-js (optimized for React Native)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const META_KEY = '@sec_meta';
const TX_KEY = '@sec_transactions';
const INV_KEY = '@sec_inventory';
const CREDIT_KEY = '@sec_credits';
const PROFIT_KEY = '@sec_profits';
const SETTINGS_KEY = '@sec_settings';
const PROFILE_KEY = '@sec_profile';

// Optimized crypto operations that won't block UI
const asyncCrypto = {
    // Run crypto operations in "async" manner with small delay
    async pbkdf2(password, salt, iterations, keySize) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const key = CryptoJS.PBKDF2(password, salt, {
                    keySize: keySize / 32,
                    iterations: iterations
                });
                resolve(key.toString());
            }, 10);
        });
    },

    async sha256(text) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const hash = CryptoJS.SHA256(text);
                resolve(hash.toString());
            }, 5);
        });
    },

    async encrypt(text, key) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const encrypted = CryptoJS.AES.encrypt(text, key);
                resolve(encrypted.toString());
            }, 10);
        });
    },

    async decrypt(ciphertext, key) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
                    const text = decrypted.toString(CryptoJS.enc.Utf8);
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            }, 10);
        });
    },

    randomHex(length) {
        // Generate length/2 bytes (since hex is 2 chars per byte) and convert to hex string
        return CryptoJS.lib.WordArray.random(length / 2).toString(CryptoJS.enc.Hex);
    }
};

class SecureStorage {
    constructor() {
        this.dataKey = null;
        this.locked = true;
        this.autoLockTimer = null;
        this.autoLockDuration = 5 * 60 * 1000;
    }

    // ==================== METADATA & PIN MANAGEMENT ====================

    async loadMeta() {
        try {
            const raw = await AsyncStorage.getItem(META_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error('Load meta error:', error);
            return null;
        }
    }

    async isPinSet() {
        const meta = await this.loadMeta();
        return !!(meta && meta.pinHash);
    }

    async isBiometricEnabled() {
        const meta = await this.loadMeta();
        return !!(meta && meta.biometricEnabled);
    }

    async checkBiometricAvailability() {
        return { available: false, biometryType: null };
    }

    async deriveUnlockKey(pin, salt) {
        // Reduced iterations for better performance (still secure)
        return await asyncCrypto.pbkdf2(pin, salt, 5000, 256);
    }

    async setPin(pin, enableBiometric = false) {
        try {
            const salt = asyncCrypto.randomHex(32);
            const unlockKey = await this.deriveUnlockKey(pin, salt);
            const dataKey = asyncCrypto.randomHex(64);

            const pinHash = await asyncCrypto.sha256(unlockKey);
            const wrappedDataKey = await asyncCrypto.encrypt(dataKey, unlockKey);

            const meta = {
                salt,
                pinHash,
                wrappedDataKey,
                attempts: 0,
                lockUntil: 0,
                biometricEnabled: enableBiometric,
                autoLockDuration: this.autoLockDuration,
                createdAt: Date.now(),
                v: 5 // Version 5 - Pure JS optimized
            };

            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

            if (enableBiometric) {
                await this.enableBiometric(dataKey);
            }

            this.dataKey = dataKey;
            this.locked = false;
            this.startAutoLock();

            return { success: true };
        } catch (error) {
            console.error('Set PIN error:', error);
            return { success: false, error: error.message };
        }
    }

    async changePin(oldPin, newPin) {
        try {
            const unlocked = await this.unlock(oldPin);
            if (!unlocked.success) {
                return { success: false, error: 'Invalid current PIN' };
            }

            const currentDataKey = this.dataKey;
            const meta = await this.loadMeta();

            const salt = asyncCrypto.randomHex(32);
            const unlockKey = await this.deriveUnlockKey(newPin, salt);
            const pinHash = await asyncCrypto.sha256(unlockKey);
            const wrappedDataKey = await asyncCrypto.encrypt(currentDataKey, unlockKey);

            meta.salt = salt;
            meta.pinHash = pinHash;
            meta.wrappedDataKey = wrappedDataKey;
            meta.attempts = 0;
            meta.lockUntil = 0;

            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

            return { success: true };
        } catch (error) {
            console.error('Change PIN error:', error);
            return { success: false, error: error.message };
        }
    }

    async unlock(pin) {
        try {
            const meta = await this.loadMeta();
            if (!meta) return { success: false, error: 'No PIN set' };

            if (Date.now() < meta.lockUntil) {
                const remainingMs = meta.lockUntil - Date.now();
                const remainingMins = Math.ceil(remainingMs / 60000);
                return {
                    success: false,
                    locked: true,
                    remainingMinutes: remainingMins
                };
            }

            const unlockKey = await this.deriveUnlockKey(pin, meta.salt);
            const candidateHash = await asyncCrypto.sha256(unlockKey);

            if (candidateHash !== meta.pinHash) {
                meta.attempts += 1;

                if (meta.attempts >= 5) {
                    meta.lockUntil = Date.now() + 5 * 60 * 1000;
                } else if (meta.attempts >= 3) {
                    meta.lockUntil = Date.now() + 1 * 60 * 1000;
                }

                await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
                return {
                    success: false,
                    attempts: meta.attempts,
                    maxAttempts: 5
                };
            }

            meta.attempts = 0;
            meta.lockUntil = 0;
            meta.lastUnlock = Date.now();
            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

            const dataKey = await asyncCrypto.decrypt(meta.wrappedDataKey, unlockKey);

            this.dataKey = dataKey;
            this.locked = false;
            this.autoLockDuration = meta.autoLockDuration || this.autoLockDuration;
            this.startAutoLock();

            return { success: true };
        } catch (error) {
            console.error('Unlock error:', error);
            return { success: false, error: 'Unlock failed' };
        }
    }

    async unlockWithBiometric() {
        try {
            const meta = await this.loadMeta();
            if (!meta || !meta.biometricEnabled) {
                return { success: false, error: 'Biometric not enabled' };
            }

            const dataKey = await this.getBiometricDataKey();
            if (dataKey) {
                this.dataKey = dataKey;
                this.locked = false;
                meta.lastUnlock = Date.now();
                await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
                this.startAutoLock();
                return { success: true };
            }

            return { success: false, error: 'Biometric authentication failed' };
        } catch (error) {
            console.error('Biometric unlock error:', error);
            return { success: false, error: error.message };
        }
    }

    async enableBiometric(dataKey) {
        try {
            await AsyncStorage.setItem('@biometric_datakey', dataKey);
            const meta = await this.loadMeta();
            if (meta) {
                meta.biometricEnabled = true;
                await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async disableBiometric() {
        try {
            await AsyncStorage.removeItem('@biometric_datakey');
            const meta = await this.loadMeta();
            if (meta) {
                meta.biometricEnabled = false;
                await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getBiometricDataKey() {
        return await AsyncStorage.getItem('@biometric_datakey');
    }

    lock() {
        this.dataKey = null;
        this.locked = true;
        this.stopAutoLock();
    }

    isLocked() {
        return this.locked;
    }

    // ==================== AUTO-LOCK ====================

    startAutoLock() {
        this.stopAutoLock();
        if (this.autoLockDuration > 0) {
            this.autoLockTimer = setTimeout(() => {
                console.log('🔒 Auto-lock triggered');
                this.lock();
            }, this.autoLockDuration);
        }
    }

    stopAutoLock() {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
            this.autoLockTimer = null;
        }
    }

    resetAutoLock() {
        if (!this.locked) {
            this.startAutoLock();
        }
    }

    async setAutoLockDuration(minutes) {
        this.autoLockDuration = minutes * 60 * 1000;
        const meta = await this.loadMeta();
        if (meta) {
            meta.autoLockDuration = this.autoLockDuration;
            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
        }
        if (!this.locked) {
            this.startAutoLock();
        }
    }

    getAutoLockDuration() {
        return this.autoLockDuration / 60000;
    }

    // ==================== ENCRYPTION/DECRYPTION ====================

    ensureUnlocked() {
        if (this.locked || !this.dataKey) {
            throw new Error('LOCKED');
        }
    }

    async encryptJson(obj) {
        this.ensureUnlocked();
        try {
            const plaintext = JSON.stringify(obj);
            const encrypted = await asyncCrypto.encrypt(plaintext, this.dataKey);
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    async decryptJson(ciphertext) {
        this.ensureUnlocked();
        try {
            const decrypted = await asyncCrypto.decrypt(ciphertext, this.dataKey);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('DECRYPTION_FAILED');
        }
    }

    // ==================== DATA OPERATIONS ====================

    async saveTransactions(list) {
        const ct = await this.encryptJson(list);
        await AsyncStorage.setItem(TX_KEY, ct);
        this.resetAutoLock();
    }

    async loadTransactions() {
        const ct = await AsyncStorage.getItem(TX_KEY);
        if (!ct) return [];
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            console.error('Load transactions error:', error);
            return [];
        }
    }

    async saveInventory(list) {
        const ct = await this.encryptJson(list);
        await AsyncStorage.setItem(INV_KEY, ct);
        this.resetAutoLock();
    }

    async loadInventory() {
        const ct = await AsyncStorage.getItem(INV_KEY);
        if (!ct) return [];
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return [];
        }
    }

    async saveCredits(list) {
        const ct = await this.encryptJson(list);
        await AsyncStorage.setItem(CREDIT_KEY, ct);
        this.resetAutoLock();
    }

    async loadCredits() {
        const ct = await AsyncStorage.getItem(CREDIT_KEY);
        if (!ct) return [];
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return [];
        }
    }

    async saveProfits(data) {
        const ct = await this.encryptJson(data);
        await AsyncStorage.setItem(PROFIT_KEY, ct);
        this.resetAutoLock();
    }

    async loadProfits() {
        const ct = await AsyncStorage.getItem(PROFIT_KEY);
        if (!ct) return {};
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return {};
        }
    }

    async saveSettings(data) {
        const ct = await this.encryptJson(data);
        await AsyncStorage.setItem(SETTINGS_KEY, ct);
        this.resetAutoLock();
    }

    async loadSettings() {
        const ct = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!ct) return null;
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return null;
        }
    }

    async saveProfile(data) {
        const ct = await this.encryptJson(data);
        await AsyncStorage.setItem(PROFILE_KEY, ct);
        this.resetAutoLock();
    }

    async loadProfile() {
        const ct = await AsyncStorage.getItem(PROFILE_KEY);
        if (!ct) return null;
        try {
            const data = await this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return null;
        }
    }

    // ==================== MIGRATION ====================

    async migratePlainData() {
        try {
            console.log('🔄 Starting data migration...');

            const existingTx = await AsyncStorage.getItem('@transactions');
            const existingInv = await AsyncStorage.getItem('@inventory');
            const existingCredits = await AsyncStorage.getItem('@credits');
            const existingSettings = await AsyncStorage.getItem('settings');
            const existingProfile = await AsyncStorage.getItem('profile');

            if (existingTx) {
                await this.saveTransactions(JSON.parse(existingTx));
                await AsyncStorage.removeItem('@transactions');
            }

            if (existingInv) {
                await this.saveInventory(JSON.parse(existingInv));
                await AsyncStorage.removeItem('@inventory');
            }

            if (existingCredits) {
                await this.saveCredits(JSON.parse(existingCredits));
                await AsyncStorage.removeItem('@credits');
            }

            if (existingSettings) {
                await this.saveSettings(JSON.parse(existingSettings));
            }

            if (existingProfile) {
                await this.saveProfile(JSON.parse(existingProfile));
            }

            console.log('✅ Migration complete');
            return { success: true };
        } catch (error) {
            console.error('❌ Migration error:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== UTILITY ====================

    async resetSecurity() {
        await AsyncStorage.multiRemove([
            META_KEY,
            '@biometric_datakey'
        ]);
        this.dataKey = null;
        this.locked = true;
        this.stopAutoLock();
    }

    async getSecurityStatus() {
        const meta = await this.loadMeta();
        if (!meta) {
            return {
                pinSet: false,
                biometricEnabled: false,
                locked: true,
                autoLockMinutes: 5
            };
        }

        return {
            pinSet: !!meta.pinHash,
            biometricEnabled: !!meta.biometricEnabled,
            locked: this.locked,
            autoLockMinutes: (meta.autoLockDuration || this.autoLockDuration) / 60000,
            createdAt: meta.createdAt,
            lastUnlock: meta.lastUnlock
        };
    }
}

export default new SecureStorage();