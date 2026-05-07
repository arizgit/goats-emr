export type Goat = {
  ID: string;
  "Farm ID": string;
  Gender: "Male" | "Female" | "";
  Birthdate: string;
  Description: string;
  Barcode: string;
  "QR Code": string;
  Image: string;
  "Parent Buck": string;
  "Parent Doe": string;
  State: "Healthy" | "Sick" | "Pregnant" | "For Sale" | "Quarantine" | "";
  Deceased: "Y" | "N" | "";
  Weight: string;
  Remarks: string;
};

export const GOAT_HEADERS = [
  "id",
  "farm_id",
  "gender",
  "birthdate",
  "description",
  "barcode",
  "qr_code",
  "image",
  "parent_buck",
  "parent_doe",
  "state",
  "deceased",
  "weight",
  "remarks"
] as const;
