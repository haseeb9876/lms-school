export interface ExamSubjectResult {
  subject: string;
  marksObtained: number;
  totalMarks: number;
}

export interface StudentReportData {
  studentName: string;
  rollNumber: string;
  fatherName: string;
  className: string;
  term: string;
  results: ExamSubjectResult[];
}

export function printStudentReportCard(data: StudentReportData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const totalObtained = data.results.reduce((acc, curr) => acc + curr.marksObtained, 0);
  const totalMax = data.results.reduce((acc, curr) => acc + curr.totalMarks, 0);
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0.0";

  let grade = "F";
  const percNum = parseFloat(percentage);
  if (percNum >= 80) grade = "A-1";
  else if (percNum >= 70) grade = "A";
  else if (percNum >= 60) grade = "B";
  else if (percNum >= 50) grade = "C";
  else if (percNum >= 40) grade = "D";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Report Card - ${data.rollNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .card-border {
            border: 4px double #000;
            padding: 20px;
            box-sizing: border-box;
            min-height: 95vh;
            display: flex;
            flex-col;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
          .header h3 { margin: 4px 0 0 0; font-size: 14px; color: #333; font-weight: normal; }
          .term-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 4px 12px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 8px;
            text-transform: uppercase;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .meta-table td {
            padding: 6px 4px;
            border-bottom: 1px dashed #bbb;
          }
          .meta-table td.label { font-weight: bold; width: 18%; }
          .marks-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .marks-table th, .marks-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .marks-table th { background: #f2f2f2; text-transform: uppercase; font-size: 11px; }
          .total-row { font-weight: bold; background: #ea8a8a; }
          .summary-box {
            display: flex;
            justify-content: space-around;
            border: 2px solid #000;
            padding: 12px;
            margin-bottom: 30px;
            background: #fafafa;
          }
          .summary-item { text-align: center; }
          .summary-item .title { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #555; }
          .summary-item .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .sig-line {
            border-top: 1px solid #000;
            width: 28%;
            text-align: center;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="card-border">
          <div>
            <div class="header">
              <h1>EXECUTIVE LMS ACADEMY</h1>
              <h3>OFFICIAL ACADEMIC EVALUATION REPORT</h3>
              <div class="term-badge">${data.term}</div>
            </div>

            <table class="meta-table">
              <tr>
                <td class="label">Roll Number:</td>
                <td><strong>${data.rollNumber}</strong></td>
                <td class="label">Class/Section:</td>
                <td><strong>${data.className}</strong></td>
              </tr>
              <tr>
                <td class="label">Student Name:</td>
                <td>${data.studentName}</td>
                <td class="label">Father Name:</td>
                <td>${data.fatherName}</td>
              </tr>
            </table>

            <table class="marks-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style="text-align: center;">Max Marks</th>
                  <th style="text-align: center;">Obtained Marks</th>
                  <th style="text-align: center;">Percentage</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.results.length === 0
                    ? `<tr><td colSpan="5" style="text-align:center;">No subject marks recorded for this term.</td></tr>`
                    : data.results
                        .map((r) => {
                          const subjPerc = r.totalMarks > 0 ? ((r.marksObtained / r.totalMarks) * 100).toFixed(0) : "0";
                          const isPass = parseFloat(subjPerc) >= 40;
                          return `
                          <tr>
                            <td><strong>${r.subject}</strong></td>
                            <td style="text-align: center;">${r.totalMarks}</td>
                            <td style="text-align: center;">${r.marksObtained}</td>
                            <td style="text-align: center;">${subjPerc}%</td>
                            <td style="text-align: center; font-weight: bold; color: ${isPass ? "#000" : "#d32f2f"};">
                              ${isPass ? "PASS" : "FAIL"}
                            </td>
                          </tr>
                        `;
                        })
                        .join("")
                }
                <tr class="total-row">
                  <td>GRAND TOTAL</td>
                  <td style="text-align: center;">${totalMax}</td>
                  <td style="text-align: center;">${totalObtained}</td>
                  <td style="text-align: center;">${percentage}%</td>
                  <td style="text-align: center;">${percNum >= 40 ? "PASSED" : "FAILED"}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-item">
                <div class="title">Total Marks</div>
                <div class="value">${totalObtained} / ${totalMax}</div>
              </div>
              <div class="summary-item">
                <div class="title">Percentage</div>
                <div class="value">${percentage}%</div>
              </div>
              <div class="summary-item">
                <div class="title">Grade Awarded</div>
                <div class="value">${grade}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="sig-line">Class Teacher Signature</div>
            <div class="sig-line">Parent / Guardian Signature</div>
            <div class="sig-line">Principal Seal & Signature</div>
          </div>
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
