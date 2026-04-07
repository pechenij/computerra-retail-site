const SHEET_NAME = 'Товари';

function doGet(e) {
  const callback = sanitizeCallback_(e && e.parameter && e.parameter.callback);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return respond_(callback, {
      ok: false,
      error: 'Sheet "Товари" not found.',
      syncedAt: new Date().toISOString(),
      rows: []
    });
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) {
    return respond_(callback, {
      ok: true,
      syncedAt: new Date().toISOString(),
      rows: []
    });
  }

  const headers = values.shift().map(normalizeHeader_);
  const rows = values
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = String(row[index] || '').trim();
      });
      return item;
    });

  return respond_(callback, {
    ok: true,
    syncedAt: new Date().toISOString(),
    rows: rows
  });
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function sanitizeCallback_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^[a-zA-Z_$][0-9a-zA-Z_$\.]*$/.test(raw) ? raw : '';
}

function respond_(callback, payload) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(payload) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
