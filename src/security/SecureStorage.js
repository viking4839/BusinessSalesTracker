import 'react-native-get-random-values'; // <-- Add this line FIRST
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

const META_KEY = '@sec_meta';
const TX_KEY = '@sec_transactions';
const INV_KEY = '@sec_inventory';
const CREDIT_KEY = '@sec_credits';
const PROFIT_KEY = '@sec_profits';
const SETTINGS_KEY = '@sec_settings';
const PROFILE_KEY = '@sec_profile';

class SecureStorage {
    constructor() {
        this.dataKey = null;
        this.locked = true;
        this.autoLockTimer = null;
        this.autoLockDuration = 5 * 60 * 1000; // 5 minutes default
        this.biometrics = new ReactNativeBiometrics();
    }

    // ==================== METADATA & PIN MANAGEMENT ====================

    async loadMeta() {
        const raw = await AsyncStorage.getItem(META_KEY);
        return raw ? JSON.parse(raw) : null;
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
        try {
            const { available, biometryType } = await this.biometrics.isSensorAvailable();
            return { available, biometryType };
        } catch (error) {
            console.error('Biometric check error:', error);
            return { available: false, biometryType: null };
        }
    }

    deriveUnlockKey(pin, salt) {
        return CryptoJS.PBKDF2(pin, CryptoJS.enc.Base64.parse(salt), {
            keySize: 256 / 32,
            iterations: 100000
        }).toString(CryptoJS.enc.Hex);
    }

    async setPin(pin, enableBiometric = false) {
        const saltBytes = CryptoJS.lib.WordArray.random(16);
        const salt = CryptoJS.enc.Base64.stringify(saltBytes);
        const unlockKey = this.deriveUnlockKey(pin, salt);
        const dataKeyBytes = CryptoJS.lib.WordArray.random(32);
        const dataKeyHex = CryptoJS.enc.Hex.stringify(dataKeyBytes);

        // Wrap dataKey with unlockKey (AES)
        const wrapped = CryptoJS.AES.encrypt(dataKeyHex, unlockKey).toString();
        const pinHash = CryptoJS.SHA256(unlockKey).toString();

        const meta = {
            salt,
            pinHash,
            wrappedDataKey: wrapped,
            attempts: 0,
            lockUntil: 0,
            biometricEnabled: enableBiometric,
            autoLockDuration: this.autoLockDuration,
            createdAt: Date.now(),
            v: 2 // Version 2 with enhanced features
        };

        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

        // Store biometric key if enabled
        if (enableBiometric) {
            await this.enableBiometric(dataKeyHex);
        }

        this.dataKey = dataKeyHex;
        this.locked = false;
        this.startAutoLock();
    }

    async changePin(oldPin, newPin) {
        // First verify old PIN
        const unlocked = await this.unlock(oldPin);
        if (!unlocked) {
            return { success: false, error: 'Invalid current PIN' };
        }

        // Store current dataKey
        const currentDataKey = this.dataKey;

        // Create new PIN with same dataKey
        const meta = await this.loadMeta();
        const saltBytes = CryptoJS.lib.WordArray.random(16);
        const salt = CryptoJS.enc.Base64.stringify(saltBytes);
        const unlockKey = this.deriveUnlockKey(newPin, salt);
        const wrapped = CryptoJS.AES.encrypt(currentDataKey, unlockKey).toString();
        const pinHash = CryptoJS.SHA256(unlockKey).toString();

        meta.salt = salt;
        meta.pinHash = pinHash;
        meta.wrappedDataKey = wrapped;
        meta.attempts = 0;
        meta.lockUntil = 0;

        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

        return { success: true };
    }

    async unlock(pin) {
        const meta = await this.loadMeta();
        if (!meta) return false;

        // Check if locked due to failed attempts
        if (Date.now() < meta.lockUntil) {
            const remainingMs = meta.lockUntil - Date.now();
            const remainingMins = Math.ceil(remainingMs / 60000);
            return {
                success: false,
                locked: true,
                remainingMinutes: remainingMins
            };
        }

        const unlockKey = this.deriveUnlockKey(pin, meta.salt);
        const candidateHash = CryptoJS.SHA256(unlockKey).toString();

        if (candidateHash !== meta.pinHash) {
            meta.attempts += 1;

            // Progressive lockout
            if (meta.attempts >= 5) {
                meta.lockUntil = Date.now() + 5 * 60 * 1000; // 5 min lock
            } else if (meta.attempts >= 3) {
                meta.lockUntil = Date.now() + 1 * 60 * 1000; // 1 min lock
            }

            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
            return {
                success: false,
                attempts: meta.attempts,
                maxAttempts: 5
            };
        }

        // Reset attempts on success
        meta.attempts = 0;
        meta.lockUntil = 0;
        meta.lastUnlock = Date.now();
        await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

        const dataKeyHex = CryptoJS.AES.decrypt(meta.wrappedDataKey, unlockKey)
            .toString(CryptoJS.enc.Utf8);

        this.dataKey = dataKeyHex;
        this.locked = false;
        this.autoLockDuration = meta.autoLockDuration || this.autoLockDuration;
        this.startAutoLock();

        return { success: true };
    }

    async unlockWithBiometric() {
        try {
            const meta = await this.loadMeta();
            if (!meta || !meta.biometricEnabled) {
                return { success: false, error: 'Biometric not enabled' };
            }

            const { success, signature } = await this.biometrics.createSignature({
                promptMessage: 'Authenticate to unlock Track Biz',
                payload: 'unlock_app'
            });

            if (success) {
                // Retrieve stored dataKey from biometric storage
                const dataKeyHex = await this.getBiometricDataKey();
                if (dataKeyHex) {
                    this.dataKey = dataKeyHex;
                    this.locked = false;
                    meta.lastUnlock = Date.now();
                    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
                    this.startAutoLock();
                    return { success: true };
                }
            }

            return { success: false, error: 'Biometric authentication failed' };
        } catch (error) {
            console.error('Biometric unlock error:', error);
            return { success: false, error: error.message };
        }
    }

    async enableBiometric(dataKey) {
        try {
            const { available } = await this.checkBiometricAvailability();
            if (!available) {
                return { success: false, error: 'Biometric not available' };
            }

            // Store dataKey encrypted with biometric key
            await AsyncStorage.setItem('@biometric_datakey', dataKey);

            const meta = await this.loadMeta();
            meta.biometricEnabled = true;
            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

            return { success: true };
        } catch (error) {
            console.error('Enable biometric error:', error);
            return { success: false, error: error.message };
        }
    }

    async disableBiometric() {
        try {
            await AsyncStorage.removeItem('@biometric_datakey');
            const meta = await this.loadMeta();
            meta.biometricEnabled = false;
            await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
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
        this.autoLockTimer = setTimeout(() => {
            console.log('🔒 Auto-lock triggered');
            this.lock();
        }, this.autoLockDuration);
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
        return this.autoLockDuration / 60000; // Return in minutes
    }

    // ==================== ENCRYPTION/DECRYPTION ====================

    ensureUnlocked() {
        if (this.locked || !this.dataKey) {
            throw new Error('LOCKED');
        }
    }

    encryptJson(obj) {
        this.ensureUnlocked();
        const plaintext = JSON.stringify(obj);
        const ct = CryptoJS.AES.encrypt(plaintext, this.dataKey).toString();
        return ct;
    }

    decryptJson(ct) {
        this.ensureUnlocked();
        try {
            const bytes = CryptoJS.AES.decrypt(ct, this.dataKey);
            const plaintext = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(plaintext);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('DECRYPTION_FAILED');
        }
    }

    // ==================== DATA OPERATIONS ====================

    async saveTransactions(list) {
        const ct = this.encryptJson(list);
        await AsyncStorage.setItem(TX_KEY, ct);
        this.resetAutoLock();
    }

    async loadTransactions() {
        const ct = await AsyncStorage.getItem(TX_KEY);
        if (!ct) return [];
        try {
            const data = this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            console.error('Load transactions error:', error);
            return [];
        }
    }

    async saveInventory(list) {
        const ct = this.encryptJson(list);
        await AsyncStorage.setItem(INV_KEY, ct);
        this.resetAutoLock();
    }

    async loadInventory() {
        const ct = await AsyncStorage.getItem(INV_KEY);
        if (!ct) return [];
        try {
            const data = this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return [];
        }
    }

    async saveCredits(list) {
        const ct = this.encryptJson(list);
        await AsyncStorage.setItem(CREDIT_KEY, ct);
        this.resetAutoLock();
    }

    async loadCredits() {
        const ct = await AsyncStorage.getItem(CREDIT_KEY);
        if (!ct) return [];
        try {
            const data = this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return [];
        }
    }

    async saveProfits(data) {
        const ct = this.encryptJson(data);
        await AsyncStorage.setItem(PROFIT_KEY, ct);
        this.resetAutoLock();
    }

    async loadProfits() {
        const ct = await AsyncStorage.getItem(PROFIT_KEY);
        if (!ct) return {};
        try {
            const data = this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return {};
        }
    }

    async saveSettings(data) {
        const ct = this.encryptJson(data);
        await AsyncStorage.setItem(SETTINGS_KEY, ct);
        this.resetAutoLock();
    }

    async loadSettings() {
        const ct = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!ct) return null;
        try {
            const data = this.decryptJson(ct);
            this.resetAutoLock();
            return data;
        } catch (error) {
            if (error.message === 'LOCKED') throw error;
            return null;
        }
    }

    async saveProfile(data) {
        const ct = this.encryptJson(data);
        await AsyncStorage.setItem(PROFILE_KEY, ct);
        this.resetAutoLock();
    }

    async loadProfile() {
        const ct = await AsyncStorage.getItem(PROFILE_KEY);
        if (!ct) return null;
        try {
            const data = this.decryptJson(ct);
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
            console.log('🔄 Starting data migration to encrypted storage...');

            // Load existing plain data
            const existingTx = await AsyncStorage.getItem('@transactions');
            const existingInv = await AsyncStorage.getItem('@inventory');
            const existingCredits = await AsyncStorage.getItem('@credits');
            const existingSettings = await AsyncStorage.getItem('settings');
            const existingProfile = await AsyncStorage.getItem('profile');

            // Encrypt and save
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
        // Complete reset - use with caution
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