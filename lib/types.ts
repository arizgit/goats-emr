export type Goat = {
  ID: string;
  "Farm ID": string;
  Gender: "M" | "F" | "";
  Birthdate: string;
  Name: string;
  "QR Code": string;
  Image: string;
  "Parent Buck": string;
  "Parent Doe": string;
  "Date Disposed": string;
  Weight: string;
  "Medical History": string;
  Remarks: string;
  "Created At": string;
  "Updated At": string;
};

export type WeightHistoryEntry = {
  "Goat ID": string;
  "Recorded At": string;
  "Weight KG": string;
};

export const GOAT_HEADERS = [
  "id",
  "farm_id",
  "gender",
  "birthdate",
  "name",
  "qr_code",
  "parent_buck",
  "parent_doe",
  "date_disposed",
  "weight",
  "medical_history",
  "remarks",
  "created_at",
  "updated_at",
  "image"
] as const;

export const WEIGHT_HISTORY_HEADERS = [
  "goat_id",
  "recorded_at",
  "weight_kg"
] as const;
