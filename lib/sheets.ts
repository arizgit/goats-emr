import { google } from "googleapis";
import { GOAT_HEADERS, Goat } from "@/lib/types";

const SHEET_NAME = "Goats";

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
  return {
    ID: row[0] || "",
    "Farm ID": row[1] || "",
    Gender: (row[2] as Goat["Gender"]) || "",
    Birthdate: row[3] || "",
    Description: row[4] || "",
    Barcode: row[5] || "",
    "QR Code": row[6] || "",
    Image: row[7] || "",
    "Parent Buck": row[8] || "",
    "Parent Doe": row[9] || "",
    State: (row[10] as Goat["State"]) || "",
    Deceased: (row[11] as Goat["Deceased"]) || "",
    Weight: row[12] || "",
    Remarks: row[13] || ""
  };
}

function goatToRow(goat: Goat): string[] {
  return [
    goat.ID,
    goat["Farm ID"] || "",
    goat.Gender,
    goat.Birthdate,
    goat.Description,
    goat.Barcode,
    goat["QR Code"] || "",
    goat.Image,
    goat["Parent Buck"],
    goat["Parent Doe"],
    goat.State,
    goat.Deceased,
    goat.Weight,
    goat.Remarks
  ];
}

export async function getAllGoats() {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A:N`
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
    range: `${SHEET_NAME}!A:N`,
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
    range: `${SHEET_NAME}!A${sheetRowNumber}:N${sheetRowNumber}`,
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
    range: `${SHEET_NAME}!A1:N1`
  });

  const headers = res.data.values?.[0] || [];
  return GOAT_HEADERS.every((h, i) => (headers[i] || "").trim().toLowerCase() === h.toLowerCase());
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
