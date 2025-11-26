// utils/PrintPDF.js

import RNPrint from "react-native-print";

class PrintPDF {

  // DAILY
  static async exportDaily(report, inventoryStats) {
    const date = new Date().toISOString().split("T")[0];

    const html = this.buildDailyHTML(report, inventoryStats, date);

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
        DAILY HTML TEMPLATE  
  ------------------------------ */
  static buildDailyHTML(report, inventoryStats, date) {
    return this.wrapHTML(`
      <h1>Daily Profit Report</h1>
      <p><b>Date:</b> ${date}</p>

      ${this.summarySection(report)}

      <h2>Itemized Breakdown</h2>
      ${this.itemsTable(report.items)}

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
        SHARED HTML WRAPPER  
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
        </style>
      </head>
      <body>
          ${content}
      </body>
      </html>
    `;
  }

  /* ----------------------------
        DAILY SUMMARY SECTION
  ----------------------------- */
  static summarySection(report) {
    return `
      <h2>Summary</h2>
      <p><b>Total Sales:</b> Ksh ${report.totalSales.toLocaleString()}</p>
      <p><b>Total Cost:</b> Ksh ${report.totalCost.toLocaleString()}</p>
      <p><b>Total Profit:</b> Ksh ${report.totalProfit.toLocaleString()}</p>
      <p><b>Margin:</b> ${report.margin}%</p>
      <p><b>Transactions:</b> ${report.transactionCount}</p>
    `;
  }

  /* ----------------------------
        ITEM TABLE  
  ----------------------------- */
  static itemsTable(items = []) {
    if (!items.length) return `<p>No items sold today.</p>`;

    const rows = items
      .map(
        (i) => `
      <tr>
        <td>${i.name}</td>
        <td>${i.sold}</td>
        <td>Ksh ${i.retailPrice}</td>
        <td>Ksh ${i.wholesalePrice}</td>
        <td>Ksh ${i.profit}</td>
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
        INVENTORY SECTION
  ----------------------------- */
  static inventorySection(stats) {
    if (!stats) return "";

    return `
      <h2>Inventory Insights</h2>
      <p><b>Stock Value:</b> Ksh ${stats.totalStockValue}</p>
      <p><b>Cost Value:</b> Ksh ${stats.totalCostValue}</p>
      <p><b>Potential Profit:</b> Ksh ${stats.totalPotentialProfit}</p>
      <p><b>Active Items:</b> ${stats.activeItems}</p>
    `;
  }
}

export default PrintPDF;
