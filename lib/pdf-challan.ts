export interface InvoicePrintData {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
  studentName: string;
  rollNumber: string;
  fatherName: string;
  className: string;
}

export function printBankChallan(invoice: InvoicePrintData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const copies = ["BANK COPY", "SCHOOL COPY", "STUDENT COPY"];
  const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fee Challan - ${invoice.rollNumber}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          .challan-container {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            width: 100%;
          }
          .copy-box {
            flex: 1;
            border: 2px solid #000;
            padding: 12px;
            box-sizing: border-box;
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px border #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .header h2 { margin: 0; font-size: 14px; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 10px; font-weight: bold; }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 3px 8px;
            font-size: 9px;
            font-weight: bold;
            margin-top: 4px;
            text-transform: uppercase;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
          }
          .info-table td {
            padding: 4px 2px;
            border-bottom: 1px dashed #ccc;
          }
          .info-table td.label { font-weight: bold; width: 40%; }
          .fee-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 10px;
          }
          .fee-table th, .fee-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          .fee-table th { background: #f0f0f0; }
          .total-row { font-weight: bold; background: #ea8a8a; }
          .footer {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .sig-line {
            border-top: 1px solid #000;
            width: 45%;
            text-align: center;
            padding-top: 2px;
          }
        </style>
      </head>
      <body>
        <div class="challan-container">
          ${copies
            .map(
              (copyTitle) => `
            <div class="copy-box">
              <div class="header">
                <h2>EXECUTIVE LMS ACADEMY</h2>
                <p>M.C.B / Allied Bank Account: 1234-56789012-01</p>
                <div class="badge">${copyTitle}</div>
              </div>

              <table class="info-table">
                <tr><td class="label">Voucher No:</td><td>VCH-${invoice.id.slice(0, 8).toUpperCase()}</td></tr>
                <tr><td class="label">Due Date:</td><td><strong>${formattedDueDate}</strong></td></tr>
                <tr><td class="label">Roll Number:</td><td><strong>${invoice.rollNumber}</strong></td></tr>
                <tr><td class="label">Student Name:</td><td>${invoice.studentName}</td></tr>
                <tr><td class="label">Father Name:</td><td>${invoice.fatherName}</td></tr>
                <tr><td class="label">Class:</td><td>${invoice.className}</td></tr>
              </table>

              <table class="fee-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${invoice.title}</td>
                    <td style="text-align: right;">${invoice.amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Late Payment Fine (If after Due Date)</td>
                    <td style="text-align: right;">500</td>
                  </tr>
                  <tr class="total-row">
                    <td>Total Payable (Before Due Date)</td>
                    <td style="text-align: right;">PKR ${invoice.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style="margin-top: 15px; font-size: 9px; text-align: center;">
                <em>Deposited at any online bank branch nationwide or via 1Link/JazzCash.</em>
              </div>

              <div class="footer">
                <div class="sig-line">Officer Stamp</div>
                <div class="sig-line">Depositor Signature</div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
