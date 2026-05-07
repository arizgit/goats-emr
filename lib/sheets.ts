import { google } from "googleapis";
import { GOAT_HEADERS, Goat, WEIGHT_HISTORY_HEADERS, WeightHistoryEntry } from "@/lib/types";

const SHEET_NAME = "Goats";
const SHEET_RANGE = "A:P";
const HEADER_RANGE = "A1:P1";
const WEIGHT_HISTORY_SHEET_NAME = "Goat_Weight_History";
const WEIGHT_HISTORY_RANGE = "A:C";
const WEIGHT_HISTORY_HEADER_RANGE = "A1:C1";

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Missing Google service account environment variables.");
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID.");
  }
  return spreadsheetId;
}

function rowToGoat(row: string[]): Goat {
  const isLegacyLayout = row.length === 13;
  const isCurrentLayout = row.length === 14;
  const isTimestampedLayout = row.length >= 16;

  return {
    ID: row[0] || "",
    "Farm ID": row[1] || "",
    Gender: (row[2] as Goat["Gender"]) || "",
    Birthdate: row[3] || "",
    Name: row[4] || "",
    Barcode: row[5] || "",
    "QR Code": row[6] || "",
    // Timestamped layout: image is last. Legacy/current layout support is retained.
    Image: isLegacyLayout ? row[7] || "" : isTimestampedLayout ? row[15] || "" : row[13] || "",
    "Parent Buck": isLegacyLayout ? row[8] || "" : row[7] || "",
    "Parent Doe": isLegacyLayout ? row[9] || "" : row[8] || "",
    "Date Disposed": isLegacyLayout ? row[10] || "" : row[9] || "",
    Weight: isLegacyLayout ? row[11] || "" : row[10] || "",
    "Medical History": isLegacyLayout ? "[]" : row[11] || "[]",
    Remarks: isLegacyLayout ? row[12] || "" : row[12] || "",
    "Created At": isTimestampedLayout ? row[13] || "" : "",
    "Updated At": isTimestampedLayout ? row[14] || "" : ""
  };
}

function goatToRow(goat: Goat): string[] {
  return [
    goat.ID,
    goat["Farm ID"] || "",
    goat.Gender,
    goat.Birthdate,
    goat.Name,
    goat.Barcode,
    goat["QR Code"] || "",
    goat["Parent Buck"],
    goat["Parent Doe"],
    goat["Date Disposed"],
    goat.Weight,
    goat["Medical History"] || "[]",
    goat.Remarks,
    goat["Created At"] || "",
    goat["Updated At"] || "",
    goat.Image
  ];
}

export async function getAllGoats() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!${SHEET_RANGE}`
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  const dataRows = rows.slice(1);
  return dataRows.filter((row) => row.some(Boolean)).map(rowToGoat);
}

export async function appendGoat(goat: Goat) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!${SHEET_RANGE}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [goatToRow(goat)]
    }
  });
}

export async function updateGoatById(id: string, goat: Goat) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const goats = await getAllGoats();
  const rowIndex = goats.findIndex((g) => g.ID === id);

  if (rowIndex === -1) return false;

  const sheetRowNumber = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A${sheetRowNumber}:P${sheetRowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [goatToRow(goat)]
    }
  });

  return true;
}

export async function getGoatById(id: string) {
  const goats = await getAllGoats();
  return goats.find((goat) => goat.ID === id) || null;
}

export async function getGoatByBarcode(barcode: string) {
  const goats = await getAllGoats();
  return goats.find((goat) => goat.Barcode === barcode) || null;
}

export async function validateHeaders() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!${HEADER_RANGE}`
  });

  const headers = res.data.values?.[0] || [];
  const normalizedHeaders = headers.map((header) => (header || "").trim().toLowerCase());
  const expectedHeaders = GOAT_HEADERS.map((header) => header.toLowerCase());
  const currentHeaders = expectedHeaders.filter((header) => !["created_at", "updated_at"].includes(header));
  const legacyHeaders = currentHeaders.filter((header) => header !== "medical_history");

  const isCurrentHeaderMatch = expectedHeaders.every((header, index) => normalizedHeaders[index] === header);
  if (isCurrentHeaderMatch) return true;

  const isPreTimestampHeaderMatch = currentHeaders.every((header, index) => normalizedHeaders[index] === header);
  if (isPreTimestampHeaderMatch) return true;

  // Backward-compatible with older sheets that still have no medical_history column.
  return legacyHeaders.every((header, index) => normalizedHeaders[index] === header);
}

export async function generateNextGoatId() {
  const goats = await getAllGoats();
  const maxNumericId = goats.reduce((max, goat) => {
    const match = goat.ID.trim().match(/^G(\d+)$/i);
    if (!match) return max;

    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const next = maxNumericId + 1;
  return `G${String(next).padStart(5, "0")}`;
}

function rowToWeightHistoryEntry(row: string[]): WeightHistoryEntry {
  return {
    "Goat ID": row[0] || "",
    "Recorded At": row[1] || "",
    "Weight KG": row[2] || ""
  };
}

function weightHistoryToRow(entry: WeightHistoryEntry): string[] {
  return [entry["Goat ID"], entry["Recorded At"], entry["Weight KG"]];
}

async function ensureWeightHistorySheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const weightSheetExists = (spreadsheet.data.sheets || []).some(
    (sheet) => sheet.properties?.title === WEIGHT_HISTORY_SHEET_NAME
  );

  if (!weightSheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: WEIGHT_HISTORY_SHEET_NAME } } }]
      }
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${WEIGHT_HISTORY_SHEET_NAME}!${WEIGHT_HISTORY_HEADER_RANGE}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [WEIGHT_HISTORY_HEADERS.map((header) => header)]
    }
  });
}

export async function appendWeightHistoryEntry(entry: WeightHistoryEntry) {
  await ensureWeightHistorySheet();

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${WEIGHT_HISTORY_SHEET_NAME}!${WEIGHT_HISTORY_RANGE}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [weightHistoryToRow(entry)]
    }
  });
}

export async function getWeightHistoryByGoatId(goatId: string) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${WEIGHT_HISTORY_SHEET_NAME}!${WEIGHT_HISTORY_RANGE}`
    });
    const rows = res.data.values || [];
    if (rows.length <= 1) return [];

    return rows
      .slice(1)
      .map(rowToWeightHistoryEntry)
      .filter((entry) => entry["Goat ID"] === goatId)
      .sort((a, b) => b["Recorded At"].localeCompare(a["Recorded At"]));
  } catch {
    // Weight history sheet may not exist yet.
    return [];
  }
}
