// src/utils/csv.js
// Safe CSV generation using csv-stringify.
// Protects against formula injection (CSV injection attacks).

import { stringify } from "csv-stringify";

/**
 * Sanitize a cell value to prevent formula injection.
 * Characters that Excel/Sheets interpret as formula starts: = + - @ TAB CR
 */
function sanitizeCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Prefix dangerous characters with a single quote to neutralize them
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Generate a CSV string from a list of records.
 * @param {object[]} records
 * @param {string[]} columns - Field names (also used as headers)
 * @param {object} [headerMap] - Optional human-readable header labels { fieldName: 'Label' }
 * @returns {Promise<string>}
 */
export async function generateCsv(records, columns, headerMap = {}) {
  const headers = columns.map((c) => headerMap[c] || c);

  const rows = records.map((record) =>
    columns.map((col) => sanitizeCell(record[col])),
  );

  return new Promise((resolve, reject) => {
    stringify([headers, ...rows], { quoted: true }, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}
