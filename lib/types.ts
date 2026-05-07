export type Goat = {
  ID: string;
  "Farm ID": string;
  Gender: "M" | "F" | "";
  Birthdate: string;
  Name: string;
  Barcode: string;
  "QR Code": string;
  Image: string;
  "Parent Buck": string;
  "Parent Doe": string;
  "Date Disposed": string;
  Weight: string;
  Remarks: string;
};

export const GOAT_HEADERS = [
  "id",
  "farm_id",
  "gender",
  "birthdate",
  "name",
  "barcode",
  "qr_code",
  "image",
  "parent_buck",
  "parent_doe",
  "date_disposed",
  "weight",
  "remarks"
] as const;
