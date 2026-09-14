export function escapeCsv(value) {
  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

export function isoDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tableRows(table, columnCount) {
  const headers = Array.from(table.querySelectorAll('thead th'))
    .slice(0, columnCount)
    .map((cell) => cell.textContent?.trim() || '');
  const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.children)
      .slice(0, columnCount)
      .map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() || ''),
  );
  return headers.length ? [headers, ...rows] : rows;
}

function downloadCsv(filename, rows) {
  if (rows.length <= 1) return false;
  const csv = `\uFEFF${rowsToCsv(rows)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  button.disabled = true;
  globalThis.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1200);
}

function attachExport(buttonId, tableId, prefix, columnCount) {
  const button = document.getElementById(buttonId);
  const table = document.getElementById(tableId);
  if (!button || !table) return;

  button.addEventListener('click', () => {
    const rows = tableRows(table, columnCount);
    const exported = downloadCsv(`${prefix}-${isoDateStamp()}.csv`, rows);
    flashButton(button, exported ? 'Exported' : 'No data');
  });
}

if (typeof document !== 'undefined') {
  const start = () => {
    attachExport('history-export', 'history-table', 'cpeb-booking-history', 5);
    attachExport('equipment-export', 'equipment-table', 'cpeb-equipment-inventory', 4);
    attachExport('reports-export', 'reports-table', 'cpeb-repair-reports', 4);
    attachExport('maintenance-export', 'maintenance-table', 'cpeb-maintenance', 4);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
