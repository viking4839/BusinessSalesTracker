// Add a runtime guard + fallback (CSV) so app doesn’t crash when convert is undefined
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { PermissionsAndroid, Platform, Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PdfExportService {
  async requestStoragePermission() {
    if (Platform.OS !== 'android') return true;
    const release = Platform.constants?.Release;
    const sdkNum = release ? parseInt(release, 10) : 0;
    if (sdkNum >= 13) return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'Allow saving exported PDF',
          buttonPositive: 'OK'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch(e) {
      console.warn('Permission request error', e);
      return false;
    }
  }

  async exportTransactionsPdf(transactions, filename='Transactions') {
    const hasPermission = await this.requestStoragePermission();
    if (!hasPermission) console.warn('Proceeding without external storage permission');

    if (!transactions || transactions.length === 0) {
      Alert.alert('No Data','No transactions to export.');
      return false;
    }

    // DEBUG: check module
    if (!RNHTMLtoPDF || typeof RNHTMLtoPDF.convert !== 'function') {
      console.warn('RNHTMLtoPDF.convert missing. Fallback to CSV.');
      const csv = this.generateCSV(transactions);
      await this.shareFallback(csv, filename);
      Alert.alert('PDF Module Missing','Shared CSV instead.');
      return false;
    }

    try {
      const profileData = await AsyncStorage.getItem('profile');
      const profile = profileData ? JSON.parse(profileData) : { name: 'Track Biz User' };
      const htmlContent = this.generateHTML(transactions, profile, filename);
      const file = await RNHTMLtoPDF.convert({
        html: htmlContent,
        fileName: `${filename}_${Date.now()}`,
        directory: 'Documents'
      });
      Alert.alert('Export Successful', `PDF saved:\n${file.filePath}`);
      return true;
    } catch(err) {
      console.error('PDF Export Error', err);
      Alert.alert('Export Failed', err.message || 'Could not generate PDF');
      return false;
    }
  }

  async shareFallback(content, filename) {
    try {
      await Share.share({
        title: filename,
        message: content
      });
    } catch(e) {
      console.warn('Share fallback failed', e);
    }
  }

  generateCSV(transactions) {
    const headers = ['Date','Time','Bank','Sender','Amount','Direction','Business'].join(',');
    const rows = transactions.map(t => {
      const d = new Date(t.timestamp || t.date);
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        `"${(t.bank||'Unknown').replace(/"/g,'""')}"`,
        `"${(t.sender||'Unknown').replace(/"/g,'""')}"`,
        Math.abs(Number(t.amount)||0),
        Number(t.amount)>0?'IN':'OUT',
        t.isBusinessTransaction?'Yes':'No'
      ].join(',');
    });
    return [headers, ...rows].join('\n');
  }

  generateHTML(transactions, profile, title='Transaction Report') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // Calculate totals
    const totalReceived = transactions
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    const totalSent = transactions
        .filter(t => Number(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    const businessReceived = transactions
        .filter(t => t.isBusinessTransaction && Number(t.amount) > 0)
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    const manualSales = transactions.filter(t => t.isManual).length;
    const smsParsed = transactions.filter(t => !t.isManual).length;

    // Generate transaction rows
    const transactionRows = transactions.map((t, index) => {
        const date = new Date(t.timestamp || t.date);
        const isIn = Number(t.amount) > 0;
        const source = t.isManual ? 'Manual Entry' : 'SMS Parsed';

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; font-size: 11px;">${index + 1}</td>
          <td style="padding: 12px 8px; font-size: 11px;">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding: 12px 8px; font-size: 11px;">${t.sender || t.from || 'Unknown'}</td>
          <td style="padding: 12px 8px; font-size: 11px;">${t.bank || 'N/A'}</td>
          <td style="padding: 12px 8px; font-size: 11px; color: ${isIn ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${isIn ? '+' : '-'} KSh ${Math.abs(Number(t.amount) || 0).toLocaleString()}
          </td>
          <td style="padding: 12px 8px; font-size: 11px;">
            ${t.isBusinessTransaction ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 9px;">Business</span>' : '<span style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 4px; font-size: 9px;">Personal</span>'}
          </td>
          <td style="padding: 12px 8px; font-size: 11px;">
            <span style="background: ${t.isManual ? '#fef3c7' : '#dbeafe'}; color: ${t.isManual ? '#92400e' : '#1e40af'}; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${source}</span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #ffffff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #4f46e5;
            }
            .logo {
              font-size: 28px;
              font-weight: 800;
              color: #4f46e5;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 12px;
              color: #6b7280;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .info-item {
              text-align: center;
            }
            .info-label {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              background: white;
            }
            th {
              background: #f3f4f6;
              color: #374151;
              font-weight: 600;
              font-size: 11px;
              text-align: left;
              padding: 12px 8px;
              text-transform: uppercase;
              border-bottom: 2px solid #e5e7eb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Track Biz</div>
            <div class="subtitle">${title}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">Generated on ${dateStr}</div>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #6b7280;">Account Holder</div>
            <div style="font-size: 16px; font-weight: 600; color: #111827;">${profile.name || 'Business Owner'}</div>
          </div>

          <div class="info-section">
            <div class="info-item">
              <div class="info-label">Total Transactions</div>
              <div class="info-value">${transactions.length}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total In</div>
              <div class="info-value" style="color: #10b981;">KSh ${totalReceived.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Out</div>
              <div class="info-value" style="color: #ef4444;">KSh ${totalSent.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Business Revenue</div>
              <div class="info-value" style="color: #4f46e5;">KSh ${businessReceived.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Net</div>
              <div class="info-value" style="color: ${totalReceived - totalSent >= 0 ? '#10b981' : '#ef4444'};">KSh ${(totalReceived - totalSent).toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Time</th>
                <th>Sender/Customer</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>

          <div class="footer">
            <div>Track Biz - Smart Business Transaction Tracking</div>
            <div style="margin-top: 5px;">This report contains ${transactions.length} transactions</div>
          </div>
        </body>
      </html>
    `;
  }
}

export default new PdfExportService();