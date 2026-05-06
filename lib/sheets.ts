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
    Gender: (row[1] as Goat["Gender"]) || "",
    Birthdate: row[2] || "",
    Description: row[3] || "",
    Barcode: row[4] || "",
    Image: row[5] || "",
    "Parent Buck": row[6] || "",
    "Parent Doe": row[7] || "",
    State: (row[8] as Goat["State"]) || "",
    Deceased: (row[9] as Goat["Deceased"]) || "",
    Weight: row[10] || "",
    Remarks: row[11] || ""
  };
}

function goatToRow(goat: Goat): string[] {
  return [
    goat.ID,
    goat.Gender,
    goat.Birthdate,
    goat.Description,
    goat.Barcode,
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
    range: `${SHEET_NAME}!A:L`
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
    range: `${SHEET_NAME}!A:L`,
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
    range: `${SHEET_NAME}!A${sheetRowNumber}:L${sheetRowNumber}`,
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
    range: `${SHEET_NAME}!A1:L1`
  });

  const headers = res.data.values?.[0] || [];
  return GOAT_HEADERS.every((h, i) => headers[i] === h);
}
