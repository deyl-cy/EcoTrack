import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LEAF = [34, 197, 94];
const GREEN = [22, 163, 74];
const DARK = [6, 40, 27];
const LIGHT = [240, 253, 244];
const TYPE_COLOR = {
  Recyclable: [37, 99, 235],
  Biodegradable: [22, 163, 74],
  'Non-Biodegradable': [71, 85, 105],
};

const fmtKg = (n) => Number(n ?? 0).toFixed(2);

export const rangeLabel = ({ date_from, date_to }) => {
  if (date_from && date_to) return `${date_from} to ${date_to}`;
  if (date_from) return `From ${date_from}`;
  if (date_to) return `Up to ${date_to}`;
  return 'All dates';
};

/** Draws the EcoTrack leaf tile (same shape as components/Logo.jsx). */
function drawLogo(doc, x, y, size) {
  const s = size / 40;
  doc.setFillColor(...LEAF).roundedRect(x, y, size, size, 11 * s, 11 * s, 'F');
  doc.setFillColor(...DARK);
  doc.lines(
    [[0, -10 * s, 6 * s, -15 * s, 18 * s, -15 * s], [0, 11 * s, -5 * s, 17 * s, -15 * s, 17 * s]],
    x + 11 * s, y + 28 * s, [1, 1], 'F', true
  );
  doc.setDrawColor(...LEAF).setLineWidth(1.4 * s);
  doc.lines([[4 * s, -6 * s, 8 * s, -9 * s, 13 * s, -11 * s]], x + 12 * s, y + 29 * s, [1, 1], 'S');
}

/* ------------------------------- PDF ------------------------------- */
export function downloadReportPdf(report, range) {
  const { summary, data } = report;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(...DARK).rect(0, 0, W, 74, 'F');
  drawLogo(doc, 36, 17, 40);
  doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(20);
  doc.text('EcoTrack', 88, 40);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(187, 247, 208);
  doc.text('Waste collection, tracked', 88, 54);
  doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(13);
  doc.text('Collection Report', W - 36, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(187, 247, 208);
  doc.text(rangeLabel(range), W - 36, 54, { align: 'right' });

  // Summary cards
  const cards = [
    ['Total pickups', String(summary.total_pickups)],
    ['Total weight', `${fmtKg(summary.total_weight_kg)} kg`],
    ...Object.entries(summary.by_waste_type).map(([t, kg]) => [t, `${fmtKg(kg)} kg`]),
  ];
  const gap = 10;
  const cw = (W - 72 - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([label, value], i) => {
    const x = 36 + i * (cw + gap);
    doc.setFillColor(...LIGHT).setDrawColor(187, 247, 208).setLineWidth(0.8);
    doc.roundedRect(x, 92, cw, 52, 6, 6, 'FD');
    doc.setTextColor(...DARK).setFont('helvetica', 'bold').setFontSize(15);
    doc.text(value, x + 12, 116);
    doc.setTextColor(100).setFont('helvetica', 'normal').setFontSize(8.5);
    doc.text(label, x + 12, 132);
  });

  // Table
  autoTable(doc, {
    startY: 162,
    margin: { left: 36, right: 36, bottom: 44 },
    head: [['Collected at', 'Location', 'Area', 'Waste type', 'Weight (kg)', 'Collector', 'Remarks']],
    body: data.map((r) => [
      r.collected_at, r.location, r.area, r.waste_type,
      fmtKg(r.actual_weight_kg), r.collector_name, r.remarks || '',
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 6, textColor: 40, overflow: 'linebreak' },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 252, 249] },
    columnStyles: { 4: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 3) {
        const c = TYPE_COLOR[d.cell.raw];
        if (c) { d.cell.styles.textColor = c; d.cell.styles.fontStyle = 'bold'; }
      }
    },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220).setLineWidth(0.5).line(36, H - 30, W - 36, H - 30);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()}`, 36, H - 16);
    doc.text(`Page ${i} of ${pages}`, W - 36, H - 16, { align: 'right' });
  }

  doc.save(`ecotrack-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ------------------------------ Excel ------------------------------ */
export async function downloadReportExcel(report, range) {
  const { default: ExcelJS } = await import('exceljs'); // loaded only when clicked
  const { summary, data } = report;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EcoTrack';
  const ws = wb.addWorksheet('Collection Report', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: 18 }, { width: 42 }, { width: 26 }, { width: 20 }, { width: 14 }, { width: 22 }, { width: 36 },
  ];
  const hex = (a) => 'FF' + a.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  const fill = (rgb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: hex(rgb) } });
  const border = { style: 'thin', color: { argb: 'FFE2EBE5' } };

  // Title band
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = 'EcoTrack - Collection Report';
  ws.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = fill(DARK);
  ws.getCell('A1').alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 36;

  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = `${rangeLabel(range)}   |   Generated ${new Date().toLocaleString()}`;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FFBBF7D0' } };
  ws.getCell('A2').fill = fill(DARK);
  ws.getCell('A2').alignment = { indent: 1 };

  // Summary
  ws.getCell('A4').value = 'SUMMARY';
  ws.getCell('A4').font = { bold: true, size: 11, color: { argb: hex(GREEN) } };
  const summaryRows = [
    ['Total pickups', summary.total_pickups, '0'],
    ['Total weight (kg)', Number(summary.total_weight_kg), '#,##0.00'],
    ...Object.entries(summary.by_waste_type).map(([t, kg]) => [`${t} (kg)`, Number(kg), '#,##0.00']),
  ];
  summaryRows.forEach(([label, value, fmt], i) => {
    const r = 5 + i;
    ws.mergeCells(`A${r}:B${r}`);
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`C${r}`).value = value;
    ws.getCell(`C${r}`).numFmt = fmt;
    ws.getCell(`C${r}`).alignment = { horizontal: 'right' };
    ws.getCell(`C${r}`).font = { bold: true };
    ['A', 'B', 'C'].forEach((c) => {
      ws.getCell(`${c}${r}`).fill = fill(LIGHT);
      ws.getCell(`${c}${r}`).border = { bottom: border };
    });
  });

  // Details table
  const headRow = 5 + summaryRows.length + 2;
  const headers = ['Collected at', 'Location', 'Area', 'Waste type', 'Weight (kg)', 'Collector', 'Remarks'];
  headers.forEach((h, i) => {
    const c = ws.getCell(headRow, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill(GREEN);
    c.alignment = { vertical: 'middle', horizontal: i === 4 ? 'right' : 'left', indent: 1 };
  });
  ws.getRow(headRow).height = 24;

  data.forEach((r, idx) => {
    const row = ws.getRow(headRow + 1 + idx);
    [r.collected_at, r.location, r.area, r.waste_type, Number(r.actual_weight_kg), r.collector_name, r.remarks || '']
      .forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.border = { bottom: border };
        c.alignment = { vertical: 'middle', horizontal: i === 4 ? 'right' : 'left', indent: i === 4 ? 0 : 1, wrapText: i === 6 };
        if (idx % 2) c.fill = fill([248, 252, 249]);
      });
    row.getCell(5).numFmt = '#,##0.00';
    const color = TYPE_COLOR[r.waste_type];
    if (color) row.getCell(4).font = { bold: true, color: { argb: hex(color) } };
    row.height = 20;
  });

  // Freeze the header and add filter arrows
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: headRow }];
  ws.autoFilter = { from: { row: headRow, column: 1 }, to: { row: headRow + data.length, column: 7 } };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  Object.assign(document.createElement('a'), {
    href: url,
    download: `ecotrack-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  }).click();
  URL.revokeObjectURL(url);
}