// utils/PrintPDF.js

import RNPrint from "react-native-print";

class PrintPDF {

  // DAILY - Updated to include credit transactions
  static async exportDaily(report, inventoryStats, creditTransactions = []) {
    const date = new Date().toISOString().split("T")[0];

    const html = this.buildDailyHTML(report, inventoryStats, date, creditTransactions);

    const pdfPath = await RNPrint.print({
      html,
    });

    return pdfPath;
  }

  // WEEKLY
  static async exportWeekly(weeklyReports) {
    const date = new Date().toISOString().split("T")[0];

    const html = this.buildWeeklyHTML(weeklyReports, date);

    const pdfPath = await RNPrint.print({
      html,
    });

    return pdfPath;
  }

  // MONTHLY
  static async exportMonthly(monthlyReports) {
    const date = new Date().toISOString().split("T")[0];

    const html = this.buildMonthlyHTML(monthlyReports, date);

    const pdfPath = await RNPrint.print({
      html,
    });

    return pdfPath;
  }

  /* ------------------------------
        DAILY HTML TEMPLATE - Updated with credit transactions
  ------------------------------ */
  static buildDailyHTML(report, inventoryStats, date, creditTransactions = []) {
    // Calculate credit totals
    const totalCreditAmount = creditTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCreditProfit = creditTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

    // Calculate combined totals
    const combinedSales = (report?.totalSales || 0) + totalCreditAmount;
    const combinedProfit = (report?.totalProfit || 0) + totalCreditProfit;

    return this.wrapHTML(`
      <h1>Daily Profit Report</h1>
      <p><b>Date:</b> ${date}</p>

      ${this.summarySection(report, totalCreditAmount, totalCreditProfit, combinedSales, combinedProfit)}

      <h2>Itemized Breakdown</h2>
      ${this.itemsTable(report?.items || [])}

      ${this.creditTransactionsSection(creditTransactions)}

      ${this.inventorySection(inventoryStats)}
    `);
  }

  /* ------------------------------
        WEEKLY TEMPLATE  
  ------------------------------ */
  static buildWeeklyHTML(weeklyReports, date) {
    const rows = Object.entries(weeklyReports)
      .map(
        ([day, r]) => `
          <tr>
            <td>${day}</td>
            <td>Ksh ${r.totalSales.toLocaleString()}</td>
            <td>Ksh ${r.totalProfit.toLocaleString()}</td>
            <td>${r.margin}%</td>
            <td>${r.transactionCount}</td>
          </tr>
        `
      )
      .join("");

    return this.wrapHTML(`
      <h1>Weekly Profit Report</h1>
      <p><b>Generated:</b> ${date}</p>

      <table>
        <tr>
          <th>Date</th>
          <th>Sales</th>
          <th>Profit</th>
          <th>Margin</th>
          <th>Transactions</th>
        </tr>
        ${rows}
      </table>
    `);
  }

  /* ------------------------------
        MONTHLY TEMPLATE  
  ------------------------------ */
  static buildMonthlyHTML(monthlyReports, date) {
    const rows = Object.entries(monthlyReports)
      .map(
        ([day, r]) => `
          <tr>
            <td>${day}</td>
            <td>Ksh ${r.totalSales.toLocaleString()}</td>
            <td>Ksh ${r.totalProfit.toLocaleString()}</td>
            <td>${r.margin}%</td>
            <td>${r.transactionCount}</td>
          </tr>
        `
      )
      .join("");

    return this.wrapHTML(`
      <h1>Monthly Profit Report</h1>
      <p><b>Generated:</b> ${date}</p>

      <table>
        <tr>
          <th>Date</th>
          <th>Sales</th>
          <th>Profit</th>
          <th>Margin</th>
          <th>Transactions</th>
        </tr>
        ${rows}
      </table>
    `);
  }

  /* ----------------------------
        SHARED HTML WRAPPER - Updated with credit styles
  ----------------------------- */
  static wrapHTML(content) {
    return `
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 25px; color: #333; }
          h1 { color: #216fed; border-bottom: 2px solid #216fed; padding-bottom: 4px; }
          h2 { margin-top: 20px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #216fed; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f7f7f7; }
          .summary-box { background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .credit-box { background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-cleared { background: #d1fae5; color: #059669; }
          .badge-partial { background: #fef3c7; color: #d97706; }
          .profit-text { color: #10b981; font-weight: bold; }
          .total-row { background: #f0fdf4 !important; font-weight: bold; }
          .combined-totals { background: #216fed; color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .combined-totals p { margin: 5px 0; }
        </style>
      </head>
      <body>
          ${content}
      </body>
      </html>
    `;
  }

  /* ----------------------------
        DAILY SUMMARY SECTION - Updated with credit totals
  ----------------------------- */
  static summarySection(report, creditAmount = 0, creditProfit = 0, combinedSales = 0, combinedProfit = 0) {
    const hasCreditData = creditAmount > 0;
    const hasRegularSales = report?.totalSales > 0;

    let html = `<h2>Summary</h2>`;

    // Regular Sales Summary
    if (hasRegularSales) {
      html += `
        <div class="summary-box">
          <h3 style="margin-top: 0; color: #059669;">💰 Direct Sales</h3>
          <p><b>Total Sales:</b> Ksh ${(report?.totalSales || 0).toLocaleString()}</p>
          <p><b>Total Cost:</b> Ksh ${(report?.totalCost || 0).toLocaleString()}</p>
          <p><b>Total Profit:</b> <span class="profit-text">Ksh ${(report?.totalProfit || 0).toLocaleString()}</span></p>
          <p><b>Margin:</b> ${report?.margin || 0}%</p>
          <p><b>Transactions:</b> ${report?.transactionCount || 0}</p>
        </div>
      `;
    }

    // Credit Collections Summary
    if (hasCreditData) {
      html += `
        <div class="credit-box">
          <h3 style="margin-top: 0; color: #2563eb;">💳 Credit Collections</h3>
          <p><b>Total Collected:</b> Ksh ${creditAmount.toLocaleString()}</p>
          <p><b>Profit from Credits:</b> <span class="profit-text">Ksh ${creditProfit.toLocaleString()}</span></p>
        </div>
      `;
    }

    // Combined Totals (if both exist)
    if (hasRegularSales || hasCreditData) {
      html += `
        <div class="combined-totals">
          <h3 style="margin-top: 0;">📊 Combined Totals</h3>
          <p><b>Total Revenue:</b> Ksh ${combinedSales.toLocaleString()}</p>
          <p><b>Total Profit:</b> Ksh ${combinedProfit.toLocaleString()}</p>
        </div>
      `;
    }

    return html;
  }

  /* ----------------------------
        ITEM TABLE  
  ----------------------------- */
  static itemsTable(items = []) {
    if (!items.length) return `<p>No direct sales recorded today.</p>`;

    const rows = items
      .map(
        (i) => `
      <tr>
        <td>${i.name}</td>
        <td>${i.sold}</td>
        <td>Ksh ${(i.retailPrice || 0).toLocaleString()}</td>
        <td>Ksh ${(i.wholesalePrice || 0).toLocaleString()}</td>
        <td class="profit-text">Ksh ${(i.profit || 0).toLocaleString()}</td>
      </tr>`
      )
      .join("");

    return `
      <table>
        <tr>
          <th>Item</th>
          <th>Sold</th>
          <th>Retail</th>
          <th>Cost</th>
          <th>Profit</th>
        </tr>
        ${rows}
      </table>
    `;
  }

  /* ----------------------------
        CREDIT TRANSACTIONS SECTION - NEW
  ----------------------------- */
  static creditTransactionsSection(creditTransactions = []) {
    if (!creditTransactions.length) return '';

    const totalAmount = creditTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalProfit = creditTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

    const rows = creditTransactions
      .map((t) => {
        const badgeClass = t.creditType === 'cleared' ? 'badge-cleared' : 'badge-partial';
        const badgeText = t.creditType === 'cleared' ? 'Cleared' : 'Partial';
        const time = (() => {
          try {
            const date = new Date(t.date || t.createdAt);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            return '-';
          }
        })();

        return `
          <tr>
            <td>
              ${t.customerName || 'Unknown'}
              <br><small style="color: #666;">${t.itemName || 'Credit Payment'}</small>
            </td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${time}</td>
            <td>Ksh ${(t.amount || 0).toLocaleString()}</td>
            <td class="profit-text">Ksh ${(t.profit || 0).toLocaleString()}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <h2>💳 Credit Collections</h2>
      <table>
        <tr>
          <th>Customer / Item</th>
          <th>Type</th>
          <th>Time</th>
          <th>Amount</th>
          <th>Profit</th>
        </tr>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><b>Total Credit Collections</b></td>
          <td><b>Ksh ${totalAmount.toLocaleString()}</b></td>
          <td class="profit-text"><b>Ksh ${totalProfit.toLocaleString()}</b></td>
        </tr>
      </table>
    `;
  }

  /* ----------------------------
        INVENTORY SECTION
  ----------------------------- */
  static inventorySection(stats) {
    if (!stats) return "";

    return `
      <h2>📦 Inventory Insights</h2>
      <table>
        <tr>
          <td><b>Stock Value (Retail)</b></td>
          <td>Ksh ${(stats.totalStockValue || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Cost Value</b></td>
          <td>Ksh ${(stats.totalCostValue || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Potential Profit</b></td>
          <td class="profit-text">Ksh ${(stats.totalPotentialProfit || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Active Items</b></td>
          <td>${stats.activeItems || 0}</td>
        </tr>
      </table>
    `;
  }
}

export default PrintPDF;
