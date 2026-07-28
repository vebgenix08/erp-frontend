export interface ExportColumn<Row> {
  header: string;
  value: (row: Row) => string | number;
  width?: number;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function exportRowsToExcel<Row>(
  fileName: string,
  sheetName: string,
  columns: ExportColumn<Row>[],
  rows: Row[],
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Vebgenix ERP";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: column.width ?? 18,
  }));
  rows.forEach((row) => {
    worksheet.addRow(
      Object.fromEntries(
        columns.map((column) => [column.header, column.value(row)]),
      ),
    );
  });
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF176B55" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: columns.length },
  };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName}.xlsx`,
  );
}

export async function exportRowsToPdf<Row>(
  fileName: string,
  title: string,
  columns: ExportColumn<Row>[],
  rows: Row[],
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const document = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  document.setFontSize(15);
  document.text(title, 40, 38);
  document.setFontSize(9);
  document.setTextColor(90);
  document.text(`Generated ${new Date().toLocaleString("en-IN")}`, 40, 54);
  autoTable(document, {
    startY: 68,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(column.value(row)))),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [23, 107, 85] },
    margin: { left: 30, right: 30 },
  });
  document.save(`${fileName}.pdf`);
}
