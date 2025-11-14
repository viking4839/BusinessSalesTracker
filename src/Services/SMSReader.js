import { PermissionsAndroid, Platform, ToastAndroid } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

class SMSReader {
    constructor() {
        this.hasPermission = false;
        this.lastScanTime = null;
    }

    // Generate deterministic ID from message content
    generateTransactionId(messageData, bank, amount) {
        // Create unique string from message properties
        const uniqueString = `${messageData._id || ''}_${messageData.body}_${messageData.date}_${bank}_${amount}`;
        
        // Simple hash function (no crypto needed)
        let hash = 0;
        for (let i = 0; i < uniqueString.length; i++) {
            const char = uniqueString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return `tx_${Math.abs(hash)}_${bank.replace(/\s+/g, '_')}`;
    }

    // Request SMS permission
    async requestPermission() {
        if (Platform.OS !== 'android') {
            console.log('SMS reading only available on Android');
            return false;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                {
                    title: 'SMS Access Required',
                    message: 'Business Tracker needs SMS access to automatically scan your M-Pesa and bank transaction messages',
                    buttonPositive: 'Allow',
                    buttonNegative: 'Deny',
                }
            );

            this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;

            if (this.hasPermission) {
                ToastAndroid.show('SMS permission granted!', ToastAndroid.SHORT);
            } else {
                ToastAndroid.show('SMS permission denied. Manual entry only.', ToastAndroid.LONG);
            }

            return this.hasPermission;
        } catch (err) {
            console.error('Permission error:', err);
            ToastAndroid.show('Error requesting SMS permission', ToastAndroid.SHORT);
            return false;
        }
    }

    // Check if permission is already granted
    async checkPermission() {
        if (Platform.OS !== 'android') {
            return false;
        }

        try {
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_SMS
            );
            this.hasPermission = hasPermission;
            return hasPermission;
        } catch (err) {
            console.error('Permission check error:', err);
            return false;
        }
    }

    // Read real SMS messages from device
    async readRealSMS(limit = 200) {
        return new Promise((resolve, reject) => {
            const filter = {
                box: 'inbox',
                maxCount: limit,
            };

            SmsAndroid.list(
                JSON.stringify(filter),
                (fail) => {
                    console.error('Failed to read SMS:', fail);
                    reject(new Error('Failed to read SMS'));
                },
                (count, smsList) => {
                    console.log(`📱 Successfully read ${count} SMS messages`);
                    const messages = JSON.parse(smsList);
                    resolve(messages);
                }
            );
        });
    }

    // Main function to scan for transactions
    async scanRecentTransactions(limit = 200) {
        const hasPermission = await this.checkPermission();

        if (!hasPermission) {
            const granted = await this.requestPermission();
            if (!granted) {
                throw new Error('SMS permission denied');
            }
        }

        try {
            ToastAndroid.show('Scanning SMS for transactions...', ToastAndroid.SHORT);

            const messages = await this.readRealSMS(limit);
            const transactions = this.parseMessages(messages);

            this.lastScanTime = new Date();

            console.log(`✅ Parsed ${transactions.length} transactions`);

            if (transactions.length > 0) {
                ToastAndroid.show(`Found ${transactions.length} transactions!`, ToastAndroid.SHORT);
            } else {
                ToastAndroid.show('No transactions found in recent SMS', ToastAndroid.SHORT);
            }

            return transactions;
        } catch (error) {
            console.error('SMS scan error:', error);
            ToastAndroid.show('Scan failed: ' + error.message, ToastAndroid.LONG);
            throw error;
        }
    }

    // Parse messages and extract transactions
    parseMessages(messages) {
        return messages
            .map(message => this.parseTransaction(message))
            .filter(transaction => transaction !== null);
    }

    // Detect if message is from a Kenyan bank
    isBankMessage(message) {
        const messageBody = typeof message === 'string' ? message : message.body;
        const bankPatterns = [
            /M-PESA/i,
            /MPESA/i,
            /Confirmed\.\s*Ksh/i,
            /Equity Bank/i,
            /Acc\. No:/i,
            /Amt:/i,
            /Co-op Bank/i,
            /CO-OP BANK/i,
            /credited with/i,
            /KCB/i,
            /received.*Ksh/i,
            /paid.*Ksh/i,
            /DTB/i,
            /Diamond Trust Bank/i,
            /Family Bank/i,
            /Standard Chartered/i,
            /NCBA/i,
            /Absa/i,
            /Stanbic/i,
        ];

        return bankPatterns.some(pattern => pattern.test(messageBody));
    }

    // Main transaction parser
    parseTransaction(messageData) {
        const message = messageData.body;

        if (!this.isBankMessage(message)) {
            return null;
        }

        try {
            if (this.isMpesaMessage(message)) {
                return this.parseMpesaMessage(message, messageData);
            }

            if (this.isEquityMessage(message)) {
                return this.parseEquityMessage(message, messageData);
            }

            if (this.isCoopMessage(message)) {
                return this.parseCoopMessage(message, messageData);
            }

            return this.parseGenericBankMessage(message, messageData);
        } catch (error) {
            console.error('Error parsing transaction:', error, message);
            return null;
        }
    }

    // M-PESA Detection & Parsing
    isMpesaMessage(message) {
        return /M-PESA|MPESA|Confirmed\.\s*Ksh|received.*Ksh|paid.*Ksh/.test(message);
    }

    parseMpesaMessage(message, messageData) {
        const amountMatch = message.match(/Ksh\s*([\d,]+\.?\d*)/);
        if (!amountMatch) return null;

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        let sender = 'Unknown';
        let phone = null;
        let type = 'received';

        const senderMatch = message.match(/from\s+(.+?)\s+(\d+)/i);
        const recipientMatch = message.match(/to\s+(.+?)\s+(\d+)/i);
        const paidToMatch = message.match(/paid to\s+(.+?)\s+(\d+)/i);

        if (senderMatch) {
            sender = senderMatch[1].trim();
            phone = senderMatch[2];
            type = 'received';
        } else if (recipientMatch) {
            sender = recipientMatch[1].trim();
            phone = recipientMatch[2];
            type = 'sent';
        } else if (paidToMatch) {
            sender = paidToMatch[1].trim();
            phone = paidToMatch[2] || null;
            type = 'sent';
        } else if (message.includes('airtime for')) {
            const airtimeMatch = message.match(/airtime for\s+(\d+)/i);
            sender = 'Airtime Purchase';
            phone = airtimeMatch ? airtimeMatch[1] : null;
            type = 'sent';
        }

        const bank = 'M-Pesa';
        const id = this.generateTransactionId(messageData, bank, amount); // ✅ Deterministic ID

        return {
            id, // ✅ Same SMS = Same ID every time
            amount: type === 'received' ? amount : -amount,
            sender,
            phone,
            timestamp: new Date(parseInt(messageData.date)),
            type: 'mpesa',
            transactionType: type,
            message: message,
            bank,
            source: 'sms_scan',
        };
    }

    // Equity Bank Detection & Parsing
    isEquityMessage(message) {
        return /Equity Bank|equitybank|Acc\. No:|Amt:/i.test(message);
    }

    parseEquityMessage(message, messageData) {
        const amountMatch = message.match(/Ksh\s*([\d,]+\.?\d*)/);
        if (!amountMatch) return null;

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        let type = 'sent';

        if (message.includes('credited') || message.includes('received')) {
            type = 'received';
        } else if (message.includes('debited')) {
            type = 'sent';
        }

        const senderMatch = message.match(/from\s+(.+?)\s+on/i) ||
            message.match(/from\s+(.+?)\./i);

        const bank = 'Equity Bank';
        const id = this.generateTransactionId(messageData, bank, amount); // ✅ Deterministic ID

        return {
            id,
            amount: type === 'received' ? amount : -amount,
            sender: senderMatch ? senderMatch[1].trim() : 'Equity Bank Customer',
            timestamp: new Date(parseInt(messageData.date)),
            type: 'equity',
            transactionType: type,
            message: message,
            bank,
            source: 'sms_scan',
        };
    }

    // Co-op Bank Detection & Parsing
    isCoopMessage(message) {
        return /Co-op Bank|CO-OP BANK|credited with/i.test(message);
    }

    parseCoopMessage(message, messageData) {
        const amountMatch = message.match(/Ksh\s*([\d,]+\.?\d*)/);
        if (!amountMatch) return null;

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const senderMatch = message.match(/from\s+(.+?)\./);

        let type = 'received';
        if (message.includes('debited')) {
            type = 'sent';
        }

        const bank = 'Co-operative Bank';
        const id = this.generateTransactionId(messageData, bank, amount); // ✅ Deterministic ID

        return {
            id,
            amount: type === 'received' ? amount : -amount,
            sender: senderMatch ? senderMatch[1].trim() : 'Co-op Customer',
            timestamp: new Date(parseInt(messageData.date)),
            type: 'coop',
            transactionType: type,
            message: message,
            bank,
            source: 'sms_scan',
        };
    }

    // Generic bank parser
    parseGenericBankMessage(message, messageData) {
        const amountMatch =
            message.match(/Ksh\s*([\d,]+\.?\d*)/) || message.match(/KES\s*([\d,]+\.?\d*)/);
        if (!amountMatch) return null;

        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        let bank = 'Unknown Bank';
        if (message.includes('KCB')) bank = 'KCB';
        else if (message.includes('DTB')) bank = 'DTB';
        else if (message.includes('Family Bank')) bank = 'Family Bank';
        else if (message.includes('Standard Chartered')) bank = 'Standard Chartered';
        else if (message.includes('NCBA')) bank = 'NCBA';
        else if (message.includes('Absa')) bank = 'Absa';
        else if (message.includes('Stanbic')) bank = 'Stanbic';

        let type = 'received';
        if (message.includes('debited') || message.includes('paid') || message.includes('sent')) {
            type = 'sent';
        }

        const id = this.generateTransactionId(messageData, bank, amount); // ✅ Deterministic ID

        return {
            id,
            amount: type === 'received' ? amount : -amount,
            sender: 'Bank Customer',
            timestamp: new Date(parseInt(messageData.date)),
            type: 'bank',
            transactionType: type,
            message: message,
            bank: bank,
            source: 'sms_scan',
        };
    }

    // Get scan status
    getScanStatus() {
        return {
            hasPermission: this.hasPermission,
            lastScanTime: this.lastScanTime,
            canScan: this.hasPermission,
        };
    }
}

// Create singleton instance
export default new SMSReader();